/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Peserta as PesertaType, UserLevel } from './types';
import { db } from './lib/db';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PanitiaDashboard from './pages/PanitiaDashboard';
import PesertaDashboard from './pages/PesertaDashboard';

export type AuthState = {
  user: User | null;
  peserta: PesertaType | null;
  level: UserLevel | 'GUEST';
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    peserta: null,
    level: 'GUEST',
  });

  // Load from session storage for persistence within tab session
  useEffect(() => {
    const saved = sessionStorage.getItem('event_auth');
    if (saved) {
      setAuth(JSON.parse(saved));
    }
  }, []);

  const handleLogin = (data: AuthState) => {
    setAuth(data);
    sessionStorage.setItem('event_auth', JSON.stringify(data));
  };

  const handleLogout = () => {
    const defaultAuth: AuthState = { user: null, peserta: null, level: 'GUEST' };
    setAuth(defaultAuth);
    sessionStorage.removeItem('event_auth');
  };

  const renderContent = () => {
    if (auth.level === 'ADMIN') {
      return <AdminDashboard user={auth.user!} onLogout={handleLogout} />;
    }
    if (auth.level === 'PANITIA') {
      return <PanitiaDashboard user={auth.user!} onLogout={handleLogout} />;
    }
    if (auth.level === 'PESERTA') {
      return <PesertaDashboard peserta={auth.peserta!} onLogout={handleLogout} />;
    }
    return <LoginPage onLogin={handleLogin} />;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#141414] font-sans">
      {renderContent()}
    </div>
  );
}

