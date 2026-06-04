'use client';

import React, { useEffect, useState, useRef } from 'react';
import api from '@/utils/api';
import {
  Search,
  ShoppingCart,
  Trash2,
  User,
  PlusCircle,
  FileText,
  CreditCard,
  CheckCircle,
  Printer,
  ChevronDown,
  X,
  Plus,
  Minus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  saleRate: number;
  mrp: number;
  purchaseRate: number;
}

interface Medicine {
  _id: string;
  name: string;
  composition: string;
  taxRate: number;
  batches: Batch[];
  shelf: string;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
}

interface BillingItem {
  medicineId: string;
  name: string;
  batchNumber: string;
  quantity: number;
  availableStock: number;
  saleRate: number;
  mrp: number;
  taxRate: number;
  discount: number; // percentage
  subtotal: number;
}

export default function POSBilling() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [billingList, setBillingList] = useState<BillingItem[]>([]);
  
  // Selected customer states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('Walk-In Customer');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment states
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);

  // Active medicine selection modal/selector
  const [activeMedicine, setActiveMedicine] = useState<Medicine | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [inputQuantity, setInputQuantity] = useState(1);
  const [inputDiscount, setInputDiscount] = useState(0);

  // Receipt printable state
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load customers
  const fetchCustomers = async () => {
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(customerSearch)}`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers');
    }
  };

  useEffect(() => {
    if (customerSearch) {
      fetchCustomers();
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  // Search medicines
  useEffect(() => {
    const searchMeds = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get(`/medicines?search=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Error searching medicines');
      }
    };

    const delayDebounce = setTimeout(() => {
      searchMeds();
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const selectMedicine = (med: Medicine) => {
    // Check if medicine has active batches
    const activeBatches = med.batches.filter((b) => b.quantity > 0);
    
    if (activeBatches.length === 0) {
      toast.error(`"${med.name}" is completely out of stock.`);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    // Sort batches by expiry date (FEFO - earliest expiry first)
    const sortedBatches = [...activeBatches].sort((a, b) => 
      new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    setActiveMedicine(med);
    setSelectedBatch(sortedBatches[0]); // Select FEFO batch by default
    setInputQuantity(1);
    setInputDiscount(0);
    setSearchQuery('');
    setSearchResults([]);
  };

  const addItemToBill = () => {
    if (!activeMedicine || !selectedBatch) return;

    if (inputQuantity > selectedBatch.quantity) {
      toast.error(`Insufficient stock. Only ${selectedBatch.quantity} available in batch ${selectedBatch.batchNumber}.`);
      return;
    }

    // Check if batch is already in billing list
    const existingIndex = billingList.findIndex(
      (item) => item.medicineId === activeMedicine._id && item.batchNumber === selectedBatch.batchNumber
    );

    const baseSubtotal = selectedBatch.saleRate * inputQuantity;
    const discountAmount = baseSubtotal * (inputDiscount / 100);
    const taxAmount = (baseSubtotal - discountAmount) * (activeMedicine.taxRate / 100);
    const subtotal = (baseSubtotal - discountAmount) + taxAmount;

    if (existingIndex > -1) {
      const existing = billingList[existingIndex];
      const newQty = existing.quantity + inputQuantity;
      
      if (newQty > selectedBatch.quantity) {
        toast.error(`Cannot exceed batch stock limit (${selectedBatch.quantity} units)`);
        return;
      }

      const updatedList = [...billingList];
      const newBaseSub = selectedBatch.saleRate * newQty;
      const newDisc = newBaseSub * (existing.discount / 100);
      const newTax = (newBaseSub - newDisc) * (existing.taxRate / 100);

      updatedList[existingIndex] = {
        ...existing,
        quantity: newQty,
        subtotal: (newBaseSub - newDisc) + newTax,
      };
      setBillingList(updatedList);
    } else {
      setBillingList([
        ...billingList,
        {
          medicineId: activeMedicine._id,
          name: activeMedicine.name,
          batchNumber: selectedBatch.batchNumber,
          quantity: inputQuantity,
          availableStock: selectedBatch.quantity,
          saleRate: selectedBatch.saleRate,
          mrp: selectedBatch.mrp,
          taxRate: activeMedicine.taxRate,
          discount: inputDiscount,
          subtotal,
        },
      ]);
    }

    toast.success(`Added ${activeMedicine.name} (Batch ${selectedBatch.batchNumber})`);
    setActiveMedicine(null);
    setSelectedBatch(null);
    searchInputRef.current?.focus();
  };

  const removeItemFromBill = (idx: number) => {
    const newList = [...billingList];
    newList.splice(idx, 1);
    setBillingList(newList);
  };

  const updateItemQty = (idx: number, change: number) => {
    const newList = [...billingList];
    const item = newList[idx];
    const targetQty = item.quantity + change;

    if (targetQty <= 0) {
      removeItemFromBill(idx);
      return;
    }

    if (targetQty > item.availableStock) {
      toast.error(`Cannot exceed stock limit (${item.availableStock} units)`);
      return;
    }

    const baseSubtotal = item.saleRate * targetQty;
    const discountAmount = baseSubtotal * (item.discount / 100);
    const taxAmount = (baseSubtotal - discountAmount) * (item.taxRate / 100);

    newList[idx] = {
      ...item,
      quantity: targetQty,
      subtotal: (baseSubtotal - discountAmount) + taxAmount,
    };
    setBillingList(newList);
  };

  // Calculations
  const grossAmount = billingList.reduce((sum, item) => sum + (item.saleRate * item.quantity), 0);
  const totalDiscount = billingList.reduce((sum, item) => {
    const itemGross = item.saleRate * item.quantity;
    return sum + (itemGross * (item.discount / 100));
  }, 0);
  const totalTax = billingList.reduce((sum, item) => {
    const itemGross = item.saleRate * item.quantity;
    const itemDisc = itemGross * (item.discount / 100);
    return sum + ((itemGross - itemDisc) * (item.taxRate / 100));
  }, 0);
  const grandTotal = Math.round((grossAmount - totalDiscount + totalTax) * 100) / 100;

  useEffect(() => {
    if (paymentType !== 'credit') {
      setPaidAmount(grandTotal);
    }
  }, [grandTotal, paymentType]);

  const handleCheckout = async () => {
    if (billingList.length === 0) {
      toast.error('Add items to checkout.');
      return;
    }

    if (paymentType === 'credit' && !selectedCustomer && !customerPhone) {
      toast.error('Customer details (Phone number) required for Credit payments.');
      return;
    }

    try {
      const payload = {
        customerId: selectedCustomer?._id || undefined,
        customerName: selectedCustomer?.name || customerName,
        customerPhone: selectedCustomer?.phone || customerPhone,
        paymentType,
        items: billingList.map((item) => ({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          discount: item.discount,
        })),
        paidAmount: paymentType === 'credit' ? paidAmount : grandTotal,
      };

      const res = await api.post('/transactions/sales', payload);
      setCreatedInvoice(res.data.invoice);
      setIsInvoiceModalOpen(true);
      
      // Reset POS counter
      setBillingList([]);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setCustomerName('Walk-In Customer');
      setCustomerPhone('');
      setPaymentType('cash');
      setPaidAmount(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error processing sales billing.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0 print:bg-white print:text-black">
      {/* POS Screen Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            POS Billing Counter
          </h1>
          <p className="text-slate-400 text-sm mt-1">Superfast barcode/search checkout station with FEFO routing</p>
        </div>
      </div>

      {/* POS Billing grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print:hidden">
        
        {/* Left Side: Search and Billing Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Autocomplete Drug Search */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-xl relative">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search className="h-5 w-5" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drug catalog by brand name or composition..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-250 transition-all text-sm font-medium"
              />
            </div>

            {/* Results dropdown panel */}
            {searchResults.length > 0 && (
              <div className="absolute top-16 left-4 right-4 z-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-850 max-h-60 overflow-y-auto">
                {searchResults.map((med) => {
                  const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
                  
                  return (
                    <button
                      key={med._id}
                      onClick={() => selectMedicine(med)}
                      className="w-full text-left p-3.5 hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{med.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{med.composition}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${totalStock > 0 ? 'text-cyan-400' : 'text-rose-500'}`}>
                          {totalStock > 0 ? `${totalStock} units available` : 'Out of Stock'}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">Shelf: {med.shelf}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Billing List Table */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3">Medicine</th>
                    <th className="pb-3">Batch</th>
                    <th className="pb-3 text-center">Price</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-center">Disc%</th>
                    <th className="pb-3 text-right">Subtotal</th>
                    <th className="pb-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {billingList.map((item, idx) => (
                    <tr key={idx} className="text-slate-350 hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">GST: {item.taxRate}%</div>
                      </td>
                      <td className="py-3.5 font-mono text-slate-400">#{item.batchNumber}</td>
                      <td className="py-3.5 text-center font-medium">₹{item.saleRate}</td>
                      <td className="py-3.5">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => updateItemQty(idx, -1)}
                            className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-md text-slate-400"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-bold text-slate-200 w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQty(idx, 1)}
                            className="p-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-md text-slate-400"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-medium">{item.discount}%</td>
                      <td className="py-3.5 text-right font-bold text-cyan-400">
                        ₹{item.subtotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => removeItemFromBill(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {billingList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
                  <ShoppingCart className="h-12 w-12 text-slate-600 mb-3" />
                  <span>Your active billing basket is empty.</span>
                  <span className="text-xs text-slate-600 mt-1">Search medicines above to add items</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Customer Details & Summary panel */}
        <div className="space-y-6">
          {/* Customer Selection panel */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5 text-cyan-400" />
              <span>Customer / Patient</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Customer Search (Mobiles)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search patient database..."
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm"
                  />
                  {customers.length > 0 && (
                    <div className="absolute top-11 left-0 right-0 z-30 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-slate-850">
                      {customers.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone);
                            setCustomerSearch('');
                            setCustomers([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 text-xs font-semibold text-slate-350 flex justify-between"
                        >
                          <span>{c.name}</span>
                          <span className="text-slate-500">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedCustomer ? (
                <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-250">{selectedCustomer.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Active Member | {selectedCustomer.phone}</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerName('Walk-In Customer');
                      setCustomerPhone('');
                    }}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-In Customer Name"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Walk-In Phone Number"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-850 rounded-xl text-slate-300 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Billing Summary Panel */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-base font-bold text-slate-200">Invoice Summary</h3>

            <div className="space-y-3 border-b border-slate-800 pb-4 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal (Base value)</span>
                <span>₹{grossAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Discounts Applied</span>
                <span>-₹{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>GST Tax Value</span>
                <span>+₹{totalTax.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-200">
              <span className="font-bold text-sm">Net Payable Amount</span>
              <span className="font-bold text-xl text-cyan-400">₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment selector */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['cash', 'card', 'upi', 'credit'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentType(mode as any)}
                      className={`py-2 rounded-lg border font-semibold capitalize cursor-pointer transition-colors ${
                        paymentType === mode
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500 text-cyan-400'
                          : 'bg-slate-950/60 border-slate-850 text-slate-500 hover:border-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {paymentType === 'credit' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Paid Amount Today
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    max={grandTotal}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm"
                  />
                  <div className="text-[10px] text-slate-500 mt-1.5 font-semibold">
                    Outstanding Debit to Customer: <span className="text-rose-400">₹{(grandTotal - paidAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={billingList.length === 0}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-955 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Generate Sales Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE MEDICINE BATCH & QTY SELECTOR POPUP */}
      {activeMedicine && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 print:hidden">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setActiveMedicine(null);
                setSelectedBatch(null);
              }}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-bold text-slate-200 mb-1 flex items-center gap-2">
              <span>Checkout Configuration</span>
            </h3>
            <p className="text-xs text-cyan-400 font-semibold mb-6">{activeMedicine.name}</p>

            <div className="space-y-4">
              {/* Batch selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Active Batch (Sorted: FEFO)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {activeMedicine.batches
                    .filter((b) => b.quantity > 0)
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBatch(b)}
                        className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-center transition-colors ${
                          selectedBatch.id === b.id
                            ? 'bg-cyan-500/5 border-cyan-500 text-cyan-400'
                            : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-mono text-xs font-semibold">#{b.batchNumber}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Exp: {format(parseISO(b.expiryDate), 'MMM yyyy')}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-semibold">{b.quantity} in stock</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Rate: ₹{b.saleRate}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Quantity input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Checkout Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedBatch.quantity}
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Max Stock: {selectedBatch.quantity}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Item Discount %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={inputDiscount}
                    onChange={(e) => setInputDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 text-sm font-semibold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addItemToBill}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-955 font-bold rounded-xl text-sm"
              >
                Add to Billing Basket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILL RECEIPT MODAL & PRINTER VIEW */}
      {isInvoiceModalOpen && createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-4 print:absolute print:inset-0 print:p-0 print:bg-white print:z-0 print:block">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative print:bg-white print:border-none print:shadow-none print:w-full print:max-w-none print:p-0">
            
            {/* Modal actions (Hidden in print) */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6 print:hidden">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span>Invoice Generated!</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Inward Print Layout (Receipt Styling) */}
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 text-slate-300 font-mono text-xs print:bg-white print:text-black print:border-none print:p-0">
              <div className="text-center space-y-1 mb-6 border-b border-dashed border-slate-800 pb-4 print:border-slate-300">
                <h2 className="text-base font-bold text-slate-100 print:text-black">PHARMAFLOW WELLNESS</h2>
                <p className="text-[10px] text-slate-500 print:text-gray-600">Opposite City Hospital, Block B-3, Delhi</p>
                <p className="text-[10px] text-slate-500 print:text-gray-600">Mob: +91 99999 88888 | GSTIN: 07AAAAP1234A1Z1</p>
              </div>

              <div className="space-y-1.5 text-[11px] mb-4">
                <div className="flex justify-between">
                  <span>Bill No: <span className="font-bold">{createdInvoice.invoiceNumber}</span></span>
                  <span>Date: {format(parseISO(createdInvoice.invoiceDate), 'dd-MM-yyyy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patient: {createdInvoice.customerName}</span>
                  {createdInvoice.customerPhone && <span>Phone: {createdInvoice.customerPhone}</span>}
                </div>
              </div>

              {/* Items detail list */}
              <table className="w-full text-left border-t border-b border-dashed border-slate-800 py-2 mb-4 text-[10px] print:border-slate-300 print:text-black">
                <thead>
                  <tr className="font-bold border-b border-dashed border-slate-850 print:border-slate-200">
                    <th className="py-1">Item Description</th>
                    <th className="py-1">Batch</th>
                    <th className="py-1 text-center">Price</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {createdInvoice.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-950 print:border-none">
                      <td className="py-1 max-w-[140px] truncate">{item.medicineId?.name}</td>
                      <td className="py-1 font-mono text-[9px]">#{item.batchNumber}</td>
                      <td className="py-1 text-center">₹{item.saleRate}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">₹{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-800 pb-3 mb-3 print:border-slate-300">
                <div className="flex justify-between">
                  <span>Tax Gross Value:</span>
                  <span>₹{createdInvoice.taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount Allowed:</span>
                  <span>-₹{createdInvoice.discountTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-100 print:text-black text-xs">
                  <span>NET PAYABLE TOTAL:</span>
                  <span>₹{createdInvoice.netAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1 text-[10px] text-slate-500 print:text-gray-600">
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="uppercase font-semibold">{createdInvoice.paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Cash/Card:</span>
                  <span>₹{createdInvoice.paidAmount.toFixed(2)}</span>
                </div>
                {createdInvoice.balanceAmount > 0 && (
                  <div className="flex justify-between text-rose-400 print:text-black font-semibold">
                    <span>Due Balance Amount:</span>
                    <span>₹{createdInvoice.balanceAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[9px] text-slate-600 print:text-gray-500 mt-6 pt-4 border-t border-dashed border-slate-850 print:border-slate-200">
                <p>Thank you! Get well soon.</p>
                <p>Returns only accepted within 7 days with valid bill batch matching.</p>
              </div>
            </div>

            {/* Modal close bottom (Hidden in print) */}
            <div className="mt-6 flex justify-end print:hidden">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-955 font-bold rounded-xl text-sm"
              >
                Start New Invoicing Cycle
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
