/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Peserta, Event, Attendance, AttendanceType } from '../types';
import { db, pullFromSpreadsheet } from '../lib/db';
import DashboardLayout from '../components/DashboardLayout';
import { Scan, Users, Calendar, CheckCircle2, XCircle, AlertCircle, QrCode, Clock, X, MapPin, RefreshCw } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { cn } from '../lib/utils';

interface PanitiaDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function PanitiaDashboard({ user, onLogout }: PanitiaDashboardProps) {
  const [activeTab, setActiveTab] = useState('SCAN');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scanType, setScanType] = useState<AttendanceType>('MATERI');
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: Peserta } | null>(null);
  const [isIframe, setIsIframe] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKelompok, setFilterKelompok] = useState('');
  const [filterDesa, setFilterDesa] = useState('');
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<Event | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = () => {
    const evs = db.getEvents();
    setEvents(evs);
    if (evs.length > 0 && !selectedEventId) setSelectedEventId(evs[0].id);
    setPeserta(db.getPeserta());
  };

  const syncData = async () => {
    setIsSyncing(true);
    try {
      await pullFromSpreadsheet();
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    loadData();
    syncData(); // Auto sync on mount
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find(e => e.id === selectedEventId);
      if (ev?.type) {
        setScanType(ev.type);
      }
    }
  }, [selectedEventId, events]);

  const tabs = [
    { id: 'SCAN', label: 'Scan QR', icon: <Scan className="w-4 h-4" /> },
    { id: 'PESERTA', label: 'Data Peserta', icon: <Users className="w-4 h-4" /> },
    { id: 'JADWAL', label: 'Jadwal Event', icon: <Calendar className="w-4 h-4" /> },
  ];

  const handleScanSuccess = (decodedText: string) => {
    setScannerError(null); 
    // Check if participant exists
    const p = peserta.find(pes => pes.id === decodedText);
    if (!p) {
      setScanResult({ success: false, message: 'Peserta tidak ditemukan!' });
      return;
    }

    // Check if already attended
    const attendance = db.getAttendance();
    const already = attendance.find(a => 
      a.eventId === selectedEventId && 
      a.pesertaId === decodedText && 
      a.type === scanType
    );
 
    if (already) {
      setScanResult({ 
        success: false, 
        message: `Peringatan: Peserta ini sudah melakukan absen ${scanType === 'MATERI' ? 'Materi' : 'Makan'} untuk event ini!`, 
        data: p 
      });
      return;
    }

    // Add attendance
    db.addAttendance({
      eventId: selectedEventId,
      pesertaId: decodedText,
      type: scanType,
      panitiaId: user.id
    });

    setScanResult({ 
      success: true, 
      message: `Berhasil Absen: ${scanType === 'MATERI' ? 'Sesi Materi' : 'Pengambilan Makan'}`, 
      data: p 
    });

    // Reset result after 3 seconds
    setTimeout(() => setScanResult(null), 3000);
  };

  const handleScanError = (err: string) => {
    console.error("Scanner Error:", err);
    if (err.toLowerCase().includes("notfound") || err.toLowerCase().includes("allowed") || err.toLowerCase().includes("permission")) {
       setScannerError("Kamera tidak dapat diakses. Pastikan izin kamera diberikan atau buka di tab baru jika masih gagal.");
    }
  };

  return (
    <DashboardLayout
      title={activeTab}
      role="PANITIA"
      userName={user.username}
      onLogout={onLogout}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    >
      {activeTab === 'SCAN' && (
        <div className="max-w-5xl mx-auto space-y-8">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Setup */}
            <div className="lg:col-span-5 space-y-6">
               <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-slate-800">
                  <h3 className="font-bold text-sm mb-6 flex items-center gap-2">
                     <AlertCircle className="w-4 h-4 text-emerald-600" /> KONFIGURASI SCAN
                  </h3>
                  <div className="space-y-5">
                     <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Pilih Event Aktif</label>
                        <select 
                          value={selectedEventId}
                          onChange={(e) => setSelectedEventId(e.target.value)}
                          className="w-full p-3.5 border border-slate-200 rounded-xl font-semibold outline-none bg-slate-50 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                        >
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>
                               [{ev.type || 'MATERI'}] {ev.nama_event}
                            </option>
                          ))}
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipe Absensi</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                           <button 
                             onClick={() => setScanType('MATERI')}
                             className={cn(
                               "flex-1 py-2.5 rounded-lg font-bold text-xs transition-all",
                               scanType === 'MATERI' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                             )}
                           >Materi</button>
                           <button 
                             onClick={() => setScanType('MAKAN')}
                             className={cn(
                               "flex-1 py-2.5 rounded-lg font-bold text-xs transition-all",
                               scanType === 'MAKAN' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                             )}
                           >Makan</button>
                        </div>
                     </div>
                  </div>
               </div>

               {scanResult && (
                  <div className={cn(
                    "p-6 border rounded-2xl shadow-sm transition-all animate-in slide-in-from-top-4 duration-300",
                    scanResult.success ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                  )}>
                     <div className="flex items-center gap-4 mb-4">
                        <div className={cn(
                           "w-12 h-12 rounded-full flex items-center justify-center shadow-sm",
                           scanResult.success ? "bg-white text-green-500" : "bg-white text-red-500"
                        )}>
                           {scanResult.success ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                        </div>
                        <div>
                           <p className={cn("font-bold text-lg leading-tight", scanResult.success ? "text-green-700" : "text-red-700")}>
                              {scanResult.success ? 'Berhasil Terdeteksi' : 'Gagal Verifikasi'}
                           </p>
                           <p className="text-xs text-slate-500 font-medium italic mt-0.5">{scanResult.message}</p>
                        </div>
                     </div>
                     {scanResult.data && (
                        <div className="border-t border-slate-200/50 mt-4 pt-4 flex items-center justify-between">
                           <div>
                              <p className="font-bold text-sm text-slate-800">{scanResult.data.nama_lengkap}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{scanResult.data.kelompok} &bull; {scanResult.data.desa}</p>
                           </div>
                           <div className="bg-white/50 px-2 py-1 rounded-lg border border-slate-100">
                              <p className="text-[10px] font-mono text-slate-500 uppercase">ID: {scanResult.data.id}</p>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Scanner Area */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-600">
                   <QrCode className="w-24 h-24" />
                </div>
                
                <div className="w-full max-w-sm aspect-square border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center relative p-2">
                   {/* Corners */}
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-600 rounded-tl-xl"></div>
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-600 rounded-tr-xl"></div>
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-600 rounded-bl-xl"></div>
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-600 rounded-br-xl"></div>
 
                   <div className="w-full h-full bg-slate-50 rounded-2xl overflow-hidden relative border border-slate-100 shadow-inner">
                      <ScannerComponent onScan={handleScanSuccess} onError={handleScanError} />
                      {scannerError && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-30 p-8 flex flex-col items-center justify-center text-center">
                          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                          <p className="text-white font-bold mb-2">Masalah Kamera</p>
                          <p className="text-slate-400 text-xs mb-6 leading-relaxed">{scannerError}</p>
                          {isIframe && (
                            <button 
                              onClick={() => window.open(window.location.href, '_blank')}
                              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                            >
                              Buka di Tab Baru
                            </button>
                          )}
                        </div>
                      )}
                      {/* Scanline */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10 pointer-events-none animate-pulse"></div>
                   </div>
                </div>

                <div className="mt-8 text-center">
                   <p className="text-lg font-bold text-slate-800">Ready to Scan</p>
                   <p className="text-sm text-slate-400 font-medium italic">Arahkan QR Code peserta ke dalam kotak di atas</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PESERTA' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* Header & Search Area */}
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <h3 className="font-bold flex items-center gap-3 text-slate-800">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <Users className="w-5 h-5" />
                    </div>
                    Monitoring Peserta
                 </h3>
                 <div className="relative w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="Cari Peserta / ID..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-xs font-semibold w-full md:w-64 bg-slate-50 focus:bg-white"
                    />
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                 </div>
              </div>

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-50 pt-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Pilih Materi/Event</label>
                    <div className="relative">
                       <select 
                          value={selectedEventId}
                          onChange={(e) => setSelectedEventId(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
                       >
                          {events.map(ev => (
                             <option key={ev.id} value={ev.id}>{ev.nama_event}</option>
                          ))}
                       </select>
                       <Calendar className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Tipe Absensi</label>
                    <div className="relative">
                       <select 
                          value={scanType}
                          onChange={(e) => setScanType(e.target.value as AttendanceType)}
                          className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
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
                          className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
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
                          className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-bold bg-slate-50 focus:bg-white appearance-none"
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

              {/* Stats Grid */}
              {(() => {
                 const attendanceRecords = db.getAttendance().filter(a => a.eventId === selectedEventId && a.type === scanType);
                 const statsCurrentFiltered = peserta.filter(p => {
                    const matchesSearch = p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
                    const matchesKelompok = filterKelompok === '' || p.kelompok === filterKelompok;
                    const matchesDesa = filterDesa === '' || p.desa === filterDesa;
                    return matchesSearch && matchesKelompok && matchesDesa;
                 });

                 const stats = {
                    hadirL: statsCurrentFiltered.filter(p => p.jenis_kelamin === 'Laki-laki' && attendanceRecords.some(a => a.pesertaId === p.id)).length,
                    hadirP: statsCurrentFiltered.filter(p => p.jenis_kelamin === 'Perempuan' && attendanceRecords.some(a => a.pesertaId === p.id)).length,
                    belumL: statsCurrentFiltered.filter(p => p.jenis_kelamin === 'Laki-laki' && !attendanceRecords.some(a => a.pesertaId === p.id)).length,
                    belumP: statsCurrentFiltered.filter(p => p.jenis_kelamin === 'Perempuan' && !attendanceRecords.some(a => a.pesertaId === p.id)).length,
                 };

                 return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
                       <div className="bg-emerald-50/50 border border-emerald-100/50 p-4 rounded-2xl">
                          <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Hadir (L)</p>
                          <p className="text-xl font-bold text-emerald-700">{stats.hadirL} <span className="text-[10px] text-emerald-300 font-medium">Orang</span></p>
                       </div>
                       <div className="bg-pink-50/50 border border-pink-100/50 p-4 rounded-2xl">
                          <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1">Hadir (P)</p>
                          <p className="text-xl font-bold text-pink-700">{stats.hadirP} <span className="text-[10px] text-pink-300 font-medium">Orang</span></p>
                       </div>
                       <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-2xl">
                          <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1">Belum (L)</p>
                          <p className="text-xl font-bold text-amber-700">{stats.belumL} <span className="text-[10px] text-amber-300 font-medium">Orang</span></p>
                       </div>
                       <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Belum (P)</p>
                          <p className="text-xl font-bold text-slate-700">{stats.belumP} <span className="text-[10px] text-slate-300 font-medium">Orang</span></p>
                       </div>
                    </div>
                 );
              })()}
           </div>
           
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              {/* Mobile Card List */}
              <div className="block md:hidden divide-y divide-slate-50">
                {(() => {
                   const filtered = peserta.filter(p => {
                      const matchesSearch = p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
                      const matchesKelompok = filterKelompok === '' || p.kelompok === filterKelompok;
                      const matchesDesa = filterDesa === '' || p.desa === filterDesa;
                      return matchesSearch && matchesKelompok && matchesDesa;
                   });

                   return filtered.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 italic">Peserta tidak ditemukan</div>
                   ) : (
                      filtered.map(p => {
                         const attendance = db.getAttendance().find(a => a.eventId === selectedEventId && a.pesertaId === p.id && a.type === scanType);
                         return (
                            <div key={p.id} className="p-5 space-y-4">
                               <div className="flex justify-between items-start">
                                  <div>
                                     <p className="font-bold text-slate-800 text-sm">{p.nama_lengkap}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {p.id} &bull; {p.jenis_kelamin}</p>
                                  </div>
                                  {attendance ? (
                                     <span className="bg-green-50 text-green-600 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border border-green-100">Terkonfirmasi</span>
                                  ) : (
                                     <span className="bg-slate-50 text-slate-300 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border border-slate-100">Belum Absen</span>
                                  )}
                               </div>
                               <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                                  <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                                     <MapPin className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Kelompok / Desa</p>
                                     <p className="text-xs font-bold text-slate-700">{p.kelompok} &bull; DS. {p.desa}</p>
                                  </div>
                               </div>
                            </div>
                         );
                      })
                   );
                })()}
              </div>

              {/* Desktop Table */}
              <table className="w-full text-left hidden md:table">
                 <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">
                       <th className="px-8 py-4">Data Peserta</th>
                       <th className="px-8 py-4">Asal / Kelompok</th>
                       <th className="px-8 py-4 text-center">Status {scanType}</th>
                    </tr>
                 </thead>
                 <tbody>
                    {peserta.filter(p => {
                       const matchesSearch = p.nama_lengkap.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
                       const matchesKelompok = filterKelompok === '' || p.kelompok === filterKelompok;
                       const matchesDesa = filterDesa === '' || p.desa === filterDesa;
                       return matchesSearch && matchesKelompok && matchesDesa;
                    }).map(p => {
                       const attendance = db.getAttendance().find(a => a.eventId === selectedEventId && a.pesertaId === p.id && a.type === scanType);
                       return (
                          <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                             <td className="px-8 py-5">
                                <p className="font-bold text-slate-800 leading-tight">{p.nama_lengkap}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">ID: {p.id} &bull; {p.jenis_kelamin}</p>
                             </td>
                             <td className="px-8 py-5">
                                <p className="font-bold text-slate-700">{p.kelompok}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Desa {p.desa}</p>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex justify-center">
                                   {attendance ? (
                                      <span className="bg-green-50 text-green-600 text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-green-100 tracking-wider">Terkonfirmasi</span>
                                   ) : (
                                      <span className="bg-slate-50 text-slate-300 text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-slate-100 tracking-wider">Belum Barcode</span>
                                   )}
                                </div>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'JADWAL' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold flex items-center gap-3 text-slate-800">
                 <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                   <Calendar className="w-5 h-5" />
                 </div>
                 Agenda & Jadwal Sesi
              </h3>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => (
                <div key={ev.id} className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all group">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{ev.tanggal_event}</span>
                  </div>
                  <h4 className="font-bold text-lg text-slate-800 uppercase mb-3 tracking-tight leading-tight">{ev.nama_event}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-6">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    {ev.jam_mulai_event} - {ev.jam_selesai_event} WIB
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Status: Publik</span>
                    <button 
                      onClick={() => setSelectedDetailEvent(ev)}
                      className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest hover:underline px-2 py-1"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}
      {selectedDetailEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 shadow-2xl max-w-lg w-full border border-white/20 animate-in slide-in-from-bottom-8 duration-300 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-8">
                 <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                   <Calendar className="w-6 h-6" />
                 </div>
                 <button onClick={() => setSelectedDetailEvent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              
              <div className="space-y-6">
                 <div>
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2 block">{selectedDetailEvent.tanggal_event}</span>
                   <h3 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">{selectedDetailEvent.nama_event}</h3>
                 </div>

                 <div className="flex items-center gap-6 py-4 border-y border-slate-50">
                   <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-600">{selectedDetailEvent.jam_mulai_event} - {selectedDetailEvent.jam_selesai_event} WIB</span>
                   </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deskripsi Kegiatan</p>
                    <p className="text-slate-600 leading-relaxed font-medium italic">
                      {selectedDetailEvent.deskripsi_event || 'Tidak ada deskripsi tambahan untuk kegiatan ini.'}
                    </p>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => setSelectedDetailEvent(null)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all active:scale-[0.98]"
                    >
                      Tutup Detail
                    </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </DashboardLayout>
  );
}

function ScannerComponent({ onScan, onError }: { onScan: (text: string) => void, onError?: (err: string) => void }) {
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
 
    const timer = setTimeout(() => {
      try {
        const scannerConfig = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          rememberLastUsedCamera: true,
          supportedScanTypes: [0] // Camera only
        };
 
        scanner = new Html5QrcodeScanner(
          "reader-panitia",
          scannerConfig,
          /* verbose= */ false
        );
 
        scanner.render(
          (text) => {
            onScan(text);
          },
          (err) => {
            // Silence noisy per-frame failures
          }
        );
      } catch (err) {
        console.error("Scanner initialization failed:", err);
        if (onError) onError(String(err));
      }
    }, 500);
 
    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => console.warn("Scanner cleanup warning:", e));
      }
    };
  }, [onScan, onError, retry]);
 
  return (
    <div className="w-full space-y-4">
      <div id="reader-panitia" className="w-full bg-slate-900 rounded-[2rem] overflow-hidden [&_video]:rounded-[2rem] [&_img]:hidden border-none! [&_#html5-qrcode-button-camera-permission]:bg-emerald-600 [&_#html5-qrcode-button-camera-permission]:text-white [&_#html5-qrcode-button-camera-permission]:px-6 [&_#html5-qrcode-button-camera-permission]:py-3 [&_#html5-qrcode-button-camera-permission]:rounded-xl [&_#html5-qrcode-button-camera-permission]:font-bold [&_#html5-qrcode-button-camera-permission]:text-xs [&_#html5-qrcode-button-camera-permission]:uppercase [&_#html5-qrcode-button-camera-permission]:tracking-widest [&_#html5-qrcode-anchor-scan-type-change]:hidden"></div>
      <button 
        onClick={() => setRetry(prev => prev + 1)}
        className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-3 h-3" /> Muat Ulang Kamera
      </button>
    </div>
  );
}
