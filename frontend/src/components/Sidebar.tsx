'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  Pill,
  FileSpreadsheet,
  Truck,
  Users,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
}

const SidebarItem = ({ href, icon, label, isCollapsed, isActive }: SidebarItemProps) => {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
        isActive
          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-l-4 border-cyan-500 text-cyan-400 font-semibold'
          : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-100'
      }`}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </div>
      {!isCollapsed && <span className="text-sm transition-opacity duration-300">{label}</span>}
    </Link>
  );
};

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/pos', label: 'Billing Counter (POS)', icon: <Receipt className="h-5 w-5" /> },
    { href: '/inventory', label: 'Medicine Stock', icon: <Pill className="h-5 w-5" /> },
    { href: '/purchase', label: 'Purchase Entry', icon: <FileSpreadsheet className="h-5 w-5" /> },
    { href: '/suppliers', label: 'Suppliers Directory', icon: <Truck className="h-5 w-5" /> },
    { href: '/customers', label: 'Customers Directory', icon: <Users className="h-5 w-5" /> },
    { href: '/reports', label: 'Reports & Ledgers', icon: <TrendingUp className="h-5 w-5" /> },
  ];

  return (
    <div
      className={`flex flex-col h-screen bg-slate-900 border-r border-slate-800/80 transition-all duration-300 relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 h-16">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 rounded-xl text-slate-950 flex-shrink-0 shadow-lg shadow-cyan-500/20">
            <Pill className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                PharmaFlow
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase">
                ERP System
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 p-1 rounded-full border border-slate-700 shadow-md transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isCollapsed={isCollapsed}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      {/* User Info / Profile & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="bg-slate-800 p-2 rounded-xl text-slate-300 flex-shrink-0">
            {user?.role === 'admin' ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <UserIcon className="h-5 w-5 text-cyan-400" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-200 truncate">{user?.name}</span>
              <span className="text-xs text-slate-500 capitalize">{user?.role}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={logout}
          className={`flex items-center space-x-3 w-full px-4 py-3 mt-4 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors group ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
