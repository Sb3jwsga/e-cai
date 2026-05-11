/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { LogIn, QrCode, ShieldCheck, Users, RefreshCw } from 'lucide-react';
import { AuthState } from '../App';
import { db, pullFromSpreadsheet } from '../lib/db';
import { cn } from '../lib/utils';

interface LoginPageProps {
  onLogin: (data: AuthState) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'STAFF' | 'PESERTA'>('STAFF');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    const initialSync = async () => {
      if (!import.meta.env.VITE_APPSCRIPT_URL) {
        setSyncStatus('ERROR');
        return;
      }
      setSyncStatus('SYNCING');
      setIsSyncing(true);
      const res = await pullFromSpreadsheet();
      setIsSyncing(false);
      setSyncStatus(res ? 'SUCCESS' : 'ERROR');
    };
    initialSync();
  }, []);

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    
    // Debug available users in console
    console.log('Attempting login. Available users:', users.map(u => u.username));

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const found = users.find(u => 
      u.username.toLowerCase().trim() === cleanUsername && 
      u.password.trim() === cleanPassword
    );

    if (found) {
      onLogin({
        user: found,
        peserta: null,
        level: found.level
      });
    } else {
      setError(`Username atau password salah. Pastikan data di spreadsheet sudah benar. (Username input: "${username}")`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            <QrCode className="w-10 h-10 text-white" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-center text-slate-800 tracking-tight">EventScan Pro</h1>
        <p className="mb-6 text-sm text-center text-slate-500">Sistem Presensi QR Code Terintegrasi</p>

        <div className={cn(
          "flex items-center justify-center gap-2 mb-6 py-1.5 px-3 rounded-full border text-[10px] font-bold uppercase tracking-wider mx-auto w-fit transition-all",
          syncStatus === 'SUCCESS' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
          syncStatus === 'ERROR' ? "bg-amber-50 text-amber-600 border-amber-100 cursor-pointer hover:bg-amber-100" :
          "bg-slate-50 text-slate-400 border-slate-100"
        )}
        onClick={() => syncStatus === 'ERROR' && window.location.reload()}
        >
          <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
          {syncStatus === 'SUCCESS' ? 'Cloud Data Synced' : 
           syncStatus === 'ERROR' ? 'Sync Failed (Click to Retry)' :
           'Connecting to Cloud...'}
        </div>

        <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setMode('STAFF'); setScanning(false); setError(''); }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all font-semibold text-sm",
              mode === 'STAFF' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Panitia</span>
          </button>
          <button
            onClick={() => { setMode('PESERTA'); setError(''); }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all font-semibold text-sm",
              mode === 'PESERTA' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users className="w-4 h-4" />
            <span>Peserta</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-6 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              {error}
            </div>
            {error.toLowerCase().includes('kamera') && isIframe && (
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="text-indigo-600 hover:underline text-left mt-1 text-[10px]"
              >
                Klik di sini untuk buka di Tab Baru →
              </button>
            )}
          </div>
        )}

        {mode === 'STAFF' ? (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="Ex: admin_01"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSyncing}
              className={cn(
                "w-full py-4 mt-6 font-bold text-white rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                isSyncing 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_15px_rgba(79,70,229,0.3)]"
              )}
            >
              {isSyncing && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isSyncing ? 'Sinkronisasi Data...' : 'Log In Sekarang'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {!scanning ? (
              <button
                onClick={() => setScanning(true)}
                className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="p-4 bg-slate-100 rounded-2xl mb-4 group-hover:bg-indigo-100 transition-colors">
                  <QrCode className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="font-bold text-slate-800">Mulai Scan QR</span>
                <span className="text-xs mt-1 text-slate-400 italic">Gunakan kamera untuk login</span>
              </button>
            ) : (
              <ScannerWrapper 
                onScanSuccess={(decodedText) => {
                  const pesertaList = db.getPeserta();
                  const found = pesertaList.find(p => p.id === decodedText);
                  if (found) {
                    setScanning(false);
                    onLogin({ user: null, peserta: found, level: 'PESERTA' });
                  } else {
                    setError('QR Code tidak valid atau peserta tidak terdaftar');
                  }
                }}
                onError={(err) => {
                  setError('Kamera tidak terdeteksi atau izin akses ditolak. Harap beri izin kamera atau buka di tab baru.');
                }}
              />
            )}
            
            {scanning && (
              <button
                onClick={() => setScanning(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Ganti Metode Login
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
        Powered by Google AI Studio Technology<br/>
        Secure Event Management System &copy; 2024
      </div>
    </div>
  );
}

function ScannerWrapper({ onScanSuccess, onError }: { onScanSuccess: (data: string) => void, onError: (err: string) => void }) {
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          (text) => onScanSuccess(text),
          (err) => { /* ignore per-frame failures */ }
        );
      } catch (err) {
        onError(String(err));
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => console.log("Cleanup silent"));
      }
    };
  }, [onScanSuccess, onError]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-square flex items-center justify-center">
      <div id="reader" className="w-full"></div>
      <div className="absolute inset-0 border-4 border-indigo-500/30 pointer-events-none z-10"></div>
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.8)] animate-pulse z-10 p-0"></div>
    </div>
  );
}
