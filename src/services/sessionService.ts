import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type QuerySnapshot,
  Timestamp,
} from 'firebase/firestore';
import type { Sesi, StatusSesi } from '@/types/siprak';
import { db } from '@/lib/firebase';

function asIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return undefined;
}

function mapSession(id: string, data: DocumentData): Sesi {
  return {
    id,
    scheduleId: typeof data.scheduleId === 'string' ? data.scheduleId : undefined,
    classId: typeof data.classId === 'string' ? data.classId : undefined,
    praktikum: typeof data.praktikum === 'string' ? data.praktikum : '',
    pertemuan: typeof data.pertemuan === 'number' ? data.pertemuan : 0,
    kelas: typeof data.kelas === 'string' ? data.kelas : (typeof data.className === 'string' ? data.className : String(data.classId ?? '-')),
    lab: typeof data.lab === 'string' ? data.lab : '-',
    tanggal: typeof data.tanggal === 'string' ? data.tanggal : '',
    jamMulai: typeof data.jamMulai === 'string' ? data.jamMulai : '',
    jamSelesai: typeof data.jamSelesai === 'string' ? data.jamSelesai : '',
    status: data.status as StatusSesi,
    dibukaPada: asIso(data.dibukaPada) ?? asIso(data.openedAt),
    ditutupPada: asIso(data.ditutupPada) ?? asIso(data.closedAt),
    catatanPenutup: typeof data.catatanPenutup === 'string' ? data.catatanPenutup : undefined,
  };
}

function sortSessions(items: Sesi[]): Sesi[] {
  return items.sort((left, right) =>
    `${left.tanggal}T${left.jamMulai}`.localeCompare(`${right.tanggal}T${right.jamMulai}`),
  );
}

/** Live session list restricted to classes assigned to this assistant. */
export function subscribeAssistantSessions(
  assistantUid: string,
  onUpdate: (sessions: Sesi[]) => void,
  onError: (error: Error) => void,
): () => void {
  const classQuery = query(
    collection(db, 'classes'),
    where('assistantUids', 'array-contains', assistantUid),
    where('active', '==', true),
  );
  const sessionUnsubscribers = new Map<string, () => void>();
  const sessionsByClass = new Map<string, Sesi[]>();
  const emit = () => onUpdate(sortSessions([...sessionsByClass.values()].flat()));

  const unsubscribeClasses = onSnapshot(classQuery, (snapshot) => {
    const classIds = new Set(snapshot.docs.map((item) => item.id));
    for (const [classId, unsubscribe] of sessionUnsubscribers) {
      if (!classIds.has(classId)) {
        unsubscribe();
        sessionUnsubscribers.delete(classId);
        sessionsByClass.delete(classId);
      }
    }
    for (const classId of classIds) {
      if (sessionUnsubscribers.has(classId)) continue;
      const sessionQuery = query(collection(db, 'sessions'), where('classId', '==', classId));
      const unsubscribe = onSnapshot(
        sessionQuery,
        (sessionSnapshot: QuerySnapshot<DocumentData>) => {
          sessionsByClass.set(
            classId,
            sessionSnapshot.docs
              .filter((item) => item.data().active !== false)
              .map((item) => mapSession(item.id, item.data())),
          );
          emit();
        },
        onError,
      );
      sessionUnsubscribers.set(classId, unsubscribe);
    }
    emit();
  }, onError);

  return () => {
    unsubscribeClasses();
    sessionUnsubscribers.forEach((unsubscribe) => unsubscribe());
    sessionUnsubscribers.clear();
    sessionsByClass.clear();
  };
}

/** Subscribe to one session so the action panel always uses the server's latest state. */
export function subscribeSession(
  sessionId: string,
  onUpdate: (session: Sesi | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'sessions', sessionId),
    (snapshot) => onUpdate(snapshot.exists() ? mapSession(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

async function transitionSession(
  sessionId: string,
  from: StatusSesi,
  to: StatusSesi,
  note?: string,
): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists()) throw new Error('Sesi tidak ditemukan. Muat ulang jadwal dan coba lagi.');
    const currentStatus = snapshot.data().status as StatusSesi;
    if (currentStatus !== from) {
      throw new Error('Status sesi sudah berubah. Perbarui layar sebelum mencoba lagi.');
    }

    const update = to === 'dibuka'
      ? { status: to, dibukaPada: serverTimestamp(), updatedAt: serverTimestamp() }
      : {
          status: to,
          ditutupPada: serverTimestamp(),
          catatanPenutup: note?.trim() || '',
          updatedAt: serverTimestamp(),
        };
    transaction.update(sessionRef, update);
  });
}

export function openSession(sessionId: string): Promise<void> {
  return transitionSession(sessionId, 'belum_dibuka', 'dibuka');
}

export function closeSession(sessionId: string, note?: string): Promise<void> {
  return transitionSession(sessionId, 'dibuka', 'ditutup', note);
}
