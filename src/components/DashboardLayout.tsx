/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogOut, User as UserIcon, LayoutDashboard, QrCode, Calendar, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  role: string;
  userName: string;
  onLogout: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: { id: string; label: string; icon: React.ReactNode }[];
}

export default function DashboardLayout({
  children,
  title,
  role,
  userName,
  onLogout,
  activeTab,
  onTabChange,
  tabs = []
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 uppercase">E-CAI</span>
          </div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            {role} PORTAL
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all rounded-xl",
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className={cn("w-5 h-5 flex items-center justify-center", activeTab === tab.id ? "text-emerald-600" : "text-slate-400")}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl border border-slate-50 bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
              <UserIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate leading-tight">{userName}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">{role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-100 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            LOG OUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">E-CAI</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-90"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Desktop Header */}
        <header className="h-16 bg-white border-b border-slate-200 hidden md:flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse"></div>
                SYSTEM ONLINE
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative scroll-smooth bg-slate-50 pb-28 md:pb-8">
          {/* Mobile Title */}
          <div className="md:hidden mb-6">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Akses: {role}</p>
          </div>
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex items-center justify-around px-4 pb-4 z-40 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[72px] transition-all relative py-1",
                activeTab === tab.id ? "text-emerald-600" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                activeTab === tab.id ? "bg-emerald-50 shadow-sm" : ""
              )}>
                {React.cloneElement(tab.icon as React.ReactElement, { className: "w-5 h-5" })}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider scale-90 origin-bottom">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
