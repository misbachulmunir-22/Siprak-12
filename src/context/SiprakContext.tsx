import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Pengguna,
  Sesi,
  Presensi,
  SiprakContextValue,
} from '@/types/siprak';
import {
  dummyAsisten,
  dummyPraktikanList,
  dummySessions,
  dummyAttendances,
} from '@/data/dummy';

const SiprakContext = createContext<SiprakContextValue | undefined>(undefined);

export function SiprakProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(dummyAsisten);
  const [sessions, setSessions] = useState<Sesi[]>(dummySessions);
  const [attendances, setAttendances] = useState<Presensi[]>(dummyAttendances);
  const [praktikanList] = useState<Pengguna[]>(dummyPraktikanList);

  const login = (userId: string) => {
    if (userId === dummyAsisten.id) {
      setCurrentUser(dummyAsisten);
      return;
    }
    const found = praktikanList.find((p) => p.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const openSession = (sesiId: string) => {
    const timestamp = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sesiId
          ? {
              ...s,
              status: 'dibuka',
              dibukaPada: timestamp,
            }
          : s
      )
    );
  };

  const closeSession = (sesiId: string, catatan?: string) => {
    const timestamp = new Date().toISOString();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sesiId
          ? {
              ...s,
              status: 'ditutup',
              ditutupPada: timestamp,
              catatanPenutup: catatan?.trim() ? catatan.trim() : undefined,
            }
          : s
      )
    );
  };

  const checkIn = (sesiId: string): { ok: boolean; reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi' } => {
    if (!currentUser || currentUser.peran !== 'praktikan') {
      return { ok: false };
    }

    const sesi = sessions.find((s) => s.id === sesiId);
    if (!sesi) {
      return { ok: false };
    }

    if (sesi.status === 'belum_dibuka') {
      return { ok: false, reason: 'belum_dibuka' };
    }

    if (sesi.status === 'ditutup') {
      return { ok: false, reason: 'ditutup' };
    }

    const alreadyChecked = attendances.some(
      (a) => a.sesiId === sesiId && a.praktikanId === currentUser.id
    );

    if (alreadyChecked) {
      return { ok: false, reason: 'sudah_presensi' };
    }

    const newAttendance: Presensi = {
      id: `prs-${Date.now()}`,
      sesiId,
      praktikanId: currentUser.id,
      waktuHadir: new Date().toISOString(),
    };

    setAttendances((prev) => [...prev, newAttendance]);
    return { ok: true };
  };

  const getAttendance = (sesiId: string): Presensi[] => {
    return attendances.filter((a) => a.sesiId === sesiId);
  };

  const getUserAttendance = (userId: string): Presensi[] => {
    return attendances.filter((a) => a.praktikanId === userId);
  };

  return (
    <SiprakContext.Provider
      value={{
        currentUser,
        sessions,
        attendances,
        praktikanList,
        login,
        logout,
        openSession,
        closeSession,
        checkIn,
        getAttendance,
        getUserAttendance,
      }}
    >
      {children}
    </SiprakContext.Provider>
  );
}

export function useSiprakContext(): SiprakContextValue {
  const context = useContext(SiprakContext);
  if (!context) {
    throw new Error('useSiprakContext harus digunakan di dalam SiprakProvider');
  }
  return context;
}
