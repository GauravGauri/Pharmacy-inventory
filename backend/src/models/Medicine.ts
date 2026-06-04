import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicine extends Document {
  name: string;
  composition: string;
  manufacturer: string;
  category: string;
  hsnCode: string;
  taxRate: number; // Percentage, e.g. 12 for 12%
  shelf: string; // Storage shelf number
  minStockLevel: number; // Alerts when stock falls below this
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    composition: { type: String, required: true },
    manufacturer: { type: String, required: true },
    category: { type: String, required: true },
    hsnCode: { type: String, required: true },
    taxRate: { type: Number, required: true, default: 12 },
    shelf: { type: String, required: true },
    minStockLevel: { type: Number, required: true, default: 10 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const Medicine = mongoose.model<IMedicine>('Medicine', MedicineSchema);
