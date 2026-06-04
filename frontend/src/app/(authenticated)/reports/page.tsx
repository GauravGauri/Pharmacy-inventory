'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import {
  TrendingUp,
  Calendar,
  Layers,
  IndianRupee,
  Search,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface SalesInvoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  invoiceDate: string;
  paymentType: string;
  netAmount: number;
  taxTotal: number;
  discountTotal: number;
}

interface BatchReport {
  _id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
  medicineId: {
    name: string;
    composition: string;
    taxRate: number;
  };
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'sales' | 'expiry' | 'valuation'>('sales');

  // Data states
  const [salesList, setSalesList] = useState<SalesInvoice[]>([]);
  const [expiryList, setExpiryList] = useState<BatchReport[]>([]);
  const [valuationList, setValuationList] = useState<BatchReport[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [expiryMonths, setExpiryMonths] = useState(3);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch functions
  const fetchSalesLedger = async () => {
    try {
      const res = await api.get('/transactions/sales');
      setSalesList(res.data);
    } catch (err) {
      toast.error('Failed to load sales ledger.');
    }
  };

  const fetchExpiryLedger = async () => {
    try {
      // Expiry filter in backend handles 3 months, let's querybatches with near-expiry
      const res = await api.get(`/medicines/batches?filter=near-expiry`);
      setExpiryList(res.data);
    } catch (err) {
      toast.error('Failed to load expiry ledger.');
    }
  };

  const fetchValuationReport = async () => {
    try {
      // Get all batches in stock (quantity > 0)
      const res = await api.get('/medicines/batches');
      setValuationList(res.data);
    } catch (err) {
      toast.error('Failed to load stock valuation.');
    }
  };

  const loadActiveTabData = async () => {
    setIsLoading(true);
    if (activeTab === 'sales') {
      await fetchSalesLedger();
    } else if (activeTab === 'expiry') {
      await fetchExpiryLedger();
    } else if (activeTab === 'valuation') {
      await fetchValuationReport();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadActiveTabData();
  }, [activeTab]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'expiry') {
      setActiveTab('expiry');
    } else if (tabParam === 'valuation') {
      setActiveTab('valuation');
    }
  }, [searchParams]);

  // Aggregate stats
  const totalSalesRevenue = salesList.reduce((sum, inv) => sum + inv.netAmount, 0);
  const totalSalesTaxes = salesList.reduce((sum, inv) => sum + inv.taxTotal, 0);
  const totalSalesDiscounts = salesList.reduce((sum, inv) => sum + inv.discountTotal, 0);

  const totalStockValuation = valuationList.reduce((sum, b) => sum + (b.quantity * b.purchaseRate), 0);
  const totalStockMRPValuation = valuationList.reduce((sum, b) => sum + (b.quantity * b.mrp), 0);

  // Filter listings
  const filteredSales = salesList.filter(s =>
    s.invoiceNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredExpiry = expiryList.filter(b => {
    const nameMatch = b.medicineId?.name.toLowerCase().includes(searchFilter.toLowerCase()) || b.batchNumber.toLowerCase().includes(searchFilter.toLowerCase());
    
    // Filter locally by month if needed
    const expDate = new Date(b.expiryDate);
    const limitDate = new Date();
    limitDate.setMonth(limitDate.getMonth() + expiryMonths);
    const dateMatch = expDate <= limitDate;

    return nameMatch && dateMatch;
  });

  const filteredValuation = valuationList.filter(b =>
    b.medicineId?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.batchNumber.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Reports & Ledgers
          </h1>
          <p className="text-slate-400 text-sm mt-1">Audit sales ledgers, track expiry metrics, and view inventory balance valuations</p>
        </div>
        <button
          onClick={loadActiveTabData}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 border border-slate-805 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-slate-100 transition-all text-xs cursor-pointer"
        >
          <RefreshCw className="h-4.5 w-4.5" />
          <span>Reload Ledger</span>
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => { setActiveTab('sales'); setSearchFilter(''); }}
          className={`px-6 py-3.5 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'sales'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Sales Ledger
        </button>
        <button
          onClick={() => { setActiveTab('expiry'); setSearchFilter(''); }}
          className={`px-6 py-3.5 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'expiry'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Expiry Tracker
        </button>
        <button
          onClick={() => { setActiveTab('valuation'); setSearchFilter(''); }}
          className={`px-6 py-3.5 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'valuation'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Stock Valuation
        </button>
      </div>

      {/* SEARCH / FILTERS */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder={
              activeTab === 'sales'
                ? "Search by Invoice Number, Patient Name..."
                : "Search by Drug Name, Batch Number..."
            }
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 transition-all text-xs"
          />
        </div>

        {activeTab === 'expiry' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold">Expiring in:</span>
            <select
              value={expiryMonths}
              onChange={(e) => setExpiryMonths(Number(e.target.value))}
              className="bg-slate-950 border border-slate-808 rounded-xl px-3 py-1.5 text-xs text-slate-200"
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
            </select>
          </div>
        )}
      </div>

      {/* SUMMARY WIDGETS */}
      {activeTab === 'sales' && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Sales Revenue</span>
              <h3 className="text-2xl font-bold text-slate-200 mt-1">₹{totalSalesRevenue.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Tax (GST Collected)</span>
              <h3 className="text-2xl font-bold text-slate-200 mt-1">₹{totalSalesTaxes.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Discounts Allowed</span>
              <h3 className="text-2xl font-bold text-slate-200 mt-1">₹{totalSalesDiscounts.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'valuation' && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Stock Valuation (Cost Rate)</span>
              <h3 className="text-2xl font-bold text-slate-200 mt-1 font-semibold">₹{totalStockValuation.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Sum total of purchased values for active units</p>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Stock Valuation (MRP Rate)</span>
              <h3 className="text-2xl font-bold text-slate-200 mt-1 font-semibold">₹{totalStockMRPValuation.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Maximum retail potential billing value</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT VIEW */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-cyan-500 border-r-2 border-transparent"></div>
          </div>
        ) : (
          <div>
            {/* Sales Ledger Tab Content */}
            {activeTab === 'sales' && (
              <div className="overflow-x-auto">
                {filteredSales.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3">Invoice Number</th>
                        <th className="pb-3">Invoice Date</th>
                        <th className="pb-3">Customer Name</th>
                        <th className="pb-3">Payment Method</th>
                        <th className="pb-3 text-right">Tax GST</th>
                        <th className="pb-3 text-right">Discount</th>
                        <th className="pb-3 text-right">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs text-slate-350">
                      {filteredSales.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 font-semibold text-slate-200">{inv.invoiceNumber}</td>
                          <td className="py-3">{format(parseISO(inv.invoiceDate), 'dd-MM-yyyy HH:mm')}</td>
                          <td className="py-3 font-medium text-slate-300">
                            <div>{inv.customerName}</div>
                            {inv.customerPhone && (
                              <div className="text-[10px] text-slate-500 mt-0.5">{inv.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 capitalize">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              inv.paymentType === 'cash' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                              inv.paymentType === 'credit' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                              'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10'
                            }`}>
                              {inv.paymentType}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-[11px]">₹{inv.taxTotal.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono text-[11px] text-rose-400">-₹{inv.discountTotal.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono text-xs font-bold text-cyan-400">
                            ₹{inv.netAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No sales invoices logged matching filters.
                  </div>
                )}
              </div>
            )}

            {/* Expiry Tracker Tab Content */}
            {activeTab === 'expiry' && (
              <div className="overflow-x-auto">
                {filteredExpiry.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3">Medicine Formulation</th>
                        <th className="pb-3">Batch Number</th>
                        <th className="pb-3 text-center">Remaining Quantity</th>
                        <th className="pb-3 text-right">MRP Rate</th>
                        <th className="pb-3 text-right">Expiry Date</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs text-slate-350">
                      {filteredExpiry.map((b) => {
                        const isExpired = new Date(b.expiryDate) <= new Date();

                        return (
                          <tr key={b._id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3">
                              <div className="font-semibold text-slate-200">{b.medicineId?.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{b.medicineId?.composition}</div>
                            </td>
                            <td className="py-3 font-mono text-slate-400">#{b.batchNumber}</td>
                            <td className="py-3 text-center font-bold text-slate-300">{b.quantity} units</td>
                            <td className="py-3 text-right font-mono">₹{b.mrp.toFixed(2)}</td>
                            <td className={`py-3 text-right font-semibold font-mono ${isExpired ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                              {format(parseISO(b.expiryDate), 'MMMM yyyy')}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                isExpired ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500' :
                                'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                              }`}>
                                {isExpired ? 'Expired' : 'Expiring Soon'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No medicine batches expiring in the selected month interval.
                  </div>
                )}
              </div>
            )}

            {/* Stock Valuation Tab Content */}
            {activeTab === 'valuation' && (
              <div className="overflow-x-auto">
                {filteredValuation.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-3">Medicine Formulation</th>
                        <th className="pb-3">Batch Number</th>
                        <th className="pb-3 text-center">In-Stock Quantity</th>
                        <th className="pb-3 text-right">Cost Rate</th>
                        <th className="pb-3 text-right">Valuation (Cost)</th>
                        <th className="pb-3 text-right">MRP Rate</th>
                        <th className="pb-3 text-right">Valuation (MRP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs text-slate-350">
                      {filteredValuation.map((b) => (
                        <tr key={b._id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3">
                            <div className="font-semibold text-slate-200">{b.medicineId?.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">GST: {b.medicineId?.taxRate}%</div>
                          </td>
                          <td className="py-3 font-mono text-slate-400">#{b.batchNumber}</td>
                          <td className="py-3 text-center font-bold text-slate-300">{b.quantity} units</td>
                          <td className="py-3 text-right font-mono">₹{b.purchaseRate.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono font-bold text-cyan-400">
                            ₹{(b.quantity * b.purchaseRate).toFixed(2)}
                          </td>
                          <td className="py-3 text-right font-mono">₹{b.mrp.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono font-bold text-purple-400">
                            ₹{(b.quantity * b.mrp).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No active stock in inventory valuation list.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function Reports() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-cyan-500 border-r-2 border-transparent"></div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
