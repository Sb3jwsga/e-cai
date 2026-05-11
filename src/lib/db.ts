/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Peserta, Event, Attendance } from '../types';

const STORAGE_KEYS = {
  USERS: 'event_qr_users',
  PESERTA: 'event_qr_peserta',
  EVENTS: 'event_qr_events',
  ATTENDANCE: 'event_qr_attendance'
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Sync Helper for Google Sheets
export const syncToSpreadsheet = async (table: string, action: 'create' | 'update' | 'delete', data: any) => {
  const url = import.meta.env.VITE_APPSCRIPT_URL;
  if (!url) return { success: false, error: 'URL Apps Script belum diatur.' };

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, table, data })
    });
    return { success: true };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, error: String(error) };
  }
};

export const pullFromSpreadsheet = async () => {
  const url = import.meta.env.VITE_APPSCRIPT_URL;
  if (!url) {
    console.warn('VITE_APPSCRIPT_URL is missing. Please check your .env file.');
    return null;
  }

  console.log('Attempting to pull data from:', url);

  try {
    const response = await fetch(`${url}?action=readAll`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Cloud data received:', Object.keys(data));
    
    // Convert all values to string and keys to lowercase to avoid comparison issues
    const sanitize = (list: any[]) => {
      if (!list || !Array.isArray(list)) return [];
      return list.map(item => {
        const newItem: any = {};
        Object.keys(item).forEach(key => {
          newItem[key.toLowerCase().trim()] = item[key] !== null && item[key] !== undefined ? String(item[key]) : '';
        });
        return newItem;
      });
    };

    if (data.users && Array.isArray(data.users)) {
      db.setUsers(sanitize(data.users));
    }
    if (data.peserta && Array.isArray(data.peserta)) {
      db.setPeserta(sanitize(data.peserta));
    }
    if (data.events && Array.isArray(data.events)) {
      db.setEvents(sanitize(data.events));
    }
    if (data.attendance && Array.isArray(data.attendance)) {
      db.setAttendance(sanitize(data.attendance));
    }
    
    return data;
  } catch (error) {
    console.error('Pull Error Details:', error);
    return null;
  }
};

// Initial Data
const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', level: 'ADMIN' },
  { id: '2', username: 'panitia', password: '123', level: 'PANITIA' }
];

const INITIAL_EVENTS: Event[] = [
  {
    id: 'e1',
    nama_event: 'Sesi Pembukaan',
    tanggal_event: '2024-06-01',
    jam_mulai_event: '08:00',
    jam_selesai_event: '10:00',
    deskripsi_event: 'Pembukaan acara dan pengenalan panitia.',
    type: 'MATERI'
  }
];

const INITIAL_PESERTA: Peserta[] = [
  {
    id: 'P001',
    nama_lengkap: 'Budi Santoso',
    jenis_kelamin: 'Laki-laki',
    nomer_whatsapp: '08123456789',
    kelompok: 'Kelompok A',
    desa: 'Desa Maju'
  }
];

export const db = {
  getUsers: () => getFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS),
  setUsers: (users: User[], action?: 'create' | 'update' | 'delete', data?: any) => {
    saveToStorage(STORAGE_KEYS.USERS, users);
    if (action && data) syncToSpreadsheet('users', action, data);
  },
  
  getPeserta: () => getFromStorage<Peserta[]>(STORAGE_KEYS.PESERTA, INITIAL_PESERTA),
  setPeserta: (peserta: Peserta[], action?: 'create' | 'update' | 'delete', data?: any) => {
    saveToStorage(STORAGE_KEYS.PESERTA, peserta);
    if (action && data) syncToSpreadsheet('peserta', action, data);
  },
  
  getEvents: () => getFromStorage<Event[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS),
  setEvents: (events: Event[], action?: 'create' | 'update' | 'delete', data?: any) => {
    saveToStorage(STORAGE_KEYS.EVENTS, events);
    if (action && data) syncToSpreadsheet('events', action, data);
  },
  
  getAttendance: () => getFromStorage<Attendance[]>(STORAGE_KEYS.ATTENDANCE, []),
  setAttendance: (attendance: Attendance[], action?: 'create' | 'update' | 'delete', data?: any) => {
    saveToStorage(STORAGE_KEYS.ATTENDANCE, attendance);
    if (action && data) syncToSpreadsheet('attendance', action, data);
  },

  // Helpers
  addAttendance: (record: Omit<Attendance, 'id' | 'timestamp'>) => {
    const records = db.getAttendance();
    
    // Strict enforcement: one attendance per event per participant per type
    const exists = records.find(a => 
      a.eventId === record.eventId && 
      a.pesertaId === record.pesertaId && 
      a.type === record.type
    );
    
    if (exists) return exists;

    const newRecord: Attendance = {
      ...record,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString()
    };
    db.setAttendance([...records, newRecord], 'create', newRecord);
    return newRecord;
  }
};
