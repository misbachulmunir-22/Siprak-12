/**
 * scheduleService.ts
 *
 * Modul Layanan Jadwal dan Data Master Sesi Praktikum (Programmer 2)
 * Sesuai Dokumen SRS Siprak-12 Sprint 2:
 * - FR-S2-08: CRUD jadwal dan data master sesi (validasi jam, pertemuan, lab, tanggal, relasi classId/scheduleId)
 * - FR-S2-09: Jadwal dan detail sesi sesuai peran (asisten vs praktikan)
 * - FR-S2-13: Listener real-time jadwal dan sesi
 * - FR-S2-21: Validasi input, loading, empty, dan error state
 */

import type { StatusSesi } from '../types/siprak';
import { classService } from './classService';

export interface ScheduleItem {
  id: string; // scheduleId
  classId: string; // ID kelas terkait
  namaPraktikum: string; // Nama praktikum
  pertemuan: number; // Nomor pertemuan (>= 1)
  lab: string; // Laboratorium / ruangan
  tanggal: string; // Format: YYYY-MM-DD
  jamMulai: string; // Format: HH:MM
  jamSelesai: string; // Format: HH:MM (harus > jamMulai)
  createdBy: string; // UID asisten pembuat
  active: boolean; // true = aktif, false = diarsipkan
  createdAt: string;
  updatedAt: string;
}

export interface SessionItem {
  id: string; // sessionId
  scheduleId: string; // ID jadwal induk
  classId: string; // ID kelas
  praktikum: string; // Nama praktikum
  pertemuan: number; // Nomor pertemuan
  lab: string; // Laboratorium
  tanggal: string; // YYYY-MM-DD
  jamMulai: string; // HH:MM
  jamSelesai: string; // HH:MM
  status: StatusSesi; // 'belum_dibuka' | 'dibuka' | 'ditutup'
  dibukaPada?: string;
  ditutupPada?: string;
  catatanPenutup?: string;
  active: boolean; // true = aktif, false = diarsipkan
  createdAt: string;
  updatedAt: string;
  // Kompatibilitas mundur dengan komponen Sprint 1:
  kelas?: string;
}

export interface CreateScheduleInput {
  classId: string;
  namaPraktikum: string;
  pertemuan: number;
  lab: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  createdBy: string;
}

export interface UpdateScheduleInput {
  namaPraktikum?: string;
  pertemuan?: number;
  lab?: string;
  tanggal?: string;
  jamMulai?: string;
  jamSelesai?: string;
  updatedBy: string;
}

export interface ScheduleValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// VALIDATION LOGIC (FR-S2-08, FR-S2-21)
// ============================================================================

export function validateScheduleInput(
  input: Partial<CreateScheduleInput>
): ScheduleValidationResult {
  const errors: Record<string, string> = {};

  // 1. Kelas
  if (!input.classId || !input.classId.trim()) {
    errors.classId = 'Kelas wajib dipilih.';
  }

  // 2. Nama Praktikum
  if (!input.namaPraktikum || !input.namaPraktikum.trim()) {
    errors.namaPraktikum = 'Nama praktikum wajib diisi.';
  }

  // 3. Nomor Pertemuan
  if (input.pertemuan === undefined || input.pertemuan === null || Number.isNaN(Number(input.pertemuan))) {
    errors.pertemuan = 'Nomor pertemuan wajib diisi.';
  } else if (!Number.isInteger(Number(input.pertemuan)) || Number(input.pertemuan) < 1) {
    errors.pertemuan = 'Nomor pertemuan harus berupa bilangan bulat positif (minimal 1).';
  }

  // 4. Lab / Lokasi
  if (!input.lab || !input.lab.trim()) {
    errors.lab = 'Laboratorium/ruangan wajib diisi.';
  }

  // 5. Tanggal (YYYY-MM-DD)
  if (!input.tanggal || !input.tanggal.trim()) {
    errors.tanggal = 'Tanggal praktikum wajib diisi.';
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.tanggal.trim())) {
      errors.tanggal = 'Format tanggal harus YYYY-MM-DD (contoh: 2026-10-15).';
    } else {
      const [yearStr, monthStr, dayStr] = input.tanggal.trim().split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const d = parseInt(dayStr, 10);
      const dateObj = new Date(y, m - 1, d);
      if (
        dateObj.getFullYear() !== y ||
        dateObj.getMonth() !== m - 1 ||
        dateObj.getDate() !== d
      ) {
        errors.tanggal = 'Tanggal kalender tidak valid.';
      }
    }
  }

  // 6. Jam Mulai & Jam Selesai (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  let validMulai = false;
  let validSelesai = false;

  if (!input.jamMulai || !input.jamMulai.trim()) {
    errors.jamMulai = 'Jam mulai wajib diisi.';
  } else if (!timeRegex.test(input.jamMulai.trim())) {
    errors.jamMulai = 'Format jam mulai harus HH:MM (contoh: 08:00).';
  } else {
    validMulai = true;
  }

  if (!input.jamSelesai || !input.jamSelesai.trim()) {
    errors.jamSelesai = 'Jam selesai wajib diisi.';
  } else if (!timeRegex.test(input.jamSelesai.trim())) {
    errors.jamSelesai = 'Format jam selesai harus HH:MM (contoh: 10:30).';
  } else {
    validSelesai = true;
  }

  // 7. Aturan Wajib: Jam selesai HARUS setelah jam mulai
  if (validMulai && validSelesai) {
    const mulai = input.jamMulai!.trim();
    const selesai = input.jamSelesai!.trim();
    if (selesai <= mulai) {
      errors.jamSelesai = 'Jam selesai harus setelah jam mulai praktikum.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// IN-MEMORY FIXTURE STORE (Untuk pengujian terisolasi & baseline ZIP Sprint 1)
// ============================================================================

const initialSchedules: ScheduleItem[] = [
  {
    id: 'jadwal-1',
    classId: 'kelas-a',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 1,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-10',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    createdBy: 'asisten-1',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'jadwal-2',
    classId: 'kelas-a',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 2,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-17',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    createdBy: 'asisten-1',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'jadwal-3',
    classId: 'kelas-a',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 3,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-24',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    createdBy: 'asisten-1',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'jadwal-4',
    classId: 'kelas-a',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 4,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-31',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    createdBy: 'asisten-1',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'jadwal-b1',
    classId: 'kelas-b',
    namaPraktikum: 'Jaringan Komputer',
    pertemuan: 1,
    lab: 'Lab Jaringan 1',
    tanggal: '2026-11-05',
    jamMulai: '13:00',
    jamSelesai: '15:30',
    createdBy: 'asisten-2',
    active: true,
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
  },
];

const initialSessions: SessionItem[] = [
  {
    id: 'sesi-1',
    scheduleId: 'jadwal-1',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 1,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-10',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'ditutup',
    dibukaPada: '2026-10-10T08:02:00.000Z',
    ditutupPada: '2026-10-10T10:30:00.000Z',
    catatanPenutup: 'Sesi pengenalan React Native dan Expo selesai dengan tertib.',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-10T10:30:00.000Z',
    kelas: 'Kelas A',
  },
  {
    id: 'sesi-2',
    scheduleId: 'jadwal-2',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 2,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-17',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'belum_dibuka',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    kelas: 'Kelas A',
  },
  {
    id: 'sesi-3',
    scheduleId: 'jadwal-3',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 3,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-24',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'belum_dibuka',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    kelas: 'Kelas A',
  },
  {
    id: 'sesi-4',
    scheduleId: 'jadwal-4',
    classId: 'kelas-a',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 4,
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-31',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'dibuka',
    dibukaPada: '2026-10-31T08:01:15.000Z',
    active: true,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-31T08:01:15.000Z',
    kelas: 'Kelas A',
  },
  {
    id: 'sesi-b1',
    scheduleId: 'jadwal-b1',
    classId: 'kelas-b',
    praktikum: 'Jaringan Komputer',
    pertemuan: 1,
    lab: 'Lab Jaringan 1',
    tanggal: '2026-11-05',
    jamMulai: '13:00',
    jamSelesai: '15:30',
    status: 'belum_dibuka',
    active: true,
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
    kelas: 'Kelas B',
  },
];

let scheduleStore: ScheduleItem[] = JSON.parse(JSON.stringify(initialSchedules));
let sessionStore: SessionItem[] = JSON.parse(JSON.stringify(initialSessions));

// Listeners
type ScheduleListener = (schedules: ScheduleItem[]) => void;
type SessionListener = (sessions: SessionItem[]) => void;

const scheduleListeners = new Map<string, Set<ScheduleListener>>(); // key: classId
const globalSessionListeners = new Set<SessionListener>();

function notifyScheduleListeners(classId: string) {
  const set = scheduleListeners.get(classId);
  if (set) {
    const list = scheduleStore.filter((s) => s.classId === classId && s.active);
    set.forEach((cb) => {
      try {
        cb([...list]);
      } catch (err) {
        console.error('Error in schedule listener:', err);
      }
    });
  }
}

function notifySessionListeners() {
  const current = [...sessionStore];
  globalSessionListeners.forEach((cb) => {
    try {
      cb(current);
    } catch (err) {
      console.error('Error in session listener:', err);
    }
  });
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export const scheduleService = {
  /**
   * Reset store data fixture (berguna untuk pengujian terisolasi)
   */
  resetStore(): void {
    scheduleStore = JSON.parse(JSON.stringify(initialSchedules));
    sessionStore = JSON.parse(JSON.stringify(initialSessions));
    notifySessionListeners();
    scheduleListeners.forEach((_, cId) => notifyScheduleListeners(cId));
  },

  /**
   * Validasi data input jadwal
   */
  validateInput(input: Partial<CreateScheduleInput>): ScheduleValidationResult {
    return validateScheduleInput(input);
  },

  /**
   * Mengambil jadwal aktif untuk suatu kelas
   */
  async getSchedulesForClass(classId: string): Promise<ScheduleItem[]> {
    return scheduleStore
      .filter((s) => s.classId === classId && s.active)
      .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`));
  },

  /**
   * FR-S2-13: Real-time listener jadwal pada suatu kelas.
   */
  subscribeSchedulesForClass(
    classId: string,
    onUpdate: (schedules: ScheduleItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!scheduleListeners.has(classId)) {
      scheduleListeners.set(classId, new Set());
    }
    const set = scheduleListeners.get(classId)!;

    const listener: ScheduleListener = (schedules) => {
      onUpdate(schedules);
    };

    set.add(listener);
    try {
      const current = scheduleStore
        .filter((s) => s.classId === classId && s.active)
        .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`));
      listener(current);
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        scheduleListeners.delete(classId);
      }
    };
  },

  /**
   * FR-S2-09: Mengambil sesi untuk asisten berdasarkan kelas yang ditugaskan.
   * Terurut kronologis berdasarkan tanggal dan jamMulai.
   */
  async getSessionsForAssistant(assistantUid: string): Promise<SessionItem[]> {
    const assignedClasses = await classService.getClassesForAssistant(assistantUid);
    const assignedClassIds = assignedClasses.map((c) => c.id);

    return sessionStore
      .filter((s) => assignedClassIds.includes(s.classId) && s.active)
      .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`));
  },

  /**
   * FR-S2-13: Real-time listener sesi untuk asisten.
   */
  subscribeSessionsForAssistant(
    assistantUid: string,
    onUpdate: (sessions: SessionItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const emit = async () => {
      try {
        const assignedClasses = await classService.getClassesForAssistant(assistantUid);
        const assignedClassIds = assignedClasses.map((c) => c.id);

        const list = sessionStore
          .filter((s) => assignedClassIds.includes(s.classId) && s.active)
          .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`));
        onUpdate(list);
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    };

    const listener: SessionListener = () => {
      emit();
    };

    globalSessionListeners.add(listener);
    emit();

    return () => {
      globalSessionListeners.delete(listener);
    };
  },

  /**
   * FR-S2-09: Mengambil sesi untuk praktikan berdasarkan kelas dengan keanggotaan aktif.
   * Terurut kronologis berdasarkan tanggal dan jamMulai.
   */
  async getSessionsForPraktikan(praktikanUid: string): Promise<SessionItem[]> {
    const enrolledClasses = await classService.getClassesForPraktikan(praktikanUid);
    const enrolledClassIds = enrolledClasses.map((c) => c.id);

    return sessionStore
      .filter((s) => enrolledClassIds.includes(s.classId) && s.active)
      .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`));
  },

  /**
   * FR-S2-13: Real-time listener sesi untuk praktikan.
   */
  subscribeSessionsForPraktikan(
    praktikanUid: string,
    onUpdate: (sessions: SessionItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const emit = async () => {
      try {
        const enrolledClasses = await classService.getClassesForPraktikan(praktikanUid);
        const enrolledClassIds = enrolledClasses.map((c) => c.id);

        const list = sessionStore
          .filter((s) => enrolledClassIds.includes(s.classId) && s.active)
          .sort((a, b) => `${a.tanggal}T${a.jamMulai}`.localeCompare(`${b.tanggal}T${b.jamMulai}`));
        onUpdate(list);
      } catch (err) {
        if (onError && err instanceof Error) onError(err);
      }
    };

    const listener: SessionListener = () => {
      emit();
    };

    globalSessionListeners.add(listener);
    emit();

    return () => {
      globalSessionListeners.delete(listener);
    };
  },

  /**
   * Mendapatkan satu sesi berdasarkan ID untuk detail sesi
   */
  async getSessionById(sessionId: string): Promise<SessionItem | null> {
    const found = sessionStore.find((s) => s.id === sessionId && s.active);
    return found ? { ...found } : null;
  },

  /**
   * FR-S2-08: Tambah jadwal & data master sesi baru.
   * - Menghasilkan dokumen schedule di schedules/{scheduleId}
   * - Menghasilkan dokumen session di sessions/{sessionId}
   * - Status awal sesi: 'belum_dibuka'
   * - Memastikan classId dan scheduleId konsisten
   */
  async createScheduleAndSession(
    input: CreateScheduleInput
  ): Promise<{ schedule: ScheduleItem; session: SessionItem }> {
    const validation = validateScheduleInput(input);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Data jadwal tidak valid.');
    }

    // Validasi otorisasi asisten pada kelas
    const cls = await classService.getClassById(input.classId);
    if (!cls) throw new Error('Kelas tidak ditemukan.');
    if (!cls.assistantUids.includes(input.createdBy)) {
      throw new Error('Anda tidak memiliki kewenangan membuat jadwal untuk kelas ini.');
    }

    const now = new Date().toISOString();
    const scheduleId = `jadwal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sessionId = `sesi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newSchedule: ScheduleItem = {
      id: scheduleId,
      classId: input.classId,
      namaPraktikum: input.namaPraktikum.trim(),
      pertemuan: Number(input.pertemuan),
      lab: input.lab.trim(),
      tanggal: input.tanggal.trim(),
      jamMulai: input.jamMulai.trim(),
      jamSelesai: input.jamSelesai.trim(),
      createdBy: input.createdBy,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const newSession: SessionItem = {
      id: sessionId,
      scheduleId: scheduleId,
      classId: input.classId,
      praktikum: input.namaPraktikum.trim(),
      pertemuan: Number(input.pertemuan),
      lab: input.lab.trim(),
      tanggal: input.tanggal.trim(),
      jamMulai: input.jamMulai.trim(),
      jamSelesai: input.jamSelesai.trim(),
      status: 'belum_dibuka', // Wajib belum_dibuka untuk sesi baru (FR-S2-08)
      active: true,
      createdAt: now,
      updatedAt: now,
      kelas: cls.nama,
    };

    scheduleStore.push(newSchedule);
    sessionStore.push(newSession);

    notifyScheduleListeners(input.classId);
    notifySessionListeners();

    return { schedule: { ...newSchedule }, session: { ...newSession } };
  },

  /**
   * FR-S2-08: Mengubah jadwal dan data master sesi terkait.
   */
  async updateScheduleAndSession(
    scheduleId: string,
    input: UpdateScheduleInput
  ): Promise<{ schedule: ScheduleItem; session: SessionItem }> {
    const sIdx = scheduleStore.findIndex((s) => s.id === scheduleId);
    if (sIdx === -1) throw new Error('Jadwal tidak ditemukan.');

    const currentSchedule = scheduleStore[sIdx];
    const cls = await classService.getClassById(currentSchedule.classId);
    if (!cls || !cls.assistantUids.includes(input.updatedBy)) {
      throw new Error('Anda tidak memiliki kewenangan mengubah jadwal ini.');
    }

    // Merge & validate
    const mergedInput: CreateScheduleInput = {
      classId: currentSchedule.classId,
      namaPraktikum: input.namaPraktikum !== undefined ? input.namaPraktikum : currentSchedule.namaPraktikum,
      pertemuan: input.pertemuan !== undefined ? input.pertemuan : currentSchedule.pertemuan,
      lab: input.lab !== undefined ? input.lab : currentSchedule.lab,
      tanggal: input.tanggal !== undefined ? input.tanggal : currentSchedule.tanggal,
      jamMulai: input.jamMulai !== undefined ? input.jamMulai : currentSchedule.jamMulai,
      jamSelesai: input.jamSelesai !== undefined ? input.jamSelesai : currentSchedule.jamSelesai,
      createdBy: currentSchedule.createdBy,
    };

    const validation = validateScheduleInput(mergedInput);
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Data jadwal tidak valid.');
    }

    const now = new Date().toISOString();
    const updatedSchedule: ScheduleItem = {
      ...currentSchedule,
      namaPraktikum: mergedInput.namaPraktikum.trim(),
      pertemuan: Number(mergedInput.pertemuan),
      lab: mergedInput.lab.trim(),
      tanggal: mergedInput.tanggal.trim(),
      jamMulai: mergedInput.jamMulai.trim(),
      jamSelesai: mergedInput.jamSelesai.trim(),
      updatedAt: now,
    };

    scheduleStore[sIdx] = updatedSchedule;

    // Perbarui sesi yang bersesuaian
    const sessIdx = sessionStore.findIndex((sess) => sess.scheduleId === scheduleId);
    let updatedSession: SessionItem;
    if (sessIdx !== -1) {
      updatedSession = {
        ...sessionStore[sessIdx],
        praktikum: updatedSchedule.namaPraktikum,
        pertemuan: updatedSchedule.pertemuan,
        lab: updatedSchedule.lab,
        tanggal: updatedSchedule.tanggal,
        jamMulai: updatedSchedule.jamMulai,
        jamSelesai: updatedSchedule.jamSelesai,
        updatedAt: now,
      };
      sessionStore[sessIdx] = updatedSession;
    } else {
      // Jika sesi belum tercatat, buatkan master sesi
      const sessionId = `sesi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      updatedSession = {
        id: sessionId,
        scheduleId: scheduleId,
        classId: updatedSchedule.classId,
        praktikum: updatedSchedule.namaPraktikum,
        pertemuan: updatedSchedule.pertemuan,
        lab: updatedSchedule.lab,
        tanggal: updatedSchedule.tanggal,
        jamMulai: updatedSchedule.jamMulai,
        jamSelesai: updatedSchedule.jamSelesai,
        status: 'belum_dibuka',
        active: true,
        createdAt: now,
        updatedAt: now,
        kelas: cls.nama,
      };
      sessionStore.push(updatedSession);
    }

    notifyScheduleListeners(currentSchedule.classId);
    notifySessionListeners();

    return { schedule: { ...updatedSchedule }, session: { ...updatedSession } };
  },

  /**
   * FR-S2-08: Mengarsipkan jadwal dan sesi (soft delete).
   * Mencegah cascading delete agar riwayat presensi/izin tidak rusak.
   */
  async archiveScheduleAndSession(scheduleId: string, updatedBy: string): Promise<void> {
    const sIdx = scheduleStore.findIndex((s) => s.id === scheduleId);
    if (sIdx === -1) throw new Error('Jadwal tidak ditemukan.');

    const currentSchedule = scheduleStore[sIdx];
    const cls = await classService.getClassById(currentSchedule.classId);
    if (!cls || !cls.assistantUids.includes(updatedBy)) {
      throw new Error('Anda tidak memiliki kewenangan mengarsipkan jadwal ini.');
    }

    const now = new Date().toISOString();
    scheduleStore[sIdx] = {
      ...currentSchedule,
      active: false,
      updatedAt: now,
    };

    const sessIdx = sessionStore.findIndex((sess) => sess.scheduleId === scheduleId);
    if (sessIdx !== -1) {
      sessionStore[sessIdx] = {
        ...sessionStore[sessIdx],
        active: false,
        updatedAt: now,
      };
    }

    notifyScheduleListeners(currentSchedule.classId);
    notifySessionListeners();
  },
};
