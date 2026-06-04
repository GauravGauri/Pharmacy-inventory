'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-between bg-slate-950 px-10">
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* Pulsing visual spinner */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 animate-ping rounded-full border-4 border-cyan-500/20"></div>
            <div className="h-12 w-12 animate-spin rounded-full border-t-4 border-cyan-500 border-r-4 border-transparent"></div>
          </div>
          <span className="mt-6 text-sm font-semibold tracking-widest text-cyan-400 uppercase animate-pulse">
            Verifying Session
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950 custom-scrollbar relative">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>
        
        {/* Content wrapper */}
        <div className="relative z-10 p-6 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
