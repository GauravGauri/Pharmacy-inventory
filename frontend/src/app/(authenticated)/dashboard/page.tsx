'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  IndianRupee,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface DashboardStats {
  salesToday: number;
  inventoryValuation: number;
  expiringSoonCount: number;
  lowStockCount: number;
}

interface LowStockItem {
  id: string;
  name: string;
  minStockLevel: number;
  totalStock: number;
}

interface ExpiringBatch {
  _id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  medicineId: {
    name: string;
    shelf: string;
  };
}

interface ChartEntry {
  date: string;
  sales: number;
  count: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setRefreshing(true);

    try {
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data.stats);
      setLowStock(statsRes.data.lowStockList);
      setExpiring(statsRes.data.expiringBatches);

      const chartRes = await api.get('/dashboard/sales-chart?days=7');
      setChartData(chartRes.data);
    } catch (err: any) {
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-cyan-500 border-r-2 border-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Today's Sales",
      value: `₹${stats?.salesToday.toLocaleString('en-IN') || 0}`,
      icon: <IndianRupee className="h-6 w-6 text-emerald-400" />,
      desc: "Gross invoicing values logged today",
      color: "border-emerald-500/20 bg-emerald-500/5",
    },
    {
      label: "Stock Valuation",
      value: `₹${stats?.inventoryValuation.toLocaleString('en-IN') || 0}`,
      icon: <Layers className="h-6 w-6 text-cyan-400" />,
      desc: "Estimated value of current batches",
      color: "border-cyan-500/20 bg-cyan-500/5",
    },
    {
      label: "Low Stock Items",
      value: stats?.lowStockCount || 0,
      icon: <AlertTriangle className="h-6 w-6 text-amber-400" />,
      desc: "Medicines below buffer levels",
      color: "border-amber-500/20 bg-amber-500/5",
    },
    {
      label: "Expiring Batches",
      value: stats?.expiringSoonCount || 0,
      icon: <Calendar className="h-6 w-6 text-rose-400" />,
      desc: "Batches expiring in 3 months",
      color: "border-rose-500/20 bg-rose-500/5",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time pharmacy stock & performance insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 rounded-xl text-slate-300 hover:text-slate-100 transition-all text-sm cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            href="/pos"
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 text-sm"
          >
            <Receipt className="h-4 w-4" />
            <span>Billing Counter</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`border rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:shadow-2xl ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                {card.label}
              </span>
              <div className="p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
                {card.icon}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-slate-100 tracking-tight">{card.value}</h3>
              <p className="text-slate-500 text-xs mt-1.5 font-medium">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-200">Revenue Trend</h2>
              <p className="text-slate-500 text-xs mt-0.5">Billing invoice gross value for the last 7 days</p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Weekly View</span>
            </div>
          </div>
          <div className="h-64 w-full mt-auto">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={11}
                    tickFormatter={(str) => {
                      try {
                        return format(parseISO(str), 'dd MMM');
                      } catch {
                        return str;
                      }
                    }}
                  />
                  <YAxis stroke="#475569" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                    labelFormatter={(str) => {
                      try {
                        return format(parseISO(str as string), 'eeee, dd MMM yyyy');
                      } catch {
                        return str as string;
                      }
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Sales (₹)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                No transaction data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations panel */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-200 mb-2">In-App Shortcuts</h2>
            <p className="text-slate-500 text-xs mb-6">Quick shortcuts for daily operations</p>
          </div>
          
          <div className="space-y-4">
            <Link
              href="/pos"
              className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-xl group transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/20 text-cyan-400">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-slate-200">Point of Sale (POS)</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Quick retail billing checkout</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/purchase"
              className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-xl group transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-slate-200">Add Purchase Invoice</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Log new supplier batches</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/inventory?action=new"
              className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-xl group transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-purple-400">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-slate-200">New Medicine Entry</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Register chemical formulation</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Lists: Expiry and Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Near Expiry Batches */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-200">Soon Expiring Batches</h2>
              <p className="text-slate-500 text-xs mt-0.5">Drugs requiring vendor returns or immediate sale</p>
            </div>
            <Link href="/reports?tab=expiry" className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {expiring.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3">Medicine</th>
                    <th className="pb-3">Batch</th>
                    <th className="pb-3 text-center">Shelf</th>
                    <th className="pb-3 text-center">Stock</th>
                    <th className="pb-3 text-right">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {expiring.map((b) => (
                    <tr key={b._id} className="text-slate-300 hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{b.medicineId?.name}</td>
                      <td className="py-3 font-mono text-slate-400">{b.batchNumber}</td>
                      <td className="py-3 text-center text-slate-400">{b.medicineId?.shelf}</td>
                      <td className="py-3 text-center font-bold text-slate-200">{b.quantity}</td>
                      <td className="py-3 text-right text-rose-400 font-semibold">
                        {format(parseISO(b.expiryDate), 'MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">
                No active batches expiring within 3 months.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-200">Critical Stock Buffer</h2>
              <p className="text-slate-500 text-xs mt-0.5">Medicines with total stock levels below buffer margins</p>
            </div>
            <Link href="/inventory" className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1">
              <span>View Stock</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {lowStock.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3">Medicine</th>
                    <th className="pb-3 text-center">Alert Limit</th>
                    <th className="pb-3 text-center">Current Stock</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {lowStock.map((item) => (
                    <tr key={item.id} className="text-slate-300 hover:bg-slate-800/10 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{item.name}</td>
                      <td className="py-3 text-center text-slate-400 font-medium">{item.minStockLevel}</td>
                      <td className="py-3 text-center font-bold text-rose-400">{item.totalStock}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md font-semibold text-[10px] uppercase">
                          {item.totalStock === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">
                All inventory levels are above safety margins.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
