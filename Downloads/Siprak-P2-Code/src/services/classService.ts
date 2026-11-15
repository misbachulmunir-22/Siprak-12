import {
  addDoc, collection, collectionGroup, doc, getDoc, onSnapshot, query, serverTimestamp,
  setDoc, updateDoc, where, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { Kelas, KeanggotaanKelas } from '@/types/siprak';

const classesRef = collection(db, 'classes');

function mapClass(id: string, data: Record<string, unknown>): Kelas {
  return {
    id, nama: String(data.nama ?? ''), kode: String(data.kode ?? ''),
    namaPraktikum: String(data.namaPraktikum ?? ''),
    praktikumId: typeof data.praktikumId === 'string' ? data.praktikumId : undefined,
    assistantUids: Array.isArray(data.assistantUids) ? data.assistantUids.filter((v): v is string => typeof v === 'string') : [],
    active: data.active === true,
  };
}

function mapMember(uid: string, data: Record<string, unknown>): KeanggotaanKelas {
  return {
    uid, namaSnapshot: String(data.namaSnapshot ?? ''),
    nimSnapshot: typeof data.nimSnapshot === 'string' ? data.nimSnapshot : undefined,
    active: data.active === true,
  };
}

function validateClass(input: Pick<Kelas, 'nama' | 'kode' | 'namaPraktikum'>): void {
  if (input.nama.trim().length < 1) throw new Error('Nama kelas wajib diisi.');
  if (input.kode.trim().length < 1) throw new Error('Kode kelas wajib diisi.');
  if (input.namaPraktikum.trim().length < 1) throw new Error('Nama praktikum wajib diisi.');
}

export const classService = {
  subscribeForAssistant(uid: string, next: (items: Kelas[]) => void, fail: (error: Error) => void): Unsubscribe {
    return onSnapshot(query(classesRef, where('assistantUids', 'array-contains', uid), where('active', '==', true)),
      snap => next(snap.docs.map(d => mapClass(d.id, d.data()))),
      error => fail(error));
  },
  subscribeForStudent(uid: string, next: (items: Kelas[]) => void, fail: (error: Error) => void): Unsubscribe {
    return onSnapshot(query(collectionGroup(db, 'members'), where('uid', '==', uid), where('active', '==', true)),
      async snap => {
        try {
          const rows = await Promise.all(snap.docs.map(async member => {
            const classRef = member.ref.parent.parent;
            if (!classRef) return null;
            const classSnap = await getDoc(classRef);
            return classSnap.exists() ? mapClass(classSnap.id, classSnap.data()) : null;
          }));
          next(rows.filter((item): item is Kelas => item !== null && item.active));
        } catch (error) { fail(error instanceof Error ? error : new Error('Gagal memuat kelas.')); }
      }, fail);
  },
  subscribeMembers(classId: string, next: (items: KeanggotaanKelas[]) => void, fail: (error: Error) => void): Unsubscribe {
    return onSnapshot(collection(db, 'classes', classId, 'members'),
      snap => next(snap.docs.map(d => mapMember(d.id, d.data()))), fail);
  },
  async createClass(input: Pick<Kelas, 'nama' | 'kode' | 'namaPraktikum'>, assistantUid: string): Promise<string> {
    validateClass(input);
    const ref = await addDoc(classesRef, {
      nama: input.nama.trim(), kode: input.kode.trim().toUpperCase(),
      namaPraktikum: input.namaPraktikum.trim(), assistantUids: [assistantUid],
      active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return ref.id;
  },
  async updateClass(classId: string, input: Pick<Kelas, 'nama' | 'kode' | 'namaPraktikum'>): Promise<void> {
    validateClass(input);
    await updateDoc(doc(db, 'classes', classId), {
      nama: input.nama.trim(), kode: input.kode.trim().toUpperCase(),
      namaPraktikum: input.namaPraktikum.trim(), updatedAt: serverTimestamp(),
    });
  },
  async archiveClass(classId: string): Promise<void> {
    await updateDoc(doc(db, 'classes', classId), { active: false, archivedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  },
  async addMember(classId: string, uidInput: string): Promise<void> {
    const uid = uidInput.trim();
    if (!uid) throw new Error('UID praktikan wajib diisi.');
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (!profileSnap.exists()) throw new Error('UID tidak ditemukan. Pastikan praktikan sudah registrasi.');
    const profile = profileSnap.data();
    if (profile.role !== 'praktikan' || profile.active !== true) throw new Error('Akun harus merupakan praktikan yang aktif.');
    const memberRef = doc(db, 'classes', classId, 'members', uid);
    const existing = await getDoc(memberRef);
    if (existing.exists() && existing.data().active === true) throw new Error('Praktikan sudah terdaftar di kelas ini.');
    await setDoc(memberRef, {
      uid, namaSnapshot: String(profile.nama ?? ''), nimSnapshot: typeof profile.nim === 'string' ? profile.nim : '',
      joinedAt: serverTimestamp(), active: true,
    });
    await updateDoc(doc(db, 'users', uid), { kelasIds: Array.isArray(profile.kelasIds) ? [...new Set([...profile.kelasIds, classId])] : [classId], updatedAt: serverTimestamp() });
  },
  async removeMember(classId: string, uid: string): Promise<void> {
    await updateDoc(doc(db, 'classes', classId, 'members', uid), { active: false });
  },
};
