import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { Presensi, Sesi } from '@/types/siprak';
import { getAttendanceDocId } from '@/utils/presensi';

export interface CheckInResult {
  ok: boolean;
  reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi' | 'tidak_terdaftar' | 'error';
  message?: string;
  attendance?: Presensi;
}

// In-memory mutex untuk mencegah race condition penekanan tombol ganda secara simultan di sisi klien
const inFlightRequests = new Set<string>();

// Mock in-memory storage bila Firebase belum dikonfigurasi (pengembangan lokal & testing)
const mockAttendances = new Map<string, Presensi>();

/**
 * Mencatat presensi kehadiran praktikan pada suatu sesi.
 * Mengikuti FR-S2-11 (Presensi saat dibuka), FR-S2-12 (Pencegahan presensi ganda),
 * dan NFR-S2-05 (Idempotensi dengan ID deterministik).
 * 
 * Aturan:
 * - ID dokumen Firestore: `${sessionId}_${praktikanUid}`
 * - Sesi harus berstatus 'dibuka'
 * - Praktikan belum memiliki catatan presensi pada sesi tersebut
 * - Menggunakan waktu server resmi
 */
export async function recordAttendance(
  sesi: Sesi,
  praktikanUid: string,
  classId?: string
): Promise<CheckInResult> {
  const effectiveClassId = classId || sesi.classId || sesi.kelas;
  const attendanceId = getAttendanceDocId(sesi.id, praktikanUid);

  // 1. Validasi status sesi
  if (sesi.status === 'belum_dibuka') {
    return {
      ok: false,
      reason: 'belum_dibuka',
      message: 'Presensi belum dibuka oleh asisten. Silakan tunggu hingga sesi dimulai.',
    };
  }

  if (sesi.status === 'ditutup') {
    return {
      ok: false,
      reason: 'ditutup',
      message: 'Sesi praktikum sudah ditutup. Presensi baru tidak dapat dilakukan.',
    };
  }

  // 2. Proteksi in-flight klien (menolak ketukan ganda paralel)
  if (inFlightRequests.has(attendanceId)) {
    return {
      ok: false,
      reason: 'sudah_presensi',
      message: 'Permintaan presensi sedang diproses. Mohon tunggu.',
    };
  }

  inFlightRequests.add(attendanceId);

  try {
    // Mode fallback jika Firebase project belum aktif
    if (!isFirebaseConfigured()) {
      if (mockAttendances.has(attendanceId)) {
        return {
          ok: false,
          reason: 'sudah_presensi',
          message: 'Presensimu untuk sesi ini sudah tercatat.',
          attendance: mockAttendances.get(attendanceId),
        };
      }

      const nowIso = new Date().toISOString();
      const mockPresensi: Presensi = {
        id: attendanceId,
        sesiId: sesi.id,
        classId: effectiveClassId,
        praktikanUid,
        praktikanId: praktikanUid,
        waktuHadir: nowIso,
        createdAt: nowIso,
      };

      mockAttendances.set(attendanceId, mockPresensi);
      return {
        ok: true,
        attendance: mockPresensi,
      };
    }

    // 3. Operasi Firestore dengan ID deterministik
    const attendanceRef = doc(db, 'attendances', attendanceId);

    // Cek keberadaan dokumen secara server-side
    const existingDoc = await getDoc(attendanceRef);
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      const existingPresensi: Presensi = {
        id: attendanceId,
        sesiId: data.sessionId ?? sesi.id,
        classId: data.classId ?? effectiveClassId,
        praktikanUid: data.praktikanUid ?? praktikanUid,
        waktuHadir: formatTimestamp(data.waktuHadir) || new Date().toISOString(),
      };

      return {
        ok: false,
        reason: 'sudah_presensi',
        message: 'Presensimu untuk sesi ini sudah tercatat.',
        attendance: existingPresensi,
      };
    }

    // Tulis dokumen presensi baru dengan ID deterministik
    const nowIso = new Date().toISOString();
    await setDoc(attendanceRef, {
      sessionId: sesi.id,
      classId: effectiveClassId,
      praktikanUid,
      waktuHadir: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    const newPresensi: Presensi = {
      id: attendanceId,
      sesiId: sesi.id,
      classId: effectiveClassId,
      praktikanUid,
      praktikanId: praktikanUid,
      waktuHadir: nowIso,
      createdAt: nowIso,
    };

    return {
      ok: true,
      attendance: newPresensi,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mencatat presensi.';
    return {
      ok: false,
      reason: 'error',
      message: errorMsg,
    };
  } finally {
    inFlightRequests.delete(attendanceId);
  }
}

/**
 * Berlangganan real-time terhadap status presensi satu sesi untuk satu praktikan.
 * FR-S2-13: Mengembalikan fungsi unsubscribe untuk melepaskan listener saat unmount/logout.
 */
export function subscribeAttendance(
  sessionId: string,
  praktikanUid: string,
  onUpdate: (attendance: Presensi | null) => void,
  onError?: (error: Error) => void
): () => void {
  const attendanceId = getAttendanceDocId(sessionId, praktikanUid);

  if (!isFirebaseConfigured()) {
    const mock = mockAttendances.get(attendanceId) ?? null;
    onUpdate(mock);
    return () => {};
  }

  const attendanceRef = doc(db, 'attendances', attendanceId);

  const unsubscribe = onSnapshot(
    attendanceRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }

      const data = snapshot.data();
      const presensi: Presensi = {
        id: snapshot.id,
        sesiId: data.sessionId || sessionId,
        classId: data.classId || '',
        praktikanUid: data.praktikanUid || praktikanUid,
        praktikanId: data.praktikanUid || praktikanUid,
        waktuHadir: formatTimestamp(data.waktuHadir) || new Date().toISOString(),
        createdAt: formatTimestamp(data.createdAt),
      };

      onUpdate(presensi);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );

  return unsubscribe;
}

/**
 * Berlangganan real-time terhadap seluruh riwayat presensi milik seorang praktikan.
 * FR-S2-13 & FR-S2-15: Mengembalikan fungsi unsubscribe untuk cleanup.
 */
export function subscribeUserAttendances(
  praktikanUid: string,
  onUpdate: (attendances: Presensi[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured()) {
    const results: Presensi[] = [];
    mockAttendances.forEach((att) => {
      if (att.praktikanUid === praktikanUid || att.praktikanId === praktikanUid) {
        results.push(att);
      }
    });
    onUpdate(results);
    return () => {};
  }

  const attendancesCol = collection(db, 'attendances');
  const q = query(attendancesCol, where('praktikanUid', '==', praktikanUid));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const attendances: Presensi[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          sesiId: data.sessionId || '',
          classId: data.classId || '',
          praktikanUid: data.praktikanUid || praktikanUid,
          praktikanId: data.praktikanUid || praktikanUid,
          waktuHadir: formatTimestamp(data.waktuHadir) || new Date().toISOString(),
          createdAt: formatTimestamp(data.createdAt),
        };
      });

      onUpdate(attendances);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );

  return unsubscribe;
}

/** Helper konversi Timestamp Firestore ke ISO String */
function formatTimestamp(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return undefined;
}
