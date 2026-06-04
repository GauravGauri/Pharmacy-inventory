import { Request, Response } from 'express';
import { Medicine } from '../models/Medicine.js';
import { Batch } from '../models/Batch.js';

export const createMedicine = async (req: Request, res: Response) => {
  try {
    const { name, composition, manufacturer, category, hsnCode, taxRate, shelf, minStockLevel } = req.body;

    if (!name || !composition || !manufacturer || !category || !hsnCode || !shelf) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newMedicine = await Medicine.create({
      name,
      composition,
      manufacturer,
      category,
      hsnCode,
      taxRate: Number(taxRate) || 12,
      shelf,
      minStockLevel: Number(minStockLevel) || 10,
      status: 'active',
    });

    res.status(201).json({ message: 'Medicine created successfully', medicine: newMedicine });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating medicine', error: error.message });
  }
};

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const limit = Number(req.query.limit) || 100;

    let query: any = { status: 'active' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { composition: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    // Find medicines
    const medicines = await Medicine.find(query).limit(limit).sort({ name: 1 });

    // For each medicine, get its total stock
    const medicinesWithStock = await Promise.all(
      medicines.map(async (med) => {
        const batches = await Batch.find({ medicineId: med._id, quantity: { $gt: 0 } });
        const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
        return {
          ...med.toObject(),
          totalStock,
          batches: batches.map(b => ({
            id: b._id,
            batchNumber: b.batchNumber,
            quantity: b.quantity,
            expiryDate: b.expiryDate,
            saleRate: b.saleRate,
            mrp: b.mrp,
            purchaseRate: b.purchaseRate
          }))
        };
      })
    );

    res.status(200).json(medicinesWithStock);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching medicines', error: error.message });
  }
};

export const getMedicineById = async (req: Request, res: Response) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    const batches = await Batch.find({ medicineId: medicine._id });

    res.status(200).json({
      ...medicine.toObject(),
      batches,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching medicine details', error: error.message });
  }
};

export const updateMedicine = async (req: Request, res: Response) => {
  try {
    const { name, composition, manufacturer, category, hsnCode, taxRate, shelf, minStockLevel, status } = req.body;

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      {
        name,
        composition,
        manufacturer,
        category,
        hsnCode,
        taxRate: Number(taxRate),
        shelf,
        minStockLevel: Number(minStockLevel),
        status,
      },
      { new: true }
    );

    if (!updatedMedicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.status(200).json({ message: 'Medicine updated successfully', medicine: updatedMedicine });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error updating medicine', error: error.message });
  }
};

export const deleteMedicine = async (req: Request, res: Response) => {
  try {
    // We soft-delete by setting status to inactive
    const archivedMedicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );

    if (!archivedMedicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.status(200).json({ message: 'Medicine archived successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error deleting medicine', error: error.message });
  }
};

// Batch Management
export const getBatches = async (req: Request, res: Response) => {
  try {
    const medicineId = req.query.medicineId as string;
    const filter = req.query.filter as string; // 'near-expiry' or 'out-of-stock'

    let query: any = {};

    if (medicineId) {
      query.medicineId = medicineId;
    }

    if (filter === 'out-of-stock') {
      query.quantity = 0;
    } else {
      // By default show available batches unless requested
      query.quantity = { $gt: 0 };
    }

    if (filter === 'near-expiry') {
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      query.expiryDate = { $lte: threeMonthsFromNow, $gt: new Date() };
    }

    const batches = await Batch.find(query)
      .populate('medicineId', 'name composition taxRate')
      .sort({ expiryDate: 1 });

    res.status(200).json(batches);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching batches', error: error.message });
  }
};

export const adjustBatchStock = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { quantity, saleRate, mrp, purchaseRate } = req.body;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    if (quantity !== undefined) batch.quantity = Number(quantity);
    if (saleRate !== undefined) batch.saleRate = Number(saleRate);
    if (mrp !== undefined) batch.mrp = Number(mrp);
    if (purchaseRate !== undefined) batch.purchaseRate = Number(purchaseRate);

    await batch.save();

    res.status(200).json({ message: 'Batch adjusted successfully', batch });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error adjusting batch', error: error.message });
  }
};
