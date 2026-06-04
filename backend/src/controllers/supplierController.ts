import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier.js';

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contactPerson, email, phone, address, gstin, outstandingBalance } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Supplier name and phone are required' });
    }

    const newSupplier = await Supplier.create({
      name,
      contactPerson,
      email,
      phone,
      address,
      gstin,
      outstandingBalance: Number(outstandingBalance) || 0,
    });

    res.status(201).json({ message: 'Supplier created successfully', supplier: newSupplier });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating supplier', error: error.message });
  }
};

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    res.status(200).json(suppliers);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching suppliers', error: error.message });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contactPerson, email, phone, address, gstin, outstandingBalance } = req.body;

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      {
        name,
        contactPerson,
        email,
        phone,
        address,
        gstin,
        outstandingBalance: outstandingBalance !== undefined ? Number(outstandingBalance) : undefined,
      },
      { new: true }
    );

    if (!updatedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.status(200).json({ message: 'Supplier updated successfully', supplier: updatedSupplier });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error updating supplier', error: error.message });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error deleting supplier', error: error.message });
  }
};
