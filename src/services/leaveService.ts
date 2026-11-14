import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { PengajuanIzin, Sesi } from '@/types/siprak';
import { validateAlasanIzin } from '@/utils/presensi';
import { classifyLeaveReason } from '@/services/aiService';

export interface SubmitLeaveRequestResult {
  ok: boolean;
  message?: string;
  leaveRequest?: PengajuanIzin;
}

// In-memory mock storage untuk pengajuan izin (saat offline / project Firebase belum terhubung)
const mockLeaveRequests = new Map<string, PengajuanIzin>();

/**
 * Mengajukan izin ketidakhadiran praktikan untuk satu sesi praktikum.
 * Mengikuti alur ketat SRS FR-S2-16, FR-S2-17, FR-S2-18:
 * 
 * 1. Validasi teks alasan (tidak kosong, batas karakter).
 * 2. Cek apakah sudah pernah mengajukan izin untuk sesi ini (mencegah duplikat).
 * 3. SIMPAN PENGAJUAN AWAL TERLEBIH DAHULU ke Firestore:
 *    - status = 'menunggu'
 *    - aiStatus = 'menunggu'
 * 4. Panggil adapter AI (classifyLeaveReason).
 * 5. Update metadata klasifikasi AI pada dokumen yang sudah tersimpan:
 *    - Jika AI sukses: aiStatus = 'berhasil', aiCategory, aiConfidence, aiModel, aiProcessedAt
 *    - Jika AI gagal/timeout: aiStatus = 'gagal'
 *    - Jika endpoint belum siap: aiStatus = 'tidak_tersedia'
 * 6. Keputusan status izin TETAP 'menunggu' sampai asisten memutuskan secara manual.
 */
export async function submitLeaveRequest(
  sesi: Sesi,
  praktikanUid: string,
  alasan: string,
  classId?: string
): Promise<SubmitLeaveRequestResult> {
  // 1. Validasi alasan
  const validation = validateAlasanIzin(alasan);
  if (!validation.valid) {
    return {
      ok: false,
      message: validation.error || 'Alasan izin tidak valid.',
    };
  }

  const effectiveClassId = classId || sesi.classId || sesi.kelas;
  const requestId = `leave_${sesi.id}_${praktikanUid}`;
  const nowIso = new Date().toISOString();

  try {
    // 2. Cek duplikasi izin untuk sesi yang sama
    const existing = await checkExistingLeaveRequest(sesi.id, praktikanUid);
    if (existing && existing.status === 'menunggu') {
      return {
        ok: false,
        message: 'Kamu sudah memiliki pengajuan izin yang sedang menunggu persetujuan untuk sesi ini.',
        leaveRequest: existing,
      };
    }
    if (existing && existing.status === 'disetujui') {
      return {
        ok: false,
        message: 'Pengajuan izinmu untuk sesi ini sudah disetujui sebelumnya.',
        leaveRequest: existing,
      };
    }

    // 3. PERSISTENSI AWAL: Simpan pengajuan dengan status='menunggu' dan aiStatus='menunggu'
    let initialRequest: PengajuanIzin = {
      id: requestId,
      sesiId: sesi.id,
      classId: effectiveClassId,
      praktikanUid,
      alasan: alasan.trim(),
      status: 'menunggu',
      aiStatus: 'menunggu',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isFirebaseConfigured()) {
      const leaveDocRef = doc(db, 'leaveRequests', requestId);
      await setDoc(leaveDocRef, {
        sessionId: sesi.id,
        classId: effectiveClassId,
        praktikanUid,
        alasan: alasan.trim(),
        status: 'menunggu',
        aiStatus: 'menunggu',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      mockLeaveRequests.set(requestId, initialRequest);
    }

    // 4. PANGGIL ADAPTER AI SECARA ASINKRON
    // Kegagalan pada tahap ini TIDAK BOLEH menggagalkan pengajuan awal!
    try {
      const aiResult = await classifyLeaveReason(alasan.trim(), requestId);

      if (aiResult.status === 'berhasil') {
        initialRequest = {
          ...initialRequest,
          aiStatus: 'berhasil',
          aiCategory: aiResult.category,
          aiConfidence: aiResult.confidence,
          aiModel: aiResult.model,
          aiProcessedAt: aiResult.processedAt,
          updatedAt: new Date().toISOString(),
        };

        if (isFirebaseConfigured()) {
          const leaveDocRef = doc(db, 'leaveRequests', requestId);
          await updateDoc(leaveDocRef, {
            aiStatus: 'berhasil',
            aiCategory: aiResult.category || null,
            aiConfidence: aiResult.confidence ?? null,
            aiModel: aiResult.model || null,
            aiProcessedAt: aiResult.processedAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          mockLeaveRequests.set(requestId, initialRequest);
        }
      } else {
        // AI Gagal / Tidak Tersedia: perbarui metadata tanpa mengubah status pengajuan
        initialRequest = {
          ...initialRequest,
          aiStatus: aiResult.status,
          updatedAt: new Date().toISOString(),
        };

        if (isFirebaseConfigured()) {
          const leaveDocRef = doc(db, 'leaveRequests', requestId);
          await updateDoc(leaveDocRef, {
            aiStatus: aiResult.status,
            updatedAt: serverTimestamp(),
          });
        } else {
          mockLeaveRequests.set(requestId, initialRequest);
        }
      }
    } catch {
      // Tangani fallback jika terjadi error eksternal pada panggilan AI
      initialRequest = {
        ...initialRequest,
        aiStatus: 'gagal',
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured()) {
        try {
          const leaveDocRef = doc(db, 'leaveRequests', requestId);
          await updateDoc(leaveDocRef, {
            aiStatus: 'gagal',
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Ignore secondary update error
        }
      } else {
        mockLeaveRequests.set(requestId, initialRequest);
      }
    }

    return {
      ok: true,
      leaveRequest: initialRequest,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal mengirimkan pengajuan izin.';
    return {
      ok: false,
      message: errorMsg,
    };
  }
}

/** Cek apakah sudah ada pengajuan izin sebelumnya untuk sesi & praktikan ini. */
export async function checkExistingLeaveRequest(
  sessionId: string,
  praktikanUid: string
): Promise<PengajuanIzin | null> {
  const requestId = `leave_${sessionId}_${praktikanUid}`;

  if (!isFirebaseConfigured()) {
    return mockLeaveRequests.get(requestId) ?? null;
  }

  try {
    const q = query(
      collection(db, 'leaveRequests'),
      where('sessionId', '==', sessionId),
      where('praktikanUid', '==', praktikanUid)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    return mapDocToLeaveRequest(docSnap.id, data);
  } catch {
    return null;
  }
}

/**
 * Berlangganan real-time seluruh pengajuan izin milik praktikan yang sedang login.
 * FR-S2-13 & FR-S2-20: Otomatis menerima pembaruan status (Disetujui/Ditolak) saat asisten memutuskan.
 * Mengembalikan fungsi unsubscribe untuk dilepas saat logout / unmount.
 */
export function subscribeMyLeaveRequests(
  praktikanUid: string,
  onUpdate: (requests: PengajuanIzin[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured()) {
    const list: PengajuanIzin[] = [];
    mockLeaveRequests.forEach((req) => {
      if (req.praktikanUid === praktikanUid) {
        list.push(req);
      }
    });
    // Urutkan terbaru di awal
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    onUpdate(list);
    return () => {};
  }

  const q = query(
    collection(db, 'leaveRequests'),
    where('praktikanUid', '==', praktikanUid)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: PengajuanIzin[] = snapshot.docs.map((docSnap) =>
        mapDocToLeaveRequest(docSnap.id, docSnap.data())
      );
      // Urutkan tanggal terbaru di awal
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onUpdate(items);
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
 * Berlangganan real-time terhadap satu dokumen izin tertentu.
 */
export function subscribeSingleLeaveRequest(
  requestId: string,
  onUpdate: (request: PengajuanIzin | null) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured()) {
    const item = mockLeaveRequests.get(requestId) ?? null;
    onUpdate(item);
    return () => {};
  }

  const leaveDocRef = doc(db, 'leaveRequests', requestId);

  const unsubscribe = onSnapshot(
    leaveDocRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate(mapDocToLeaveRequest(snapshot.id, snapshot.data()));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    }
  );

  return unsubscribe;
}

// Mapper data Firestore ke interface PengajuanIzin
function mapDocToLeaveRequest(id: string, data: Record<string, unknown>): PengajuanIzin {
  return {
    id,
    sesiId: (data.sessionId as string) || '',
    classId: (data.classId as string) || '',
    praktikanUid: (data.praktikanUid as string) || '',
    alasan: (data.alasan as string) || '',
    aiStatus: (data.aiStatus as PengajuanIzin['aiStatus']) || 'tidak_tersedia',
    aiCategory: (data.aiCategory as string) || undefined,
    aiConfidence: typeof data.aiConfidence === 'number' ? data.aiConfidence : undefined,
    aiModel: (data.aiModel as string) || undefined,
    aiProcessedAt: formatTimestamp(data.aiProcessedAt),
    status: (data.status as PengajuanIzin['status']) || 'menunggu',
    reviewerUid: (data.reviewerUid as string) || undefined,
    reviewedAt: formatTimestamp(data.reviewedAt),
    reviewNote: (data.reviewNote as string) || undefined,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

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
