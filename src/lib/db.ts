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
  const url = '/api/spreadsheet';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, table, data })
    });
    
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      return { success: false, error: `Invalid JSON: ${text.substring(0, 50) }` };
    }
    
    return { success: response.ok, ...result };
  } catch (error) {
    console.error('Sync Error:', error);
    return { success: false, error: String(error) };
  }
};

export const pullFromSpreadsheet = async () => {
  const url = '/api/spreadsheet';

  console.log('Attempting to pull cloud data...');

  try {
    const response = await fetch(`${url}?action=readAll`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Cloud Data:', text);
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    console.log('Cloud data decoded:', data);
    
    if (data.error) {
      console.error('Apps Script Error:', data.error);
      return { error: data.error };
    }
    
    // Convert all values to string and keys to lowercase to avoid comparison issues
    const sanitize = (list: any[]) => {
      if (!list || !Array.isArray(list)) {
        console.warn('Expected array but got:', list);
        return [];
      }
      return list.map((item, index) => {
        const newItem: any = {};
        Object.keys(item).forEach(key => {
          let cleanKey = key.toLowerCase().trim().replace(/\s+/g, '');
          
          // Alias mapping to match User type keys
          if (['user', 'nama', 'name', 'username', 'uname'].includes(cleanKey)) {
            cleanKey = 'username';
          }
          if (['sandi', 'pass', 'pw', 'password', 'key'].includes(cleanKey)) {
            cleanKey = 'password';
          }
          if (['peran', 'role', 'level', 'status', 'akses'].includes(cleanKey)) {
            cleanKey = 'level';
          }
          if (['id', 'no', 'uuid'].includes(cleanKey)) {
            cleanKey = 'id';
          }
          
          const rawValue = item[key];
          let value = (rawValue !== null && rawValue !== undefined) ? String(rawValue).trim() : '';
          
          if (cleanKey === 'level') {
            value = value.toUpperCase();
          }
          
          newItem[cleanKey] = value;
        });

        // Ensure ID exists
        if (!newItem.id) {
          newItem.id = String(index + 1);
        }
        
        return newItem;
      });
    };

    // Map to find keys case-insensitively
    const dataKeys = Object.keys(data);
    const getTableData = (tableName: string) => {
      const target = tableName.toLowerCase().trim();
      // Try exact plural first
      let key = dataKeys.find(k => k.toLowerCase().trim() === target);
      // Try singular
      if (!key && target.endsWith('s')) {
        const singular = target.slice(0, -1);
        key = dataKeys.find(k => k.toLowerCase().trim() === singular);
      }
      // Try plural if target was singular
      if (!key && !target.endsWith('s')) {
        const plural = target + 's';
        key = dataKeys.find(k => k.toLowerCase().trim() === plural);
      }
      return key ? data[key] : null;
    };

    const usersData = getTableData('users');
    if (usersData && Array.isArray(usersData)) {
      const sanitizedUsers = sanitize(usersData);
      console.log('Sanitized Users for DB:', sanitizedUsers);
      
      // Merge with INITIAL_USERS to ensure admin/123 always works as fallback
      const mergedUsers = [...INITIAL_USERS];
      sanitizedUsers.forEach(u => {
        if (!mergedUsers.find(mu => mu.username === u.username)) {
          mergedUsers.push(u);
        }
      });
      
      db.setUsers(mergedUsers);
    }
    const pesertaData = getTableData('peserta');
    if (pesertaData && Array.isArray(pesertaData)) {
      db.setPeserta(sanitize(pesertaData));
    }
    
    const eventsData = getTableData('events');
    if (eventsData && Array.isArray(eventsData)) {
      db.setEvents(sanitize(eventsData));
    }
    
    const attendanceData = getTableData('attendance');
    if (attendanceData && Array.isArray(attendanceData)) {
      db.setAttendance(sanitize(attendanceData));
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Pull Error Details:', error);
    return { error: error instanceof Error ? error.message : String(error) };
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
