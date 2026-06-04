import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  outstandingBalance: number; // Positive means we owe them
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    contactPerson: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    gstin: { type: String, default: '' },
    outstandingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
