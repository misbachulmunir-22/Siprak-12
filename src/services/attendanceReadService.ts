import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  Timestamp,
} from 'firebase/firestore';
import type { Presensi } from '@/types/siprak';
import { db } from '@/lib/firebase';

export interface AttendanceRosterItem {
  uid: string;
  nama: string;
  nim: string;
  presensi: Presensi | null;
}

function toIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return undefined;
}

function mapAttendance(id: string, data: DocumentData): Presensi {
  return {
    id,
    sesiId: typeof data.sessionId === 'string' ? data.sessionId : '',
    classId: typeof data.classId === 'string' ? data.classId : undefined,
    praktikanUid: typeof data.praktikanUid === 'string' ? data.praktikanUid : undefined,
    praktikanId: typeof data.praktikanUid === 'string' ? data.praktikanUid : undefined,
    waktuHadir: toIso(data.waktuHadir) ?? '',
  };
}

/** Live roster + attendance for a session, scoped to one assigned class. */
export function subscribeSessionAttendance(
  sessionId: string,
  classId: string,
  onUpdate: (items: AttendanceRosterItem[]) => void,
  onError: (error: Error) => void,
): () => void {
  let members: AttendanceRosterItem[] = [];
  let attendance: Presensi[] = [];
  let membersReady = false;
  let attendanceReady = false;
  const emit = () => {
    if (!membersReady || !attendanceReady) return;
    const byUid = new Map(attendance.map((item) => [item.praktikanUid ?? item.praktikanId ?? '', item]));
    onUpdate(members.map((member) => ({
      ...member,
      presensi: byUid.get(member.uid) ?? null,
    })));
  };

  const memberQuery = query(
    collection(db, 'classes', classId, 'members'),
    where('active', '==', true),
  );
  const attendanceQuery = query(
    collection(db, 'attendances'),
    where('classId', '==', classId),
    where('sessionId', '==', sessionId),
  );

  const unsubscribeMembers = onSnapshot(memberQuery, (snapshot) => {
    members = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        uid: item.id,
        nama: typeof data.namaSnapshot === 'string' ? data.namaSnapshot : 'Nama tidak tersedia',
        nim: typeof data.nimSnapshot === 'string' ? data.nimSnapshot : '-',
        presensi: null,
      };
    });
    membersReady = true;
    emit();
  }, onError);

  const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
    attendance = snapshot.docs.map((item) => mapAttendance(item.id, item.data()));
    attendanceReady = true;
    emit();
  }, onError);

  return () => {
    unsubscribeMembers();
    unsubscribeAttendance();
  };
}
