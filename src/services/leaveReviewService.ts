import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  Timestamp,
} from 'firebase/firestore';
import type { PengajuanIzin, StatusIzin } from '@/types/siprak';
import { db } from '@/lib/firebase';

function toIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return undefined;
}

function mapRequest(id: string, data: DocumentData): PengajuanIzin {
  return {
    id,
    sesiId: typeof data.sessionId === 'string' ? data.sessionId : '',
    classId: typeof data.classId === 'string' ? data.classId : '',
    praktikanUid: typeof data.praktikanUid === 'string' ? data.praktikanUid : '',
    alasan: typeof data.alasan === 'string' ? data.alasan : '',
    aiStatus: data.aiStatus === 'berhasil' || data.aiStatus === 'gagal' || data.aiStatus === 'tidak_tersedia'
      ? data.aiStatus
      : 'menunggu',
    aiCategory: typeof data.aiCategory === 'string' ? data.aiCategory : undefined,
    aiConfidence: typeof data.aiConfidence === 'number' ? data.aiConfidence : undefined,
    aiModel: typeof data.aiModel === 'string' ? data.aiModel : undefined,
    aiProcessedAt: toIso(data.aiProcessedAt),
    status: data.status === 'disetujui' || data.status === 'ditolak' ? data.status : 'menunggu',
    reviewerUid: typeof data.reviewerUid === 'string' ? data.reviewerUid : undefined,
    reviewedAt: toIso(data.reviewedAt),
    reviewNote: typeof data.reviewNote === 'string' ? data.reviewNote : undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export function subscribeAssistantLeaveRequests(
  assistantUid: string,
  onUpdate: (requests: PengajuanIzin[]) => void,
  onError: (error: Error) => void,
): () => void {
  const classQuery = query(
    collection(db, 'classes'),
    where('assistantUids', 'array-contains', assistantUid),
    where('active', '==', true),
  );
  const requestUnsubscribers = new Map<string, () => void>();
  const requestsByClass = new Map<string, PengajuanIzin[]>();
  const emit = () => {
    const requests = [...requestsByClass.values()].flat();
    requests.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    onUpdate(requests);
  };

  const unsubscribeClasses = onSnapshot(classQuery, (snapshot) => {
    const classIds = new Set(snapshot.docs.map((item) => item.id));
    for (const [classId, unsubscribe] of requestUnsubscribers) {
      if (!classIds.has(classId)) {
        unsubscribe();
        requestUnsubscribers.delete(classId);
        requestsByClass.delete(classId);
      }
    }
    for (const classId of classIds) {
      if (requestUnsubscribers.has(classId)) continue;
      const requestsQuery = query(collection(db, 'leaveRequests'), where('classId', '==', classId));
      const unsubscribe = onSnapshot(requestsQuery, (requestSnapshot) => {
        requestsByClass.set(
          classId,
          requestSnapshot.docs.map((item) => mapRequest(item.id, item.data())),
        );
        emit();
      }, onError);
      requestUnsubscribers.set(classId, unsubscribe);
    }
    emit();
  }, onError);

  return () => {
    unsubscribeClasses();
    requestUnsubscribers.forEach((unsubscribe) => unsubscribe());
    requestUnsubscribers.clear();
    requestsByClass.clear();
  };
}

export function subscribeLeaveRequest(
  requestId: string,
  onUpdate: (request: PengajuanIzin | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(doc(db, 'leaveRequests', requestId), (snapshot) => {
    onUpdate(snapshot.exists() ? mapRequest(snapshot.id, snapshot.data()) : null);
  }, onError);
}

export async function decideLeaveRequest(
  requestId: string,
  reviewerUid: string,
  decision: Exclude<StatusIzin, 'menunggu'>,
  note?: string,
): Promise<void> {
  const requestRef = doc(db, 'leaveRequests', requestId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists()) throw new Error('Pengajuan tidak ditemukan. Muat ulang daftar izin.');
    if (snapshot.data().status !== 'menunggu') {
      throw new Error('Pengajuan ini sudah diputuskan. Perbarui layar untuk melihat status terbaru.');
    }
    transaction.update(requestRef, {
      status: decision,
      reviewerUid,
      reviewedAt: serverTimestamp(),
      reviewNote: note?.trim() || '',
      updatedAt: serverTimestamp(),
    });
  });
}
