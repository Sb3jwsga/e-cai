/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { LogIn, QrCode, ShieldCheck, Users, RefreshCw, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [cloudError, setCloudError] = useState<string | null>(null);

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    const initialSync = async () => {
      setSyncStatus('SYNCING');
      setIsSyncing(true);
      const res = await pullFromSpreadsheet();
      setIsSyncing(false);
      
      if (res && (res as any).success) {
        setSyncStatus('SUCCESS');
        setCloudError(null);
      } else {
        setSyncStatus('ERROR');
        setCloudError((res as any)?.error || 'Unknown sync error');
      }
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
      setError(`Username atau password salah. Pastikan data sudah benar. (Username input: "${username}")`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 flex items-center justify-center overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Logo CAI" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.fallback-icon')) {
                  const div = document.createElement('div');
                  div.className = "fallback-icon p-4 bg-emerald-600 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                  div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qrcode text-white"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>';
                  parent.appendChild(div);
                }
              }}
            />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-center text-slate-800 tracking-tight text-emerald-700">E-CAI Pelaihari</h1>
        <p className="mb-6 text-sm text-center text-slate-500">Sistem Presensi QR Code Terintegrasi</p>

        <div className={cn(
          "flex items-center justify-center gap-2 mb-2 py-1.5 px-3 rounded-full border text-[10px] font-bold uppercase tracking-wider mx-auto w-fit transition-all",
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

        {cloudError && (
          <div className="mb-6 mx-auto w-fit max-w-[280px] text-[9px] text-center text-amber-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100 break-all">
            <span className="font-bold block mb-1">DATA ERROR:</span>
            {cloudError}
          </div>
        )}

        <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setMode('STAFF'); setScanning(false); setError(''); }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all font-semibold text-sm",
              mode === 'STAFF' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Panitia</span>
          </button>
          <button
            onClick={() => { setMode('PESERTA'); setError(''); }}
            className={cn(
              "flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all font-semibold text-sm",
              mode === 'PESERTA' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                className="text-emerald-600 hover:underline text-left mt-1 text-[10px]"
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
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                placeholder="Masukkan Username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all pr-12"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
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
            <button
              type="submit"
              disabled={isSyncing}
              className={cn(
                "w-full py-4 mt-6 font-bold text-white rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2",
                isSyncing 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_15px_rgba(16,185,129,0.3)]"
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
                className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="p-4 bg-slate-100 rounded-2xl mb-4 group-hover:bg-emerald-100 transition-colors">
                  <QrCode className="w-8 h-8 text-slate-400 group-hover:text-emerald-600" />
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
        Powered by Ubaidillah Dev - PPG Pelaihari<br/>
        Secure Event Management System &copy; 2026
      </div>
    </div>
  );
}

function ScannerWrapper({ onScanSuccess, onError }: { onScanSuccess: (data: string) => void, onError: (err: string) => void }) {
  const [retry, setRetry] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    const elementId = "reader";
    
    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(elementId);
        
        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Try to start with back camera
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Silence noisy failures
          }
        );
        setIsStarted(true);
      } catch (err) {
        console.error("Scanner Error:", err);
        // Fallback for some browsers that don't support constraints
        try {
          if (html5QrCode) {
            await html5QrCode.start(
              { facingMode: "user" }, // Try front camera if back fails
              { fps: 15, qrbox: { width: 250, height: 250 } },
              onScanSuccess,
              () => {}
            );
            setIsStarted(true);
          }
        } catch (innerErr) {
          onError(String(innerErr));
        }
      }
    };

    // Delay initialization
    const timer = setTimeout(() => {
      startScanner();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(err => console.log("Stop error handled"));
      }
    };
  }, [onScanSuccess, onError, retry]);

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl overflow-hidden border-2 border-emerald-500/20 bg-slate-900 aspect-square flex items-center justify-center shadow-xl shadow-emerald-500/5">
        <div id="reader" className="w-full h-full [&_video]:rounded-3xl [&_video]:object-cover border-none!"></div>
        {!isStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-white font-bold text-xs uppercase tracking-widest">Inisialisasi Kamera...</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 border-[12px] border-emerald-500/5 pointer-events-none z-10"></div>
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse z-20 pointer-events-none opacity-40"></div>
      </div>
      <button 
        onClick={() => setRetry(prev => prev + 1)}
        className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-3 h-3" /> Muat Ulang Kamera
      </button>
    </div>
  );
}
