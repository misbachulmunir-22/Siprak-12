import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  Pengguna,
  Presensi,
  Sesi,
  SiprakContextValue,
  StatusSesi,
} from '@/types/siprak';
import {
  dummyAsisten,
  dummyAttendances,
  dummyPraktikanList,
  dummySessions,
} from '@/data/dummy';

const SiprakContext = createContext<SiprakContextValue | null>(null);

export interface SiprakProviderProps {
  children: ReactNode;
}

export function SiprakProvider({ children }: SiprakProviderProps) {
  // A. currentUser awal null
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [sessions, setSessions] = useState<Sesi[]>(() => [...dummySessions]);
  const [attendances, setAttendances] = useState<Presensi[]>(() => [
    ...dummyAttendances,
  ]);
  const [praktikanList] = useState<Pengguna[]>(() => [
    ...dummyPraktikanList,
  ]);

  // Synchronized refs to allow synchronous reads and prevent double-tap race conditions
  const currentUserRef = useRef<Pengguna | null>(currentUser);
  const sessionsRef = useRef<Sesi[]>(sessions);
  const attendancesRef = useRef<Presensi[]>(attendances);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    attendancesRef.current = attendances;
  }, [attendances]);

  // B. login(userId)
  const login = useCallback(
    (userId: string): void => {
      if (dummyAsisten.id === userId) {
        setCurrentUser(dummyAsisten);
        currentUserRef.current = dummyAsisten;
        return;
      }
      const praktikan = praktikanList.find((p) => p.id === userId);
      if (praktikan) {
        setCurrentUser(praktikan);
        currentUserRef.current = praktikan;
      }
    },
    [praktikanList]
  );

  // C. logout()
  const logout = useCallback((): void => {
    setCurrentUser(null);
    currentUserRef.current = null;
  }, []);

  // D. openSession(sesiId)
  const openSession = useCallback((sesiId: string): void => {
    const user = currentUserRef.current;
    if (!user || user.peran !== 'asisten') {
      return;
    }

    const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
    if (!targetSession || targetSession.status !== 'belum_dibuka') {
      return;
    }

    const now = new Date().toISOString();
    const updatedSessions = sessionsRef.current.map((s) => {
      if (s.id === sesiId && s.status === 'belum_dibuka') {
        return {
          ...s,
          status: 'dibuka' as StatusSesi,
          dibukaPada: s.dibukaPada ?? now,
        };
      }
      return s;
    });

    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);
  }, []);

  // E. closeSession(sesiId, catatan?)
  const closeSession = useCallback((sesiId: string, catatan?: string): void => {
    const user = currentUserRef.current;
    if (!user || user.peran !== 'asisten') {
      return;
    }

    const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
    if (!targetSession || targetSession.status !== 'dibuka') {
      return;
    }

    const now = new Date().toISOString();
    const trimmedCatatan = catatan?.trim();

    const updatedSessions = sessionsRef.current.map((s) => {
      if (s.id === sesiId && s.status === 'dibuka') {
        return {
          ...s,
          status: 'ditutup' as StatusSesi,
          ditutupPada: s.ditutupPada ?? now,
          catatanPenutup: trimmedCatatan ? trimmedCatatan : s.catatanPenutup,
        };
      }
      return s;
    });

    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);
  }, []);

  // F. checkIn(sesiId)
  const checkIn = useCallback(
    (
      sesiId: string
    ): {
      ok: boolean;
      reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi';
    } => {
      const user = currentUserRef.current;
      if (!user || user.peran !== 'praktikan') {
        return { ok: false };
      }

      const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
      if (!targetSession) {
        return { ok: false };
      }

      // Praktikan harus memiliki kelas yang sama dengan sesi
      if (!user.kelas || user.kelas !== targetSession.kelas) {
        return { ok: false };
      }

      // Sesi belum dibuka
      if (targetSession.status === 'belum_dibuka') {
        return { ok: false, reason: 'belum_dibuka' };
      }

      // Sesi ditutup
      if (targetSession.status === 'ditutup') {
        return { ok: false, reason: 'ditutup' };
      }

      // Presensi sudah ada pada pasangan sesiId + praktikanId
      // Memeriksa attendancesRef.current secara sinkron untuk memblokir ketukan cepat
      const isAlreadyCheckedIn = attendancesRef.current.some(
        (att) => att.sesiId === sesiId && att.praktikanId === user.id
      );
      if (isAlreadyCheckedIn) {
        return { ok: false, reason: 'sudah_presensi' };
      }

      const newPresensi: Presensi = {
        id: `presensi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sesiId,
        praktikanId: user.id,
        waktuHadir: new Date().toISOString(),
      };

      // Perbarui ref segera agar panggilan cepat berikutnya langsung melihat presensi baru
      attendancesRef.current = [...attendancesRef.current, newPresensi];
      setAttendances(attendancesRef.current);

      return { ok: true };
    },
    []
  );

  // G. getAttendance(sesiId)
  const getAttendance = useCallback((sesiId: string): Presensi[] => {
    return attendancesRef.current.filter((a) => a.sesiId === sesiId);
  }, []);

  // H. getUserAttendance(userId)
  const getUserAttendance = useCallback((userId: string): Presensi[] => {
    return attendancesRef.current.filter((a) => a.praktikanId === userId);
  }, []);

  const value: SiprakContextValue = {
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
  };

  return (
    <SiprakContext.Provider value={value}>{children}</SiprakContext.Provider>
  );
}

export function useSiprakContext(): SiprakContextValue {
  const context = useContext(SiprakContext);
  if (!context) {
    throw new Error('useSiprakContext must be used within a SiprakProvider');
  }
  return context;
}
