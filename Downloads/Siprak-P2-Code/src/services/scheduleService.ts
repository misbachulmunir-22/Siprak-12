import {
  collection, doc, onSnapshot, query, serverTimestamp, where, writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { Jadwal, Kelas, Sesi, StatusSesi } from '@/types/siprak';

const schedulesRef = collection(db, 'schedules');
const sessionsRef = collection(db, 'sessions');

function toText(value: unknown): string { return typeof value === 'string' ? value : ''; }
function toNumber(value: unknown): number { return typeof value === 'number' ? value : Number(value ?? 0); }

function mapSchedule(id: string, d: Record<string, unknown>): Jadwal {
  return {
    id, classId: toText(d.classId), namaPraktikum: toText(d.namaPraktikum),
    pertemuan: toNumber(d.pertemuan), lab: toText(d.lab), tanggal: toText(d.tanggal),
    jamMulai: toText(d.jamMulai), jamSelesai: toText(d.jamSelesai),
    createdBy: toText(d.createdBy), active: d.active !== false,
  };
}
function mapSession(id: string, d: Record<string, unknown>): Sesi {
  const status = d.status;
  const safeStatus: StatusSesi = status === 'dibuka' || status === 'ditutup' ? status : 'belum_dibuka';
  return {
    id, scheduleId: toText(d.scheduleId), classId: toText(d.classId),
    praktikum: toText(d.praktikum), pertemuan: toNumber(d.pertemuan),
    kelas: toText(d.kelas), lab: toText(d.lab), tanggal: toText(d.tanggal),
    jamMulai: toText(d.jamMulai), jamSelesai: toText(d.jamSelesai),
    status: safeStatus, dibukaPada: toText(d.dibukaPada) || undefined,
    ditutupPada: toText(d.ditutupPada) || undefined,
    catatanPenutup: toText(d.catatanPenutup) || undefined,
  };
}
function validate(input: Omit<Jadwal, 'id' | 'createdBy'>): void {
  if (!input.classId.trim()) throw new Error('Pilih kelas terlebih dahulu.');
  if (!input.namaPraktikum.trim() || !input.lab.trim()) throw new Error('Nama praktikum dan lokasi/lab wajib diisi.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal)) throw new Error('Tanggal harus berformat YYYY-MM-DD.');
  if (!/^\d{2}:\d{2}$/.test(input.jamMulai) || !/^\d{2}:\d{2}$/.test(input.jamSelesai) || input.jamMulai >= input.jamSelesai)
    throw new Error('Jam harus HH:MM dan jam selesai harus setelah jam mulai.');
  if (!Number.isInteger(input.pertemuan) || input.pertemuan < 1) throw new Error('Nomor pertemuan minimal 1.');
}

export const scheduleService = {
  subscribeSchedules(classIds: string[], next: (items: Jadwal[]) => void, fail: (error: Error) => void): Unsubscribe {
    if (classIds.length === 0) { next([]); return () => undefined; }
    // Firestore where-in dibatasi 30 nilai; batasi query dan gabungkan di client.
    const ids = classIds.slice(0, 30);
    return onSnapshot(query(schedulesRef, where('classId', 'in', ids), where('active', '==', true)),
      snap => next(snap.docs.map(d => mapSchedule(d.id, d.data())).sort((a,b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`))), fail);
  },
  subscribeSessions(classIds: string[], next: (items: Sesi[]) => void, fail: (error: Error) => void): Unsubscribe {
    if (classIds.length === 0) { next([]); return () => undefined; }
    return onSnapshot(query(sessionsRef, where('classId', 'in', classIds.slice(0, 30)), where('active', '==', true)),
      snap => next(snap.docs.map(d => mapSession(d.id, d.data())).sort((a,b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`))), fail);
  },
  async createSchedule(input: Omit<Jadwal, 'id' | 'createdBy'>, assistantUid: string, classInfo: Kelas): Promise<string> {
    validate(input);
    const scheduleRef = doc(schedulesRef);
    const sessionRef = doc(sessionsRef);
    const batch = writeBatch(db);
    batch.set(scheduleRef, {
      classId: input.classId, namaPraktikum: input.namaPraktikum.trim(), pertemuan: input.pertemuan,
      lab: input.lab.trim(), tanggal: input.tanggal, jamMulai: input.jamMulai, jamSelesai: input.jamSelesai,
      createdBy: assistantUid, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    batch.set(sessionRef, {
      scheduleId: scheduleRef.id, classId: input.classId, praktikum: input.namaPraktikum.trim(),
      pertemuan: input.pertemuan, kelas: classInfo.nama, lab: input.lab.trim(),
      tanggal: input.tanggal, jamMulai: input.jamMulai, jamSelesai: input.jamSelesai,
      status: 'belum_dibuka', active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return scheduleRef.id;
  },
  async updateSchedule(scheduleId: string, sessionId: string, input: Omit<Jadwal, 'id' | 'createdBy'>, classInfo: Kelas): Promise<void> {
    validate(input);
    const scheduleData = {
      classId: input.classId, namaPraktikum: input.namaPraktikum.trim(), pertemuan: input.pertemuan,
      lab: input.lab.trim(), tanggal: input.tanggal, jamMulai: input.jamMulai, jamSelesai: input.jamSelesai,
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);
    batch.update(doc(db, 'schedules', scheduleId), scheduleData);
    batch.update(doc(db, 'sessions', sessionId), {
      classId: input.classId, praktikum: input.namaPraktikum.trim(), pertemuan: input.pertemuan,
      kelas: classInfo.nama, lab: input.lab.trim(), tanggal: input.tanggal,
      jamMulai: input.jamMulai, jamSelesai: input.jamSelesai, updatedAt: serverTimestamp(),
    });
    await batch.commit();
  },
  async archiveSchedule(scheduleId: string, sessionId: string): Promise<void> {
    const batch = writeBatch(db);
    batch.update(doc(db, 'schedules', scheduleId), { active: false, archivedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    batch.update(doc(db, 'sessions', sessionId), { active: false, updatedAt: serverTimestamp() });
    await batch.commit();
  },
};
