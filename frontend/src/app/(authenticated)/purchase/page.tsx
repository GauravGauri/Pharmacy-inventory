'use client';

import React, { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Truck,
  PlusCircle,
  Pill,
  Save,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  _id: string;
  name: string;
  phone: string;
  gstin: string;
}

interface Medicine {
  _id: string;
  name: string;
  composition: string;
  taxRate: number;
}

interface PurchaseItemInput {
  medicineId: string;
  name: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  quantity: number;
  purchaseRate: number; // Cost Price
  saleRate: number; // Retail Price
  mrp: number;
  discount: number; // percentage
  taxRate: number; // cached from medicine
}

export default function PurchaseEntry() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  
  // Invoice states
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');

  // Purchase items array
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemInput[]>([]);

  // Item form states (adding one by one to items array)
  const [selectedMedId, setSelectedMedId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [purchaseRate, setPurchaseRate] = useState<number>(0);
  const [saleRate, setSaleRate] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Load suppliers and medicines on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const supRes = await api.get('/suppliers');
        setSuppliers(supRes.data);

        const medRes = await api.get('/medicines');
        setMedicines(medRes.data);
      } catch (err) {
        toast.error('Failed to load supplier/medicine catalogs.');
      }
    };
    loadData();
  }, []);

  const handleAddPurchaseItem = () => {
    if (!selectedMedId || !batchNumber || !expiryDate || !manufacturingDate || quantity <= 0 || purchaseRate <= 0 || saleRate <= 0 || mrp <= 0) {
      toast.error('Please enter all drug batch purchase fields correctly.');
      return;
    }

    if (new Date(manufacturingDate) >= new Date(expiryDate)) {
      toast.error('Expiry date must be after manufacturing date.');
      return;
    }

    if (purchaseRate > mrp) {
      toast('Purchase cost rate is higher than MRP.', { icon: '⚠️' });
    }

    const med = medicines.find((m) => m._id === selectedMedId);
    if (!med) return;

    const newItem: PurchaseItemInput = {
      medicineId: selectedMedId,
      name: med.name,
      batchNumber,
      expiryDate,
      manufacturingDate,
      quantity,
      purchaseRate,
      saleRate,
      mrp,
      discount,
      taxRate: med.taxRate
    };

    setPurchaseItems([...purchaseItems, newItem]);

    // Reset item form
    setSelectedMedId('');
    setBatchNumber('');
    setExpiryDate('');
    setManufacturingDate('');
    setQuantity(0);
    setPurchaseRate(0);
    setSaleRate(0);
    setMrp(0);
    setDiscount(0);

    toast.success(`Batch ${batchNumber} added to invoice stack.`);
  };

  const removePurchaseItem = (idx: number) => {
    const list = [...purchaseItems];
    list.splice(idx, 1);
    setPurchaseItems(list);
  };

  // Calculations
  const calcGross = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.purchaseRate * item.quantity), 0);
  };

  const calcDiscountTotal = () => {
    return purchaseItems.reduce((sum, item) => {
      const gross = item.purchaseRate * item.quantity;
      return sum + (gross * (item.discount / 100));
    }, 0);
  };

  const calcTaxTotal = () => {
    return purchaseItems.reduce((sum, item) => {
      const gross = item.purchaseRate * item.quantity;
      const discVal = gross * (item.discount / 100);
      return sum + ((gross - discVal) * (item.taxRate / 100));
    }, 0);
  };

  const calcNet = () => {
    return calcGross() - calcDiscountTotal() + calcTaxTotal();
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      toast.error('Select a vendor supplier.');
      return;
    }
    if (!invoiceNumber) {
      toast.error('Enter the Supplier Invoice number.');
      return;
    }
    if (purchaseItems.length === 0) {
      toast.error('Add at least one batch item to submit.');
      return;
    }

    try {
      const payload = {
        supplierId: selectedSupplierId,
        invoiceNumber,
        invoiceDate,
        paymentType,
        items: purchaseItems
      };

      await api.post('/transactions/purchases', payload);
      toast.success('Purchase invoice logged and stock updated.');

      // Reset
      setSelectedSupplierId('');
      setInvoiceNumber('');
      setPurchaseItems([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving purchase ledger.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Purchase Invoice Log
        </h1>
        <p className="text-slate-400 text-sm mt-1">Ingest new drug supply invoices and configure incoming batches</p>
      </div>

      <form onSubmit={handleSubmitInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left/Middle: Invoice General & Drug Ingestion */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Supplier Invoice Metadata */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-850 pb-3">
              <Truck className="h-4.5 w-4.5 text-cyan-400" />
              <span>Invoice General Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Supplier Vendor *
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm font-semibold"
                >
                  <option value="">-- Choose Vendor --</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} (Phone: {s.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Invoice No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="SUP-9201A"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-250 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Batch Configuration block */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-850 pb-3">
              <Pill className="h-4.5 w-4.5 text-cyan-400" />
              <span>Incoming Drug Batch Configuration</span>
            </h3>

            {/* Medicine picker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Medicine *
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm font-semibold"
                >
                  <option value="">-- Choose Medicine Formulation --</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.composition})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="B-9021"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl focus:outline-none text-slate-200 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Manufacturing/Expiry & Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Manufacturing Date *
                </label>
                <input
                  type="month"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Expiry Date *
                </label>
                <input
                  type="month"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Received Quantity (Units) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="100"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Financial Details (Purchase, MRP, Sale Rate, Discount) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Purchase Rate (Cost) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseRate || ''}
                  onChange={(e) => setPurchaseRate(Number(e.target.value))}
                  placeholder="₹10.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Maximum Retail MRP *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={mrp || ''}
                  onChange={(e) => setMrp(Number(e.target.value))}
                  placeholder="₹15.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Selling Rate *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={saleRate || ''}
                  onChange={(e) => setSaleRate(Number(e.target.value))}
                  placeholder="₹13.50"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Purchase Discount%
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="5%"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-805 rounded-xl text-slate-200 text-sm font-semibold"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddPurchaseItem}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 font-semibold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Batch to Ingestion Queue</span>
            </button>
          </div>
        </div>

        {/* Right Side: Ledger summary & Checkout */}
        <div className="space-y-6">
          {/* Active Items Stack */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-850 pb-3 mb-4">
              Ingested Invoices Stack ({purchaseItems.length})
            </h3>
            
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Batch #{item.batchNumber} | Qty: {item.quantity} | GST: {item.taxRate}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePurchaseItem(idx)}
                    className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {purchaseItems.length === 0 && (
                <div className="text-center text-slate-500 text-xs py-8 italic">
                  Ingestion stack is empty. Configure drug batches on the left.
                </div>
              )}
            </div>
          </div>

          {/* Inward Invoice Summary Box */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-slate-200">Ledger Totals</h3>

            <div className="space-y-3 border-b border-slate-800 pb-4 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Gross Value</span>
                <span>₹{calcGross().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Purchase Discounts</span>
                <span>-₹{calcDiscountTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Taxes (GST)</span>
                <span>+₹{calcTaxTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-200">
              <span className="font-bold text-sm">Net Payable Total</span>
              <span className="font-bold text-xl text-cyan-400">₹{calcNet().toFixed(2)}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Payment Type
                </label>
                <div className="flex space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`flex-1 py-2 border rounded-lg font-semibold cursor-pointer capitalize transition-colors ${
                      paymentType === 'cash'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    Cash Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`flex-1 py-2 border rounded-lg font-semibold cursor-pointer capitalize transition-colors ${
                      paymentType === 'credit'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    Credit Account
                  </button>
                </div>
                {paymentType === 'credit' && (
                  <div className="text-[10px] text-amber-400 mt-2 font-semibold bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg">
                    This amount will be added to the vendor supplier outstanding balance ledger.
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={purchaseItems.length === 0 || !selectedSupplierId || !invoiceNumber}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-955 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>Log Purchase Ledger</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
