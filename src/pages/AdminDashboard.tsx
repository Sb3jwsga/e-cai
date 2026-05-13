/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Peserta, Event, Attendance, AttendanceType, Dokumentasi } from '../types';
import { db, pullFromSpreadsheet } from '../lib/db';
import DashboardLayout from '../components/DashboardLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Users, Calendar, BarChart3, Plus, Trash2, Edit, Save, X, Phone, MapPin, Hash, QrCode, ShieldCheck, Clock, Download, RefreshCw, Image, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';

// Helper to format date as dd/mm/yyyy
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Fallback for dd/mm/yyyy if Date parsing fails
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  
  return dateStr;
};

const formatTime24 = (timeStr: string) => {
  if (!timeStr) return '-';
  
  // Try Date parsing first (handles ISO strings)
  const d = new Date(timeStr);
  if (!isNaN(d.getTime()) && (timeStr.includes('T') || timeStr.includes('-') || timeStr.includes('/'))) {
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Handle AM/PM text formats
  if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) {
    const parts = timeStr.trim().split(/\s+/);
    const time = parts[0];
    const modifier = parts[1] || '';
    if (time && modifier) {
       let [hours, minutes] = time.split(':');
       let h = parseInt(hours, 10);
       if (modifier.toLowerCase() === 'pm' && h < 12) h += 12;
       if (modifier.toLowerCase() === 'am' && h === 12) h = 0;
       return `${h.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
  }

  // Extract HH:mm using regex if other methods fail
  const timeMatch = timeStr.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, '0');
    const m = timeMatch[2];
    return `${h}:${m}`;
  }

  return timeStr;
};

const formatDateTime = (dateStr: string | number | Date) => {
  if (!dateStr) return '-';
  
  let d: Date;
  if (dateStr instanceof Date) {
    d = dateStr;
  } else if (typeof dateStr === 'string' && dateStr.includes('/') && !dateStr.includes('T')) {
    // Try parsing dd/mm/yyyy HH:mm
    const parts = dateStr.split(/[\/\s:]/);
    if (parts.length >= 3) {
       const [day, month, year, hours, minutes] = parts;
       d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours || '0'), parseInt(minutes || '0'));
    } else {
       d = new Date(dateStr);
    }
  } else {
    d = new Date(dateStr);
  }

  if (isNaN(d.getTime())) return String(dateStr);
  
  const date = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${date}/${month}/${year} ${hours}:${minutes}`;
};

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [users, setUsers] = useState<User[]>([]);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [dokumentasi, setDokumentasi] = useState<Dokumentasi[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = () => {
    setUsers(db.getUsers());
    setPeserta(db.getPeserta());
    setEvents(db.getEvents());
    setAttendance(db.getAttendance());
    setDokumentasi(db.getDokumentasi());
  };

  const syncData = async () => {
    setIsSyncing(true);
    try {
      const result = await pullFromSpreadsheet();
      if (result && 'error' in result) {
        console.error('Sync failed:', result.error);
        // Only alert if it's not the initial starting server error
        if (!result.error.toLowerCase().includes('starting server')) {
           // We could use a toast here, but for now just console error to avoid annoying popups
        }
      }
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  // Load data
  useEffect(() => {
    loadData();
    if (activeTab === 'DASHBOARD') {
      syncData();
    }
  }, [activeTab]);

  const tabs = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'PESERTA', label: 'Peserta', icon: <Users className="w-4 h-4" /> },
    { id: 'EVENT', label: 'Event', icon: <Calendar className="w-4 h-4" /> },
    { id: 'DOKUMENTASI', label: 'Dokumentasi', icon: <Image className="w-4 h-4" /> },
    { id: 'ANALISA', label: 'Analisa Kehadiran', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'STAFF', label: 'Manage Staff', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout
      title={activeTab}
      role="ADMIN"
      userName={user.username}
      onLogout={onLogout}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    >
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-8">
          <div className="flex justify-end">
             <button 
               onClick={syncData}
               disabled={isSyncing}
               className={cn(
                 "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border",
                 isSyncing 
                  ? "bg-slate-100 text-slate-400 border-slate-200" 
                  : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200 shadow-sm"
               )}
             >
               <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
               {isSyncing ? "Syncing..." : "Sync Cloud"}
             </button>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard label="TOTAL PESERTA" value={peserta.length} color="blue" />
            <StatCard label="TOTAL EVENT" value={events.length} color="purple" />
            <StatCard label="TOTAL STAFF" value={users.length} color="green" />
            <StatCard label="TOTAL ABSENSI" value={attendance.length} color="orange" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Attendance */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                 <h3 className="font-bold text-slate-800">Recent Attendance</h3>
                 <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">Live Status</span>
              </div>
              <div className="space-y-1">
                {attendance.length === 0 ? (
                  <p className="text-sm text-slate-400 italic font-medium py-8 text-center">No recent activity detected.</p>
                ) : (
                  attendance.slice(-5).reverse().map((record) => {
                    const p = peserta.find(pes => pes.id === record.pesertaId);
                    const e = events.find(ev => ev.id === record.eventId);
                    return (
                      <div key={record.id} className="flex justify-between items-center py-4 px-4 rounded-xl border border-transparent hover:border-slate-50 hover:bg-slate-50/50 transition-all group">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <Users className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-sm font-bold text-slate-800">{p?.nama_lengkap || 'Unknown'}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase">{e?.nama_event || 'Unknown'}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg inline-block uppercase">{record.type}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1.5">{formatDateTime(record.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PESERTA' && (
        <ManagePeserta 
          peserta={peserta} 
          setPeserta={setPeserta} 
          events={events} 
          attendance={attendance} 
        />
      )}

      {activeTab === 'EVENT' && (
        <ManageEvents 
          events={events} 
          setEvents={setEvents} 
        />
      )}

      {activeTab === 'DOKUMENTASI' && (
        <ManageDokumentasi 
          dokumentasi={dokumentasi}
          setDokumentasi={setDokumentasi}
          events={events}
        />
      )}

      {activeTab === 'ANALISA' && (
        <AttendanceAnalysis 
          peserta={peserta} 
          events={events} 
          attendance={attendance}
          syncData={syncData}
          isSyncing={isSyncing}
        />
      )}

      {activeTab === 'STAFF' && (
        <ManageStaff 
          users={users} 
          setUsers={setUsers} 
        />
      )}
    </DashboardLayout>
  );
}

function ManageDokumentasi({ 
  dokumentasi, 
  setDokumentasi,
  events
}: { 
  dokumentasi: Dokumentasi[]; 
  setDokumentasi: React.Dispatch<React.SetStateAction<Dokumentasi[]>>;
  events: Event[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Dokumentasi>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.tanggal || !formData.nama_event || !formData.link) {
      alert("Semua data harus diisi");
      return;
    }

    setIsSaving(true);
    try {
      const newDoc = { 
        ...formData, 
        id: `D${Date.now()}` 
      } as Dokumentasi;
      const newList = [...dokumentasi, newDoc];
      const result = await db.setDokumentasi(newList, 'create', newDoc);
      
      if (!result.success) {
        alert("Dokumentasi tersimpan lokal, tapi gagal sinkron ke Spreadsheet: " + result.error);
      }
      
      setDokumentasi(newList);
      setIsAdding(false);
      setFormData({});
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDoc = (id: string) => {
    if (confirm('Hapus dokumentasi ini?')) {
      const newList = dokumentasi.filter(d => d.id !== id);
      db.setDokumentasi(newList, 'delete', { id });
      setDokumentasi(newList);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="font-bold flex items-center gap-3 text-slate-800">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <Image className="w-5 h-5" />
          </div>
          Dokumentasi Event
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" /> Tambah Dokumentasi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dokumentasi.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 font-medium italic">Belum ada dokumentasi</div>
        ) : (
          dokumentasi.map(doc => (
            <div key={doc.id} className="bg-white border border-slate-200 p-6 rounded-[32px] relative group transition-all hover:shadow-lg hover:border-emerald-100 flex flex-col">
              <button 
                onClick={() => deleteDoc(doc.id)} 
                className="absolute top-4 right-4 md:opacity-0 group-hover:opacity-100 p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="mb-4">
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-wider">
                  {formatDate(doc.tanggal)}
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-lg mb-3 tracking-tight uppercase line-clamp-2">{doc.nama_event}</h4>
              
              <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                 <a 
                   href={doc.link} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                 >
                   <ExternalLink className="w-3.5 h-3.5" />
                   Buka Drive
                 </a>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 shadow-2xl max-w-md w-full border border-white/20 animate-in slide-in-from-bottom-8 duration-300 max-h-[95vh] overflow-y-auto">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mb-8 mx-auto"></div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-8 text-center flex items-center justify-center gap-3 uppercase tracking-tighter">
              <div className="p-2 bg-emerald-600 rounded-xl text-white">
                <Image className="w-5 h-5" />
              </div>
              TAMBAH DOKUMENTASI
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Pilih Event (Opsional)</label>
                <select 
                  className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm appearance-none"
                  onChange={e => {
                    const ev = events.find(event => event.id === e.target.value);
                    if (ev) {
                      setFormData({
                        ...formData,
                        nama_event: ev.nama_event,
                        tanggal: ev.tanggal_event
                      });
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">-- Pilih dari Event yang Ada --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.nama_event} ({formatDate(ev.tanggal_event)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Nama Event</label>
                <input 
                  className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold" 
                  value={formData.nama_event || ''}
                  onChange={e => setFormData({...formData, nama_event: e.target.value})} 
                  placeholder="Masukkan nama event..." 
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Tanggal Event</label>
                <input 
                  type="date" 
                  className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold" 
                  value={formData.tanggal || ''}
                  onChange={e => setFormData({...formData, tanggal: e.target.value})} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Link Google Drive</label>
                <input 
                  className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold" 
                  value={formData.link || ''}
                  onChange={e => setFormData({...formData, link: e.target.value})} 
                  placeholder="https://drive.google.com/..." 
                />
              </div>
            </div>
            <div className="mt-8 flex gap-3 text-center">
              <button 
                disabled={isSaving}
                onClick={handleSave} 
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button disabled={isSaving} onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colorMap: any = {
    blue: 'text-blue-600 bg-blue-50/50 border-blue-100',
    purple: 'text-emerald-600 bg-emerald-50/50 border-emerald-100',
    green: 'text-green-600 bg-green-50/50 border-green-100',
    orange: 'text-orange-600 bg-orange-50/50 border-orange-100',
  };
  return (
    <div className={cn("bg-white border rounded-2xl p-6 shadow-sm transition-all hover:shadow-md", colorMap[color])}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  );
}

function ManagePeserta({ 
  peserta, 
  setPeserta, 
  events, 
  attendance 
}: { 
  peserta: Peserta[]; 
  setPeserta: React.Dispatch<React.SetStateAction<Peserta[]>>;
  events: Event[];
  attendance: Attendance[];
}) {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [scanType, setScanType] = useState<AttendanceType>('MATERI');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Peserta>>({});
  const [showQr, setShowQr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterKelompok, setFilterKelompok] = useState('');
  const [filterDesa, setFilterDesa] = useState('');

  const filteredPeserta = peserta.filter(p => {
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || 
                          p.id.toLowerCase().includes(search.toLowerCase());
    const matchesKelompok = filterKelompok === '' || p.kelompok === filterKelompok;
    const matchesDesa = filterDesa === '' || p.desa === filterDesa;
    return matchesSearch && matchesKelompok && matchesDesa;
  });

   const attendanceRecords = attendance.filter(a => 
    (selectedEventId === '' || String(a.eventId).trim() === String(selectedEventId).trim()) && 
    String(a.type).trim().toUpperCase() === String(scanType).trim().toUpperCase()
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let newList;
      let syncResult;
      if (editingId) {
        const updatedP = { ...peserta.find(p => p.id === editingId), ...formData } as Peserta;
        newList = peserta.map(p => p.id === editingId ? updatedP : p);
        syncResult = await db.setPeserta(newList, 'update', updatedP);
      } else {
        const newP = { 
          ...formData, 
          id: formData.id || `P${Math.floor(1000 + Math.random() * 9000)}` 
        } as Peserta;
        newList = [...peserta, newP];
        syncResult = await db.setPeserta(newList, 'create', newP);
      }

      if (syncResult && !syncResult.success) {
        alert("Data saved locally, but failed to sync to Spreadsheet: " + syncResult.error);
      }

      setPeserta(newList);
      setEditingId(null);
      setIsAdding(false);
      setFormData({});
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus peserta ini?')) {
      const newList = peserta.filter(p => p.id !== id);
      db.setPeserta(newList, 'delete', { id });
      setPeserta(newList);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
               <Users className="w-5 h-5" />
             </div>
             Manajemen Peserta
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input 
                type="text" 
                placeholder="Cari Peserta / ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-semibold w-full sm:w-64 bg-slate-50 focus:bg-white"
              />
              <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              onClick={() => { setIsAdding(true); setFormData({ id: `P${Math.floor(1000 + Math.random() * 9000)}` }); }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Daftar Baru
            </button>
          </div>
        </div>

        {/* Filters Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-50 pt-6">
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Kontrol Materi</label>
              <div className="relative">
                 <select 
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                 >
                    {events.map(ev => (
                       <option key={ev.id} value={ev.id}>{ev.nama_event}</option>
                    ))}
                 </select>
                 <Calendar className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tipe Absen</label>
              <div className="relative">
                 <select 
                    value={scanType}
                    onChange={(e) => setScanType(e.target.value as AttendanceType)}
                    className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                 >
                    <option value="MATERI">Materi</option>
                    <option value="MAKAN">Makan</option>
                 </select>
                 <Clock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Filter Kelompok</label>
              <div className="relative">
                 <select 
                    value={filterKelompok}
                    onChange={(e) => setFilterKelompok(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                 >
                    <option value="">Semua Kelompok</option>
                    {Array.from(new Set(peserta.map(p => p.kelompok))).filter(Boolean).sort().map(k => (
                       <option key={k} value={k}>{k}</option>
                    ))}
                 </select>
                 <MapPin className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Filter Desa</label>
              <div className="relative">
                 <select 
                    value={filterDesa}
                    onChange={(e) => setFilterDesa(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                 >
                    <option value="">Semua Desa</option>
                    {Array.from(new Set(peserta.map(p => p.desa))).filter(Boolean).sort().map(d => (
                       <option key={d} value={d}>{d}</option>
                    ))}
                 </select>
                 <MapPin className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
           </div>
        </div>

      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Mobile Card List */}
        <div className="block md:hidden divide-y divide-slate-50">
          {filteredPeserta.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic font-medium">Peserta tidak ditemukan</div>
          ) : (
            filteredPeserta.map((p) => (
              <div key={p.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800 text-sm uppercase leading-tight">{p.nama_lengkap}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">ID: {p.id} &bull; {p.jenis_kelamin}</p>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => setShowQr(p.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all">
                        <QrCode className="w-4 h-4" />
                     </button>
                     <button onClick={() => { setEditingId(p.id); setFormData(p); }} className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                        <Edit className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleDelete(p.id)} className="p-2 bg-slate-50 text-slate-400 border border-slate-100 rounded-xl hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                   <div className="p-2.5 bg-white rounded-xl text-emerald-600 shadow-sm border border-slate-100">
                      <MapPin className="w-4 h-4" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Domisili Peserta</p>
                      <p className="text-xs font-bold text-slate-700">{p.kelompok} &bull; DS. {p.desa}</p>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <table className="w-full text-left border-collapse hidden md:table">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] uppercase tracking-widest font-bold text-slate-400">
              <th className="px-8 py-4 tracking-tighter">ID Profile</th>
              <th className="px-8 py-4">Nama Lengkap</th>
              <th className="px-8 py-4 text-center">Gender</th>
              <th className="px-8 py-4">Asal / Kelompok</th>
              <th className="px-8 py-4 text-right">Konfigurasi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredPeserta.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-5">
                   <span className="font-bold text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{p.id}</span>
                </td>
                <td className="px-8 py-5">
                   <span className="font-bold text-slate-700">{p.nama_lengkap}</span>
                </td>
                <td className="px-8 py-5 text-slate-500 font-medium text-center">
                   {p.jenis_kelamin}
                </td>
                <td className="px-8 py-5">
                   <div className="flex flex-col">
                      <span className="font-bold text-slate-700 uppercase text-xs">{p.kelompok}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DS. {p.desa}</span>
                   </div>
                </td>
                <td className="px-8 py-5">
                   <div className="flex items-center justify-end gap-2">
                     <button onClick={() => setShowQr(p.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all">
                        <QrCode className="w-4 h-4" />
                     </button>
                     <button onClick={() => { setEditingId(p.id); setFormData(p); }} className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                        <Edit className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleDelete(p.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isAdding || editingId) && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 shadow-2xl max-w-sm w-full border border-white/20 animate-in slide-in-from-bottom-8 duration-300 overflow-y-auto max-h-[95vh]">
               <div className="w-16 h-1.5 bg-slate-100 rounded-full mb-8 mx-auto"></div>
               <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-8 text-center flex items-center justify-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-xl text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  {editingId ? 'UBAH DATA PESERTA' : 'PESERTA BARU'}
               </h3>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nama Lengkap</label>
                    <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl outline-none px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white" 
                    value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Masukkan nama..." autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">ID Profile</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl outline-none px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white" 
                      value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="ID" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Gender</label>
                      <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl outline-none px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white appearance-none" 
                      value={formData.jenis_kelamin || ''} onChange={e => setFormData({...formData, jenis_kelamin: e.target.value as any})}>
                         <option value="">Pilih</option>
                         <option value="Laki-laki">Laki-laki</option>
                         <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Kelompok</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl outline-none px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white" 
                      value={formData.kelompok || ''} onChange={e => setFormData({...formData, kelompok: e.target.value})} placeholder="Klp" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Desa</label>
                      <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl outline-none px-4 py-3.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white" 
                      value={formData.desa || ''} onChange={e => setFormData({...formData, desa: e.target.value})} placeholder="Desa" />
                    </div>
                  </div>
               </div>
               <div className="mt-8 flex gap-3">
                  <button 
                    disabled={isSaving}
                    onClick={handleSave} 
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button disabled={isSaving} onClick={() => { setIsAdding(false); setEditingId(null); setFormData({}); }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 active:scale-[0.98] transition-all">Batal</button>
               </div>
            </div>
         </div>
      )}

      {showQr && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[40px] p-10 flex flex-col items-center shadow-2xl max-w-sm w-full border border-white/20 animate-in zoom-in-95 duration-200">
               <div className="w-16 h-1 bg-slate-100 rounded-full mb-8"></div>
               <h4 className="font-bold text-slate-800 mb-8 text-xl tracking-tight">Kartu Digital Peserta</h4>
               <div className="p-6 bg-white border border-slate-100 rounded-[32px] mb-8 shadow-inner shadow-slate-100">
                  <QRCodeSVG value={showQr} size={200} level="H" />
               </div>
               <div className="text-center mb-10 w-full">
                  <p className="text-2xl font-bold text-slate-800 tracking-tight">{peserta.find(p => p.id === showQr)?.nama_lengkap}</p>
                  <p className="text-xs font-bold mt-2 text-slate-400 tracking-[0.2em] uppercase">{showQr}</p>
                  <div className="mt-6 flex justify-center">
                    <span className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/30">
                      {peserta.find(p => p.id === showQr)?.kelompok}
                    </span>
                  </div>
               </div>
               <div className="flex gap-3 w-full">
                  <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98]">Cetak Ke PDF</button>
                  <button onClick={() => setShowQr(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]">Tutup</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function ManageEvents({ 
  events, 
  setEvents 
}: { 
  events: Event[]; 
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Event>>({ type: 'MATERI' });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newEvent = { 
        ...formData, 
        id: formData.id || `E${Date.now()}` 
      } as Event;
      const newList = [...events, newEvent];
      const result = await db.setEvents(newList, 'create', newEvent);
      
      if (!result.success) {
        alert("Event saved locally, but failed to sync to Spreadsheet: " + result.error);
      }
      
      setEvents(newList);
      setIsAdding(false);
      setFormData({ type: 'MATERI' });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = (id: string) => {
     if (confirm('Hapus event ini?')) {
        const newList = events.filter(e => e.id !== id);
        db.setEvents(newList, 'delete', { id });
        setEvents(newList);
     }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
         <h3 className="font-bold flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
            Manajemen Event
         </h3>
         <button
           onClick={() => setIsAdding(true)}
           className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-500/10"
         >
           <Plus className="w-4 h-4" /> Tambah Event
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium italic">Belum ada event yang dibuat</div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[32px] relative group transition-all hover:shadow-lg hover:border-emerald-100 flex flex-col">
                 <button onClick={() => deleteEvent(ev.id)} className="absolute top-4 right-4 md:opacity-0 group-hover:opacity-100 p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                 </button>
                 <div className="mb-6 flex justify-between items-center pr-8 md:pr-0">
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-wider">{formatDate(ev.tanggal_event)}</span>
                    <span className={cn(
                       "text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-tighter",
                       ev.type === 'MAKAN' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                       {ev.type || 'MATERI'}
                    </span>
                 </div>
                 <h4 className="font-bold text-slate-800 text-lg sm:text-xl mb-3 tracking-tight leading-tight uppercase">{ev.nama_event}</h4>
                 <p className="text-sm text-slate-400 mb-8 font-medium line-clamp-2 leading-relaxed italic">{ev.deskripsi}</p>
                 <div className="flex items-center gap-4 border-t border-slate-50 pt-6 mt-auto">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                       <Clock className="w-3.5 h-3.5 text-emerald-600" />
                       {formatTime24(ev.jam_mulai_event)} - {formatTime24(ev.jam_selesai)}
                    </div>
                 </div>
              </div>
            ))
          )}
       </div>

       {isAdding && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 shadow-2xl max-w-md w-full border border-white/20 animate-in slide-in-from-bottom-8 duration-300 max-h-[95vh] overflow-y-auto">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full mb-8 mx-auto"></div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-8 text-center flex items-center justify-center gap-3 uppercase tracking-tighter">
                   <div className="p-2 bg-emerald-600 rounded-xl text-white">
                     <Calendar className="w-5 h-5" />
                   </div>
                   TAMBAH EVENT BARU
                </h3>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Tipe Event/Kegiatan</label>
                      <select 
                         className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm appearance-none"
                         value={formData.type}
                         onChange={e => setFormData({...formData, type: e.target.value as any})}
                      >
                         <option value="MATERI">Materi / Sesi</option>
                         <option value="MAKAN">Konsumsi / Makan</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Judul/Nama Kegiatan</label>
                      <input className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold" onChange={e => setFormData({...formData, nama_event: e.target.value})} placeholder="Ex: Sesi Pleno 01" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Tanggal Pelaksanaan</label>
                      <input type="date" className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold" onChange={e => setFormData({...formData, tanggal_event: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Mulai</label>
                         <input type="time" className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold" onChange={e => setFormData({...formData, jam_mulai_event: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Selesai</label>
                         <input type="time" className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold" onChange={e => setFormData({...formData, jam_selesai: e.target.value})} />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Ringkasan Deskripsi</label>
                      <textarea rows={3} className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold resize-none text-sm" onChange={e => setFormData({...formData, deskripsi: e.target.value})} placeholder="Berikan detail singkat acara..." />
                   </div>
                </div>
                <div className="mt-8 flex gap-3 text-center">
                   <button 
                     disabled={isSaving}
                     onClick={handleSave} 
                     className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                     {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                     {isSaving ? 'Menyimpan...' : 'Simpan'}
                   </button>
                   <button disabled={isSaving} onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]">Batal</button>
                </div>
             </div>
          </div>
       )}
    </div>
  );
}

function AttendanceAnalysis({ 
  peserta, 
  events, 
  attendance,
  syncData,
  isSyncing
}: { 
  peserta: Peserta[]; 
  events: Event[]; 
  attendance: Attendance[];
  syncData: () => Promise<void>;
  isSyncing: boolean;
}) {
   const [selectedEventId, setSelectedEventId] = useState('');
   const [filterKelompok, setFilterKelompok] = useState('');
   const [filterDesa, setFilterDesa] = useState('');
   const [filterType, setFilterType] = useState<'MATERI' | 'MAKAN'>('MATERI');

   useEffect(() => {
      if (selectedEventId) {
         const ev = events.find(e => e.id === selectedEventId);
         if (ev?.type) {
            setFilterType(ev.type);
         }
      }
   }, [selectedEventId, events]);

   const filteredPeserta = peserta.filter(p => {
      const matchesKelompok = filterKelompok === '' || p.kelompok === filterKelompok;
      const matchesDesa = filterDesa === '' || p.desa === filterDesa;
      return matchesKelompok && matchesDesa;
   });

   const attendanceRecords = attendance.filter(a => {
      const matchesEvent = selectedEventId === '' || String(a.eventId).trim() === String(selectedEventId).trim();
      const matchesType = String(a.type).trim().toUpperCase() === String(filterType).trim().toUpperCase();
      return matchesEvent && matchesType;
   });

   const exportToPDF = () => {
      const doc = new jsPDF();
      const event = events.find(e => e.id === selectedEventId);
      const eventName = event?.nama_event || 'Semua Kegiatan';
      const eventDate = event?.tanggal_event || '-';
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text('LAPORAN KEHADIRAN', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Event: ${eventName}`, 14, 32);
      doc.text(`Tanggal: ${formatDate(eventDate)}`, 14, 37);
      doc.text(`Tipe Absen: ${filterType}`, 14, 42);
      doc.text(`Filter Kelompok: ${filterKelompok || 'Semua Kelompok'}`, 14, 47);
      doc.text(`Filter Desa: ${filterDesa || 'Semua Desa'}`, 14, 52);
      doc.text(`Dicetak pada: ${formatDateTime(new Date())}`, 14, 57);
      
      // Stats
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.text(`Total Peserta: ${stats.total} | Hadir: ${stats.hadir} | Belum: ${stats.belum}`, 14, 67);

      const tableData = filteredPeserta.map((p, index) => {
         const record = attendanceRecords.find(a => String(a.pesertaId).trim() === String(p.id).trim());
         return [
            index + 1,
            p.id,
            p.nama_lengkap,
            p.jenis_kelamin,
            `${p.kelompok} / ${p.desa}`,
            record ? 'TERVERIFIKASI' : 'BELUM ABSEN',
            record ? formatDateTime(record.timestamp) : '-'
         ];
      });

      autoTable(doc, {
         startY: 72,
         head: [['No', 'ID', 'Nama Lengkap', 'Gender', 'Asal', 'Status', 'Waktu Scan']],
         body: tableData,
         theme: 'grid',
         headStyles: { fillColor: [79, 70, 229], fontSize: 9, fontStyle: 'bold' },
         columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 20 },
            5: { fontStyle: 'bold' }
         },
         styles: { fontSize: 8, cellPadding: 3 },
         didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 5) {
               if (data.cell.text[0] === 'TERVERIFIKASI') {
                  data.cell.styles.textColor = [22, 163, 74]; // Green-600
               } else {
                  data.cell.styles.textColor = [220, 38, 38]; // Red-600
               }
            }
         }
      });

      doc.save(`Laporan_Absensi_${eventName.replace(/\s+/g, '_')}_${filterType}.pdf`);
   };

   const stats = {
      total: filteredPeserta.length,
      hadir: filteredPeserta.filter(p => attendanceRecords.some(a => String(a.pesertaId).trim() === String(p.id).trim())).length,
      belum: filteredPeserta.filter(p => !attendanceRecords.some(a => String(a.pesertaId).trim() === String(p.id).trim())).length,
      hadirL: filteredPeserta.filter(p => p.jenis_kelamin === 'Laki-laki' && attendanceRecords.some(a => String(a.pesertaId).trim() === String(p.id).trim())).length,
      hadirP: filteredPeserta.filter(p => p.jenis_kelamin === 'Perempuan' && attendanceRecords.some(a => String(a.pesertaId).trim() === String(p.id).trim())).length,
      belumL: filteredPeserta.filter(p => p.jenis_kelamin === 'Laki-laki' && !attendanceRecords.some(a => String(a.pesertaId).trim() === String(p.id).trim())).length,
      belumP: filteredPeserta.filter(p => p.jenis_kelamin === 'Perempuan' && !attendanceRecords.some(a => String(a.pesertaId).trim() === String(p.id).trim())).length,
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                     <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-800">Analisa Kehadiran Peserta</h3>
               </div>
               <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                     onClick={syncData}
                     className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-emerald-600 border border-emerald-100 font-bold text-xs uppercase rounded-xl hover:bg-emerald-50 transition-all shadow-sm"
                  >
                     <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                     {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                  </button>
                  <button 
                     onClick={exportToPDF}
                     className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-xs uppercase rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                     <Download className="w-4 h-4" /> Export PDF
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Materi/Kegiatan</label>
                  <div className="relative">
                     <select 
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                     >
                        <option value="">Semua Kegiatan</option>
                        {events.map(ev => (
                           <option key={ev.id} value={ev.id}>{ev.nama_event}</option>
                        ))}
                     </select>
                     <Calendar className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tipe Absen</label>
                  <div className="relative">
                     <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                     >
                        <option value="MATERI">Materi</option>
                        <option value="MAKAN">Makan</option>
                     </select>
                     <Clock className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Filter Kelompok</label>
                  <div className="relative">
                     <select 
                        value={filterKelompok}
                        onChange={(e) => setFilterKelompok(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                     >
                        <option value="">Semua Kelompok</option>
                        {Array.from(new Set(peserta.map(p => p.kelompok))).filter(Boolean).sort().map(k => (
                           <option key={k} value={k}>{k}</option>
                        ))}
                     </select>
                     <MapPin className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Filter Desa</label>
                  <div className="relative">
                     <select 
                        value={filterDesa}
                        onChange={(e) => setFilterDesa(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                     >
                        <option value="">Semua Desa</option>
                        {Array.from(new Set(peserta.map(p => p.desa))).filter(Boolean).sort().map(d => (
                           <option key={d} value={d}>{d}</option>
                        ))}
                     </select>
                     <MapPin className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Hadir (L)</p>
                  <p className="text-2xl font-black text-emerald-700">{stats.hadirL}</p>
                  <p className="text-[9px] font-bold text-emerald-300 uppercase mt-1">Laki-laki</p>
               </div>
               <div className="p-5 bg-pink-50 border border-pink-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1">Hadir (P)</p>
                  <p className="text-2xl font-black text-pink-700">{stats.hadirP}</p>
                  <p className="text-[9px] font-bold text-pink-300 uppercase mt-1">Perempuan</p>
               </div>
               <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Belum (L)</p>
                  <p className="text-2xl font-black text-amber-700">{stats.belumL}</p>
                  <p className="text-[9px] font-bold text-amber-300 uppercase mt-1">Belum Absen</p>
               </div>
               <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Belum (P)</p>
                  <p className="text-2xl font-black text-slate-700">{stats.belumP}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Belum Absen</p>
               </div>
            </div>
         </div>

         <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-slate-50">
               {filteredPeserta.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">Data tidak ditemukan</div>
               ) : (
                  filteredPeserta.map(p => {
                     const record = attendanceRecords.find(a => String(a.pesertaId).trim() === String(p.id).trim());
                     return (
                        <div key={p.id} className="p-5 space-y-4">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="font-bold text-slate-800 text-sm uppercase">{p.nama_lengkap}</p>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">ID: {p.id} &bull; {p.jenis_kelamin}</p>
                              </div>
                              <span className={cn(
                                 "text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border",
                                 record ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                              )}>
                                 {record ? 'Hadir' : 'Belum'}
                              </span>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                              <p className="text-xs font-bold text-slate-600">{p.kelompok} &bull; DS. {p.desa}</p>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>

            {/* Desktop Table */}
            <table className="w-full text-left hidden md:table">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 tracking-widest">
                     <th className="px-8 py-4">Nama Peserta</th>
                     <th className="px-8 py-4">Gender</th>
                     <th className="px-8 py-4">Kelompok / Desa</th>
                     <th className="px-8 py-4 text-center">Status Kehadiran</th>
                     <th className="px-8 py-4 text-right">Waktu Scan</th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {filteredPeserta.map(p => {
                     const record = attendanceRecords.find(a => String(a.pesertaId).trim() === String(p.id).trim());
                     return (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                           <td className="px-8 py-5">
                              <p className="font-bold text-slate-700">{p.nama_lengkap}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {p.id}</p>
                           </td>
                           <td className="px-8 py-5 text-slate-500 font-medium">{p.jenis_kelamin}</td>
                           <td className="px-8 py-5">
                              <p className="font-bold text-slate-600">{p.kelompok}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DS. {p.desa}</p>
                           </td>
                           <td className="px-8 py-5 text-center">
                              <span className={cn(
                                 "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                 record ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                              )}>
                                 {record ? 'Terverifikasi' : 'Belum Absen'}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right font-mono text-xs text-slate-400">
                              {record ? formatDateTime(record.timestamp) : '-'}
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
   );
}

function ManageStaff({ 
  users, 
  setUsers 
}: { 
  users: User[]; 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}) {
   const [formData, setFormData] = useState<Partial<User>>({ level: 'PANITIA' });
   const [isAdding, setIsAdding] = useState(false);
   const [showPassword, setShowPassword] = useState(false);

   const [isSaving, setIsSaving] = useState(false);

   const handleSave = async () => {
      setIsSaving(true);
      try {
         const newUser = { ...formData, id: `U${Date.now()}` } as User;
         const newList = [...users, newUser];
         const result = await db.setUsers(newList, 'create', newUser);
         
         if (!result.success) {
            alert("Staff saved locally, but failed to sync to Spreadsheet: " + result.error);
         }
         
         setUsers(newList);
         setIsAdding(false);
         setFormData({ level: 'PANITIA' });
      } finally {
         setIsSaving(false);
      }
   };

   const deleteUser = (id: string) => {
      if (confirm('Hapus user ini?')) {
         const newList = users.filter(u => u.id !== id);
         db.setUsers(newList, 'delete', { id });
         setUsers(newList);
      }
   }

   return (
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold flex items-center gap-3 text-slate-800">
               <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                 <ShieldCheck className="w-5 h-5" />
               </div>
               Akses Staff & Panitia
            </h3>
            <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl shadow-md shadow-emerald-500/10 transition-all hover:bg-emerald-700">
               <Plus className="w-4 h-4" /> Registrasi User
            </button>
         </div>

         <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-2xl shadow-sm">
            {/* Mobile Card List */}
            <div className="block md:hidden divide-y divide-slate-50">
               {users.map(u => (
                  <div key={u.id} className="p-5 flex justify-between items-center">
                     <div>
                        <p className="font-bold text-slate-700 text-sm tracking-tight">{u.username}</p>
                        <div className="mt-2 text-left">
                           <span className={cn(
                              "text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border tracking-widest",
                              u.level === 'ADMIN' ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                           )}>{u.level}</span>
                        </div>
                     </div>
                     <div>
                        {u.username !== 'admin' && (
                           <button onClick={() => deleteUser(u.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 shadow-sm shadow-red-500/5">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        )}
                     </div>
                  </div>
               ))}
            </div>

            {/* Desktop Table */}
            <table className="w-full text-left hidden md:table">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 tracking-widest">
                     <th className="px-8 py-4">Username Akun</th>
                     <th className="px-8 py-4 text-center">Level Otoritas</th>
                     <th className="px-8 py-4 text-right">Manajemen</th>
                  </tr>
               </thead>
               <tbody>
                  {users.map(u => (
                     <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-8 py-5 font-bold text-slate-700">{u.username}</td>
                        <td className="px-8 py-5 text-center">
                           <span className={cn(
                              "text-[10px] font-bold uppercase px-3 py-1 rounded-full border tracking-wider",
                              u.level === 'ADMIN' ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                           )}>{u.level}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           {u.username !== 'admin' && (
                              <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {isAdding && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 shadow-2xl max-w-sm w-full border border-white/20 animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full mb-8 mx-auto"></div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-8 text-center uppercase tracking-tighter flex items-center justify-center gap-3">
                     <div className="p-2 bg-emerald-600 rounded-xl text-white">
                       <ShieldCheck className="w-5 h-5" />
                     </div>
                     Tambah User Baru
                  </h3>
                  <div className="space-y-5">
                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Username Akun</label>
                        <input className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 font-semibold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white" onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Masukkan username..." />
                     </div>
                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Password</label>
                        <div className="relative">
                           <input 
                              className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 font-semibold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white pr-12" 
                              onChange={e => setFormData({...formData, password: e.target.value})} 
                              placeholder="Buat password..." 
                              type={showPassword ? "text" : "password"} 
                           />
                           <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                           >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                           </button>
                        </div>
                     </div>
                     <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Level Akses</label>
                        <select className="w-full p-3.5 border border-slate-100 rounded-2xl outline-none bg-slate-50 font-bold focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all focus:bg-white appearance-none" onChange={e => setFormData({...formData, level: e.target.value as any})}>
                           <option value="PANITIA">PANITIA (Operator Scan)</option>
                           <option value="ADMIN">ADMINISTRATOR</option>
                        </select>
                     </div>
                  </div>
                  <div className="mt-8 flex gap-3 text-center">
                     <button 
                        disabled={isSaving}
                        onClick={handleSave} 
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {isSaving && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {isSaving ? 'Mendaftarkan...' : 'Daftarkan'}
                     </button>
                     <button disabled={isSaving} onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 active:scale-[0.98] transition-all">Batal</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
