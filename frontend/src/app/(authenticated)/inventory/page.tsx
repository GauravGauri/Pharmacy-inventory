'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/utils/api';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  Layers,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  X,
  Sliders,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
}

interface Medicine {
  _id: string;
  name: string;
  composition: string;
  manufacturer: string;
  category: string;
  hsnCode: string;
  taxRate: number;
  shelf: string;
  minStockLevel: number;
  status: 'active' | 'inactive';
  totalStock: number;
  batches: Batch[];
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  // Form states for Medicine
  const [medName, setMedName] = useState('');
  const [composition, setComposition] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [category, setCategory] = useState('Tablet');
  const [hsnCode, setHsnCode] = useState('');
  const [taxRate, setTaxRate] = useState(12);
  const [shelf, setShelf] = useState('');
  const [minStockLevel, setMinStockLevel] = useState(10);

  // Form states for Stock Adjustment
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustSaleRate, setAdjustSaleRate] = useState(0);
  const [adjustPurchaseRate, setAdjustPurchaseRate] = useState(0);
  const [adjustMRP, setAdjustMRP] = useState(0);

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/medicines?search=${encodeURIComponent(searchTerm)}`);
      setMedicines(res.data);
    } catch (err: any) {
      toast.error('Failed to retrieve inventory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [searchTerm]);

  // Check if '?action=new' is passed from Dashboard shortcut
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      openMedModal(null);
    }
  }, [searchParams]);

  const openMedModal = (med: Medicine | null = null) => {
    setSelectedMed(med);
    if (med) {
      setMedName(med.name);
      setComposition(med.composition);
      setManufacturer(med.manufacturer);
      setCategory(med.category);
      setHsnCode(med.hsnCode);
      setTaxRate(med.taxRate);
      setShelf(med.shelf);
      setMinStockLevel(med.minStockLevel);
    } else {
      setMedName('');
      setComposition('');
      setManufacturer('');
      setCategory('Tablet');
      setHsnCode('');
      setTaxRate(12);
      setShelf('');
      setMinStockLevel(10);
    }
    setIsMedModalOpen(true);
  };

  const handleMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !composition || !manufacturer || !hsnCode || !shelf) {
      toast.error('Please enter all required fields.');
      return;
    }

    try {
      const payload = {
        name: medName,
        composition,
        manufacturer,
        category,
        hsnCode,
        taxRate,
        shelf,
        minStockLevel,
      };

      if (selectedMed) {
        // Edit Mode
        await api.put(`/medicines/${selectedMed._id}`, payload);
        toast.success('Medicine updated successfully.');
      } else {
        // Create Mode
        await api.post('/medicines', payload);
        toast.success('Medicine registered successfully.');
      }
      setIsMedModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error processing medicine.');
    }
  };

  const deleteMed = async (id: string) => {
    if (!confirm('Are you sure you want to archive this medicine? It will no longer show in billing.')) return;
    try {
      await api.delete(`/medicines/${id}`);
      toast.success('Medicine archived.');
      fetchMedicines();
    } catch (err: any) {
      toast.error('Failed to archive medicine.');
    }
  };

  const openAdjustModal = (batch: any, medName: string) => {
    setSelectedBatch({ ...batch, medName });
    setAdjustQty(batch.quantity);
    setAdjustSaleRate(batch.saleRate);
    setAdjustPurchaseRate(batch.purchaseRate);
    setAdjustMRP(batch.mrp);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      await api.put(`/medicines/batches/${selectedBatch.id}`, {
        quantity: adjustQty,
        saleRate: adjustSaleRate,
        purchaseRate: adjustPurchaseRate,
        mrp: adjustMRP,
      });
      toast.success('Batch adjusted successfully.');
      setIsAdjustModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error('Failed to adjust batch stock.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Medicine Catalog
          </h1>
          <p className="text-slate-400 text-sm mt-1">Add, update, and manage your pharmacy formulations and batches</p>
        </div>
        <button
          onClick={() => openMedModal(null)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 text-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder="Search by name, composition (salts), or manufacturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 transition-all text-sm"
          />
        </div>
      </div>

      {/* Catalog Table / Grid */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-cyan-500 border-r-2 border-transparent"></div>
          </div>
        ) : medicines.length > 0 ? (
          <div className="space-y-6">
            {medicines.map((med) => {
              const isLowStock = med.totalStock <= med.minStockLevel;

              return (
                <div key={med._id} className="border border-slate-800/60 rounded-xl p-5 bg-slate-950/40 space-y-4 hover:border-slate-700/60 transition-all">
                  {/* Medicine Row Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-2.5 rounded-lg border border-cyan-500/20 text-cyan-400 mt-1 flex-shrink-0">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-200">{med.name}</h3>
                          <span className="px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded-md font-medium text-[10px] uppercase">
                            {med.category}
                          </span>
                          {isLowStock && (
                            <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md font-semibold text-[10px] uppercase">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{med.totalStock === 0 ? 'Out of Stock' : 'Low Stock'}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1">
                          <span className="font-semibold text-slate-500">Composition: </span>
                          {med.composition}
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Mfr: {med.manufacturer} | HSN: {med.hsnCode} | GST: {med.taxRate}%
                        </p>
                      </div>
                    </div>

                    {/* Stock status & Quick Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 flex-wrap">
                      <div className="flex space-x-8 text-left">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Storage Shelf</span>
                          <span className="text-sm font-semibold text-slate-300 flex items-center space-x-1 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            <span>{med.shelf || 'Not set'}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Available</span>
                          <span className={`text-sm font-bold block mt-0.5 ${isLowStock ? 'text-amber-400' : 'text-slate-200'}`}>
                            {med.totalStock} units
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openMedModal(med)}
                          className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                          title="Edit Medicine info"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteMed(med._id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer"
                          title="Delete/Archive Medicine"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Batch breakdown list */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Active Batches</span>
                    {med.batches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {med.batches.map((b) => (
                          <div key={b.id} className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-semibold text-slate-300">#{b.batchNumber}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                Exp: {format(parseISO(b.expiryDate), 'MMM yyyy')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-3 text-xs">
                              <div>
                                <span className="text-slate-500 block">Available</span>
                                <span className="font-bold text-slate-350">{b.quantity} units</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-500 block">MRP / Selling</span>
                                <span className="font-bold text-slate-300">
                                  ₹{b.mrp} / ₹{b.saleRate}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => openAdjustModal(b, med.name)}
                              className="mt-3.5 w-full py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors text-[10px] font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              <Sliders className="h-3 w-3" />
                              <span>Adjust Stock</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-1">
                        No active stock batches found. Record a Purchase Invoice to ingest inventory.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm">
            No medicines match the search parameters. Add one to get started.
          </div>
        )}
      </div>

      {/* MODAL 1: ADD/EDIT MEDICINE */}
      {isMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsMedModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
              <Pill className="h-5 w-5 text-cyan-400" />
              <span>{selectedMed ? 'Modify Formulation Details' : 'Register New Drug formulation'}</span>
            </h2>

            <form onSubmit={handleMedSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="Paracetamol 650mg"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Active Composition *
                  </label>
                  <input
                    type="text"
                    required
                    value={composition}
                    onChange={(e) => setComposition(e.target.value)}
                    placeholder="Paracetamol IP"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Manufacturer / Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Cipla Ltd."
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Cream">Cream / Gel</option>
                    <option value="Drop">Drop (Ophthalmic/Otic)</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    HSN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    placeholder="3004"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Tax Rate (GST%) *
                  </label>
                  <input
                    type="number"
                    required
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    placeholder="12"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Storage Shelf *
                  </label>
                  <input
                    type="text"
                    required
                    value={shelf}
                    onChange={(e) => setShelf(e.target.value)}
                    placeholder="Rack A-1"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Minimum Safety Stock Level (for alerts)
                </label>
                <input
                  type="number"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(Number(e.target.value))}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMedModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-955 font-bold rounded-xl text-sm cursor-pointer"
                >
                  {selectedMed ? 'Save Changes' : 'Register Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK BATCH ADJUSTMENT */}
      {isAdjustModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-400" />
              <span>Stock Adjustment</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6 font-semibold">
              Medicine: <span className="text-cyan-400">{selectedBatch.medName}</span> | Batch: <span className="text-slate-300 font-mono">#{selectedBatch.batchNumber}</span>
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Current Stock Qty (units)
                </label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Purchase Rate (Cost)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustPurchaseRate}
                  onChange={(e) => setAdjustPurchaseRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    MRP Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustMRP}
                    onChange={(e) => setAdjustMRP(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Selling Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjustSaleRate}
                    onChange={(e) => setAdjustSaleRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-955 font-bold rounded-xl text-sm cursor-pointer"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-cyan-500 border-r-2 border-transparent"></div>
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}
