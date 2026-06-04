import mongoose, { Schema, Document } from 'mongoose';

export interface ISalesItem {
  medicineId: mongoose.Types.ObjectId;
  batchNumber: string;
  quantity: number;
  saleRate: number;
  mrp: number;
  taxRate: number;
  taxAmount: number;
  discount: number; // percentage discount
  subtotal: number;
}

export interface ISalesInvoice extends Document {
  invoiceNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string; // fallback or walk-in name
  customerPhone?: string;
  invoiceDate: Date;
  paymentType: 'cash' | 'card' | 'upi' | 'credit';
  items: ISalesItem[];
  taxTotal: number;
  discountTotal: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SalesItemSchema = new Schema({
  medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  saleRate: { type: Number, required: true },
  mrp: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
});

const SalesInvoiceSchema: Schema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false, index: true },
    customerName: { type: String, default: 'Walk-In Customer' },
    customerPhone: { type: String, default: '' },
    invoiceDate: { type: Date, required: true, default: Date.now, index: true },
    paymentType: { type: String, enum: ['cash', 'card', 'upi', 'credit'], required: true },
    items: [SalesItemSchema],
    taxTotal: { type: Number, required: true, default: 0 },
    discountTotal: { type: Number, required: true, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true, default: 0 },
    balanceAmount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const SalesInvoice = mongoose.model<ISalesInvoice>('SalesInvoice', SalesInvoiceSchema);
