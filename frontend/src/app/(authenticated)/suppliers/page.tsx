'use client';

import React, { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  Truck,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  outstandingBalance: number;
}

export default function SuppliersDirectory() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/suppliers?search=${encodeURIComponent(searchTerm)}`);
      setSuppliers(res.data);
    } catch (err) {
      toast.error('Failed to load suppliers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm]);

  const openModal = (supplier: Supplier | null = null) => {
    setSelectedSupplier(supplier);
    if (supplier) {
      setName(supplier.name);
      setContactPerson(supplier.contactPerson);
      setPhone(supplier.phone);
      setEmail(supplier.email);
      setAddress(supplier.address);
      setGstin(supplier.gstin);
      setOutstandingBalance(supplier.outstandingBalance);
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setGstin('');
      setOutstandingBalance(0);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone) {
      toast.error('Supplier Name and Mobile Number are required.');
      return;
    }

    try {
      const payload = {
        name,
        contactPerson,
        phone,
        email,
        address,
        gstin,
        outstandingBalance,
      };

      if (selectedSupplier) {
        await api.put(`/suppliers/${selectedSupplier._id}`, payload);
        toast.success('Supplier updated.');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Supplier added.');
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error processing supplier.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted.');
      fetchSuppliers();
    } catch (err) {
      toast.error('Failed to delete supplier.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Suppliers Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage vendor contact sheets and ledger payable balances</p>
        </div>
        <button
          onClick={() => openModal(null)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-955 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 text-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Supplier</span>
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
            placeholder="Search suppliers by name, phone, or contact person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200 transition-all text-sm"
          />
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-cyan-500 border-r-2 border-transparent"></div>
          </div>
        ) : suppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="pb-3">Supplier Name</th>
                  <th className="pb-3">Contact Details</th>
                  <th className="pb-3">GSTIN ID</th>
                  <th className="pb-3 text-right">Outstanding Balance</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {suppliers.map((s) => (
                  <tr key={s._id} className="text-slate-350 hover:bg-slate-800/10 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400">
                          <Truck className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{s.name}</div>
                          {s.contactPerson && (
                            <div className="text-[10px] text-slate-500 mt-0.5">Person: {s.contactPerson}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="space-y-0.5 text-[11px] text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span>{s.phone}</span>
                        </div>
                        {s.email && (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span>{s.email}</span>
                          </div>
                        )}
                        {s.address && (
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="h-3 w-3 text-slate-500" />
                            <span className="truncate max-w-[160px]">{s.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 font-mono text-slate-400">{s.gstin || 'N/A'}</td>
                    <td className="py-4 text-right">
                      <span className={`font-bold text-sm ${s.outstandingBalance > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                        ₹{s.outstandingBalance.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openModal(s)}
                          className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
                          title="Edit Info"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm">
            No suppliers found in directory. Add one to get started.
          </div>
        )}
      </div>

      {/* ADD/EDIT SUPPLIER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-400" />
              <span>{selectedSupplier ? 'Edit Vendor Details' : 'Register New Vendor Supplier'}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Abbott Healthcare"
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Primary Mobile *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Mr. Suresh Kumar"
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@abbott.in"
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    GSTIN ID
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="07AAAAP1234A1Z1"
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Opening Outstanding Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Mailing Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot No 4, Sector 12, Dwarka, Delhi"
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800 rounded-xl focus:outline-none text-slate-200 text-sm h-20"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-955 border border-slate-808 hover:bg-slate-900 text-slate-450 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-955 font-bold rounded-xl text-sm cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
