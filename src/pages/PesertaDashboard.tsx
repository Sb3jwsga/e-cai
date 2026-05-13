/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Peserta, Event, Attendance } from '../types';
import { db } from '../lib/db';
import DashboardLayout from '../components/DashboardLayout';
import { Calendar, User as UserIcon, CheckCircle2, Circle, Clock, QrCode, AlertCircle } from 'lucide-react';
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

interface PesertaDashboardProps {
  peserta: Peserta;
  onLogout: () => void;
}

export default function PesertaDashboard({ peserta, onLogout }: PesertaDashboardProps) {
  const [activeTab, setActiveTab] = useState('STATUS');
  const [events, setEvents] = useState<Event[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    setEvents(db.getEvents());
    setAttendance(db.getAttendance().filter(a => a.pesertaId === peserta.id));
  }, [peserta.id]);

  const tabs = [
    { id: 'STATUS', label: 'Status Absensi', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'JADWAL', label: 'Jadwal Acara', icon: <Calendar className="w-4 h-4" /> },
    { id: 'PROFILE', label: 'Profil Saya', icon: <UserIcon className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout
      title={activeTab === 'STATUS' ? 'KEHADIRAN SAYA' : activeTab}
      role="PESERTA"
      userName={peserta.nama_lengkap}
      onLogout={onLogout}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={tabs}
    >
      {activeTab === 'STATUS' && (
         <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-slate-900 text-white p-10 border-l-[12px] border-emerald-600 rounded-3xl shadow-sm relative overflow-hidden">
               <QrCode className="absolute bottom-[-10%] right-[-5%] w-64 h-64 opacity-5 rotate-12" />
               <div className="relative z-10">
                  <p className="text-xs font-bold uppercase text-emerald-400 mb-2 tracking-[0.2em]">Selamat Datang,</p>
                  <h2 className="text-4xl font-bold tracking-tight mb-4">{peserta.nama_lengkap}</h2>
                  <div className="flex flex-wrap gap-4 mt-8">
                     <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-bold uppercase border border-white/5 tracking-wider">
                        <span className="opacity-40">KELOMPOK:</span> {peserta.kelompok}
                     </div>
                     <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-bold uppercase border border-white/5 tracking-wider">
                        <span className="opacity-40">DESA:</span> {peserta.desa}
                     </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-7 space-y-6">
                  <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
                     <Clock className="w-5 h-5 text-emerald-600" /> Progress Presensi Sesi
                  </h3>
                  <div className="space-y-4">
                  {events.map(ev => {
                     const attendedMateri = attendance.find(a => a.eventId === ev.id && a.type === 'MATERI');
                     const attendedMakan = attendance.find(a => a.eventId === ev.id && a.type === 'MAKAN');
                     
                     return (
                        <div key={ev.id} className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm transition-all hover:shadow-md">
                           <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                              <div>
                                 <h4 className="font-bold text-slate-800 text-lg leading-tight uppercase tracking-tight">{ev.nama_event}</h4>
                                 <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase">{formatDate(ev.tanggal_event)}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">&bull; {formatTime24(ev.jam_mulai_event)} WIB</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <AttendanceStatus title="Kehadiran Materi" isPresent={!!attendedMateri} time={attendedMateri?.timestamp} />
                              <AttendanceStatus title="Pengambilan Makan" isPresent={!!attendedMakan} time={attendedMakan?.timestamp} />
                           </div>
                        </div>
                     );
                  })}
                  </div>
               </div>

               <div className="lg:col-span-5">
                  <div className="sticky top-8 flex flex-col items-center justify-center space-y-8 p-10 bg-white border border-slate-200 rounded-3xl shadow-sm">
                     <div className="w-full flex items-center justify-between border-b border-slate-100 pb-4">
                        <p className="font-bold text-xs text-slate-400 uppercase tracking-[0.2em]">IDENTITAS DIGITAL</p>
                        <QrCode className="w-4 h-4 text-slate-200" />
                     </div>
                     <div className="p-4 bg-white border-[8px] border-slate-900 rounded-2xl shadow-xl shadow-slate-200">
                        <QRCodeSVG value={peserta.id} size={200} level="H" />
                     </div>
                     <div className="text-center space-y-2">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">USER UNIQUE ID</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{peserta.id}</p>
                        <div className="mt-4 px-4 py-2 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase rounded-xl border border-slate-100 italic">
                          Tunjukkan kode di atas pada panitia scan
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {activeTab === 'JADWAL' && (
         <div className="space-y-8 max-w-2xl animate-in slide-in-from-right duration-500">
            <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Timeline Kegiatan</h3>
            <div className="space-y-4">
               {events.map((ev, idx) => (
                  <div key={ev.id} className="flex gap-8 group">
                     <div className="w-12 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 z-10 group-first:bg-emerald-600 group-first:text-white group-first:border-emerald-600 transition-all">
                           {idx + 1}
                        </div>
                        <div className="flex-1 w-0.5 bg-slate-100 group-last:hidden"></div>
                     </div>
                     <div className="flex-1 pb-12">
                        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-bold text-slate-800 tracking-tight uppercase leading-tight">{ev.nama_event}</h4>
                              <span className="text-[10px] font-bold bg-slate-900 text-white px-3 py-1 rounded-lg tracking-wider">{formatTime24(ev.jam_mulai_event)}</span>
                           </div>
                           <p className="text-sm text-slate-500 leading-relaxed font-medium">{ev.deskripsi_event}</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {activeTab === 'PROFILE' && (
         <div className="max-w-xl space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="bg-white border border-slate-200 p-10 rounded-3xl shadow-sm">
               <h3 className="font-bold text-2xl text-slate-800 mb-8 border-b border-slate-50 pb-6 tracking-tight">Data Profil Peserta</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <ProfileField label="Nama Lengkap" value={peserta.nama_lengkap} />
                  <ProfileField label="ID Peserta" value={peserta.id} />
                  <ProfileField label="Jenis Kelamin" value={peserta.jenis_kelamin} />
                  <ProfileField label="Kelompok" value={peserta.kelompok} />
                  <ProfileField label="Desa / Domisili" value={peserta.desa} />
                  <ProfileField label="Contact WhatsApp" value={peserta.nomer_whatsapp} />
               </div>
            </div>
            
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4">
               <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
               <div className="space-y-1">
                 <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Verifikasi Data</p>
                 <p className="text-sm text-emerald-600/80 font-medium leading-relaxed">
                   Jika terdapat ketidaksesuaian pada data profil Anda, silakan hubungi tim administrasi di meja pendaftaran untuk pemutakhiran data.
                 </p>
               </div>
            </div>
         </div>
      )}
    </DashboardLayout>
  );
}

function AttendanceStatus({ title, isPresent, time }: { title: string; isPresent: boolean, time?: string }) {
   return (
      <div className={cn(
         "p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all",
         isPresent 
           ? "border-green-100 bg-green-50/50 text-green-700 shadow-sm" 
           : "border-slate-100 bg-slate-50 text-slate-400"
      )}>
         <p className="text-[11px] font-bold uppercase mb-4 tracking-wider text-center">{title}</p>
         <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-sm mb-3",
            isPresent ? "bg-white text-green-600" : "bg-white text-slate-200"
         )}>
            {isPresent ? <CheckCircle2 className="w-8 h-8" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-100" />}
         </div>
         <p className="text-[11px] font-bold tracking-[0.1em]">
            {isPresent ? (time ? formatDateTime(time) : 'TERKONFIRMASI') : 'BELUM SCAN'}
         </p>
      </div>
   );
}

function ProfileField({ label, value }: { label: string; value: string }) {
   return (
      <div className="space-y-1">
         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</label>
         <p className="font-bold text-slate-800 text-lg tracking-tight pb-3 border-b border-slate-50">{value}</p>
      </div>
   );
}
