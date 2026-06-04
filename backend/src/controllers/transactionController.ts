import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PurchaseInvoice, IPurchaseItem } from '../models/PurchaseInvoice.js';
import { SalesInvoice, ISalesItem } from '../models/SalesInvoice.js';
import { Batch } from '../models/Batch.js';
import { Medicine } from '../models/Medicine.js';
import { Supplier } from '../models/Supplier.js';
import { Customer } from '../models/Customer.js';

// PURCHASE CONTROLLER
export const createPurchaseInvoice = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { supplierId, invoiceNumber, invoiceDate, paymentType, items } = req.body;

    if (!supplierId || !invoiceNumber || !paymentType || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required purchase details' });
    }

    const supplier = await Supplier.findById(supplierId).session(session);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Check if invoice number already exists for this supplier
    const existingInv = await PurchaseInvoice.findOne({ supplierId, invoiceNumber }).session(session);
    if (existingInv) {
      return res.status(400).json({ message: `Invoice #${invoiceNumber} already exists for this supplier` });
    }

    let calculatedTaxTotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedNetAmount = 0;

    const processedItems: IPurchaseItem[] = [];

    for (const item of items) {
      const {
        medicineId,
        batchNumber,
        expiryDate,
        manufacturingDate,
        quantity,
        purchaseRate,
        saleRate,
        mrp,
        discount // percentage, e.g. 5
      } = item;

      if (!medicineId || !batchNumber || !quantity || !purchaseRate || !saleRate || !mrp) {
        throw new Error('Invalid purchase item fields');
      }

      const medicine = await Medicine.findById(medicineId).session(session);
      if (!medicine) {
        throw new Error(`Medicine not found: ${medicineId}`);
      }

      // Calculation
      const baseSubtotal = purchaseRate * quantity;
      const discountVal = baseSubtotal * ((discount || 0) / 100);
      const taxRate = medicine.taxRate;
      const taxVal = (baseSubtotal - discountVal) * (taxRate / 100);
      const subtotal = (baseSubtotal - discountVal) + taxVal;

      calculatedTaxTotal += taxVal;
      calculatedDiscountTotal += discountVal;
      calculatedNetAmount += subtotal;

      processedItems.push({
        medicineId,
        batchNumber,
        expiryDate: new Date(expiryDate),
        manufacturingDate: new Date(manufacturingDate),
        quantity,
        purchaseRate,
        saleRate,
        mrp,
        taxRate,
        taxAmount: taxVal,
        discount,
        subtotal
      });

      // Update Stock (Batch)
      // Check if batch already exists for this medicine
      let batch = await Batch.findOne({ medicineId, batchNumber }).session(session);

      if (batch) {
        // Increment quantity, update rates & dates
        batch.quantity += quantity;
        batch.initialQuantity += quantity;
        batch.purchaseRate = purchaseRate;
        batch.saleRate = saleRate;
        batch.mrp = mrp;
        batch.expiryDate = new Date(expiryDate);
        batch.manufacturingDate = new Date(manufacturingDate);
        await batch.save({ session });
      } else {
        // Create new batch
        await Batch.create(
          [
            {
              medicineId,
              batchNumber,
              expiryDate: new Date(expiryDate),
              manufacturingDate: new Date(manufacturingDate),
              purchaseRate,
              saleRate,
              mrp,
              quantity,
              initialQuantity: quantity,
            },
          ],
          { session }
        );
      }
    }

    const purchaseInvoice = await PurchaseInvoice.create(
      [
        {
          supplierId,
          invoiceNumber,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          paymentType,
          items: processedItems,
          taxTotal: Math.round(calculatedTaxTotal * 100) / 100,
          discountTotal: Math.round(calculatedDiscountTotal * 100) / 100,
          netAmount: Math.round(calculatedNetAmount * 100) / 100,
          paymentStatus: paymentType === 'cash' ? 'paid' : 'pending',
        },
      ],
      { session }
    );

    // Update supplier outstanding balance if credit
    if (paymentType === 'credit') {
      supplier.outstandingBalance += Math.round(calculatedNetAmount * 100) / 100;
      await supplier.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Purchase invoice logged successfully',
      invoice: purchaseInvoice[0],
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Error processing purchase invoice', error: error.message });
  }
};

export const getPurchaseInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await PurchaseInvoice.find()
      .populate('supplierId', 'name gstin')
      .populate('items.medicineId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching purchase invoices', error: error.message });
  }
};

export const getPurchaseInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await PurchaseInvoice.findById(req.params.id)
      .populate('supplierId', 'name phone address gstin')
      .populate('items.medicineId', 'name composition category hsnCode');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching invoice', error: error.message });
  }
};


// SALES (POS BILLING) CONTROLLER
export const createSalesInvoice = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, customerName, customerPhone, paymentType, items, paidAmount } = req.body;

    if (!paymentType || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required sale details' });
    }

    // Auto-generate invoice number: sequential
    const invoiceCount = await SalesInvoice.countDocuments().session(session);
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    let calculatedTaxTotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedNetAmount = 0;

    const processedItems: ISalesItem[] = [];

    // Verify stock and process items
    for (const item of items) {
      const { medicineId, batchNumber, quantity, discount } = item;

      if (!medicineId || !batchNumber || !quantity) {
        throw new Error('Invalid sale item fields');
      }

      // Check batch
      const batch = await Batch.findOne({ medicineId, batchNumber }).session(session);
      if (!batch) {
        throw new Error(`Batch ${batchNumber} not found for medicine ${medicineId}`);
      }

      if (batch.quantity < quantity) {
        const medObj = await Medicine.findById(medicineId).session(session);
        throw new Error(`Insufficient stock for ${medObj?.name || 'medicine'} in batch ${batchNumber}. Available: ${batch.quantity}, Required: ${quantity}`);
      }

      // Fetch medicine tax rate
      const medicine = await Medicine.findById(medicineId).session(session);
      if (!medicine) {
        throw new Error(`Medicine not found: ${medicineId}`);
      }

      // Calculations
      const baseSubtotal = batch.saleRate * quantity;
      const discountVal = baseSubtotal * ((discount || 0) / 100);
      const taxRate = medicine.taxRate;
      const taxVal = (baseSubtotal - discountVal) * (taxRate / 100);
      const subtotal = (baseSubtotal - discountVal) + taxVal;

      calculatedTaxTotal += taxVal;
      calculatedDiscountTotal += discountVal;
      calculatedNetAmount += subtotal;

      processedItems.push({
        medicineId,
        batchNumber,
        quantity,
        saleRate: batch.saleRate,
        mrp: batch.mrp,
        taxRate,
        taxAmount: taxVal,
        discount: discount || 0,
        subtotal,
      });

      // Decrement quantity from batch
      batch.quantity -= quantity;
      await batch.save({ session });
    }

    const netAmountRounded = Math.round(calculatedNetAmount * 100) / 100;
    const paidAmountValue = Number(paidAmount) || 0;
    const balanceAmountRounded = Math.round((netAmountRounded - paidAmountValue) * 100) / 100;

    let dbCustomerId = customerId;

    // Handle Customer balance if credit
    if (paymentType === 'credit') {
      if (!dbCustomerId) {
        // If phone number exists, try to find customer or create new
        if (customerPhone) {
          let customer = await Customer.findOne({ phone: customerPhone }).session(session);
          if (!customer) {
            const createdCustomers = await Customer.create(
              [
                {
                  name: customerName || 'Credit Customer',
                  phone: customerPhone,
                },
              ],
              { session }
            );
            customer = createdCustomers[0];
          }
          
          if (!customer) {
            throw new Error('Failed to create or retrieve customer profile');
          }

          dbCustomerId = customer._id;
          customer.outstandingBalance += balanceAmountRounded;
          await customer.save({ session });
        } else {
          throw new Error('Customer phone number is required for Credit transactions');
        }
      } else {
        const customer = await Customer.findById(dbCustomerId).session(session);
        if (!customer) {
          throw new Error('Customer not found');
        }
        customer.outstandingBalance += balanceAmountRounded;
        await customer.save({ session });
      }
    } else if (dbCustomerId) {
      // If customer is selected for cash, verify they exist
      const customer = await Customer.findById(dbCustomerId).session(session);
      if (customer && balanceAmountRounded > 0) {
        // Even if cash, if there is a remaining balance, charge customer outstanding
        customer.outstandingBalance += balanceAmountRounded;
        await customer.save({ session });
      }
    }

    const salesInvoice = await SalesInvoice.create(
      [
        {
          invoiceNumber,
          customerId: dbCustomerId || undefined,
          customerName: customerName || 'Walk-In Customer',
          customerPhone: customerPhone || undefined,
          invoiceDate: new Date(),
          paymentType,
          items: processedItems,
          taxTotal: Math.round(calculatedTaxTotal * 100) / 100,
          discountTotal: Math.round(calculatedDiscountTotal * 100) / 100,
          netAmount: netAmountRounded,
          paidAmount: paymentType === 'credit' ? paidAmountValue : netAmountRounded,
          balanceAmount: paymentType === 'credit' ? balanceAmountRounded : 0,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Populate and return invoice details
    const populatedInvoice = await SalesInvoice.findById(salesInvoice[0]._id)
      .populate('customerId', 'name phone outstandingBalance')
      .populate('items.medicineId', 'name composition');

    res.status(201).json({
      message: 'Sales invoice generated successfully',
      invoice: populatedInvoice,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Error processing sales invoice', error: error.message });
  }
};

export const getSalesInvoices = async (req: Request, res: Response) => {
  try {
    const invoices = await SalesInvoice.find()
      .populate('customerId', 'name phone')
      .populate('items.medicineId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(invoices);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching sales invoices', error: error.message });
  }
};

export const getSalesInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await SalesInvoice.findById(req.params.id)
      .populate('customerId', 'name phone address outstandingBalance')
      .populate('items.medicineId', 'name composition category hsnCode shelf');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching invoice', error: error.message });
  }
};
