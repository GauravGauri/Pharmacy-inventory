import mongoose, { Schema, Document } from 'mongoose';

export interface IBatch extends Document {
  medicineId: mongoose.Types.ObjectId;
  batchNumber: string;
  manufacturingDate: Date;
  expiryDate: Date;
  purchaseRate: number;
  mrp: number;
  saleRate: number;
  quantity: number;
  initialQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema = new Schema(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchNumber: { type: String, required: true },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    purchaseRate: { type: Number, required: true },
    mrp: { type: Number, required: true },
    saleRate: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 0 },
    initialQuantity: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Compound index to ensure batch numbers are unique per medicine
BatchSchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });

export const Batch = mongoose.model<IBatch>('Batch', BatchSchema);
