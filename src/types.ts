/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserLevel = 'ADMIN' | 'PANITIA' | 'PESERTA';

export interface User {
  id: string;
  username: string;
  password?: string;
  level: UserLevel;
  profileId?: string; // Links to Peserta ID if level is PESERTA
}

export interface Peserta {
  id: string;
  nama_lengkap: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  nomer_whatsapp: string;
  kelompok: string;
  desa: string;
}

export interface Event {
  id: string;
  nama_event: string;
  tanggal_event: string;
  jam_mulai_event: string;
  jam_selesai: string;
  deskripsi: string;
  type: AttendanceType;
}

export type AttendanceType = 'MATERI' | 'MAKAN';

export interface Attendance {
  id: string;
  eventId: string;
  pesertaId: string;
  type: AttendanceType;
  timestamp: string;
  panitiaId: string;
}
