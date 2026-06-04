import { Request, Response } from 'express';
import { Customer } from '../models/Customer.js';

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, outstandingBalance } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Customer name and phone are required' });
    }

    const newCustomer = await Customer.create({
      name,
      phone,
      email,
      address,
      outstandingBalance: Number(outstandingBalance) || 0,
    });

    res.status(201).json({ message: 'Customer created successfully', customer: newCustomer });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating customer', error: error.message });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ name: 1 });
    res.status(200).json(customers);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching customers', error: error.message });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, outstandingBalance } = req.body;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        name,
        phone,
        email,
        address,
        outstandingBalance: outstandingBalance !== undefined ? Number(outstandingBalance) : undefined,
      },
      { new: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({ message: 'Customer updated successfully', customer: updatedCustomer });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error updating customer', error: error.message });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error deleting customer', error: error.message });
  }
};
