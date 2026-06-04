import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseItem {
  medicineId: mongoose.Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  manufacturingDate: Date;
  quantity: number;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
  taxRate: number; // e.g. 12%
  taxAmount: number;
  discount: number; // percentage discount, e.g. 5 for 5%
  subtotal: number; // (purchaseRate * quantity - discount) + tax
}

export interface IPurchaseInvoice extends Document {
  supplierId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  paymentType: 'cash' | 'credit';
  items: IPurchaseItem[];
  taxTotal: number;
  discountTotal: number;
  netAmount: number;
  paymentStatus: 'paid' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  manufacturingDate: { type: Date, required: true },
  quantity: { type: Number, required: true },
  purchaseRate: { type: Number, required: true },
  saleRate: { type: Number, required: true },
  mrp: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
});

const PurchaseInvoiceSchema: Schema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true, default: Date.now },
    paymentType: { type: String, enum: ['cash', 'credit'], required: true },
    items: [PurchaseItemSchema],
    taxTotal: { type: Number, required: true, default: 0 },
    discountTotal: { type: Number, required: true, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
  },
  { timestamps: true }
);

// Unique invoice number per supplier
PurchaseInvoiceSchema.index({ supplierId: 1, invoiceNumber: 1 }, { unique: true });

export const PurchaseInvoice = mongoose.model<IPurchaseInvoice>('PurchaseInvoice', PurchaseInvoiceSchema);
