/**
 * Context Autentikasi, Profil Firestore & Manajemen Sesi Login Siprak-12 (Sprint 2)
 * Owner: Programmer 1 (Jeje)
 * Acuan: SRS-SIPRAK12-S2-2026-001 (FR-S2-01 s.d. FR-S2-04, FR-S2-13, FR-S2-21, Bab 6.5)
 */

import {
  clearAllFirestoreListeners,
  firestoreDb,
  registerFirestoreUnsubscribe,
  serverTimestamp,
} from '@/lib/firebase';
import { authService, formatAuthError } from '@/services/authService';
import { userService } from '@/services/userService';
import type {
  AuthStatus,
  LoginInput,
  Pengguna,
  Presensi,
  RegisterInput,
  Sesi,
  SiprakContextValue,
  StatusSesi,
} from '@/types/siprak';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

const SiprakContext = createContext<SiprakContextValue | null>(null);

export interface SiprakProviderProps {
  children: ReactNode;
}

const DEMO_CREDENTIAL_BY_UID: Record<string, { email: string; password: string }> = {
  'asisten-1': { email: 'asisten@siprak.ac.id', password: 'password123' },
  'asisten-2': { email: 'asisten2@siprak.ac.id', password: 'password123' },
  'praktikan-1': { email: 'ahmad@siprak.ac.id', password: 'password123' },
  'praktikan-2': { email: 'bella@siprak.ac.id', password: 'password123' },
  'praktikan-3': { email: 'citra@siprak.ac.id', password: 'password123' },
  'praktikan-4': { email: 'dimas@siprak.ac.id', password: 'password123' },
  'praktikan-5': { email: 'eka@siprak.ac.id', password: 'password123' },
  'praktikan-6': { email: 'fajar@siprak.ac.id', password: 'password123' },
  'praktikan-7': { email: 'gita@siprak.ac.id', password: 'password123' },
};

export function SiprakProvider({ children }: SiprakProviderProps) {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // State data untuk kompatibilitas antarmuka modul lain (dibersihkan saat logout - FR-S2-03)
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [attendances, setAttendances] = useState<Presensi[]>([]);
  const [praktikanList, setPraktikanList] = useState<Pengguna[]>([]);

  const currentUserRef = useRef<Pengguna | null>(null);
  const isAuthenticatingRef = useRef<boolean>(false);
  const sessionsRef = useRef<Sesi[]>([]);
  const attendancesRef = useRef<Presensi[]>([]);
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    isAuthenticatingRef.current = isAuthenticating;
  }, [isAuthenticating]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    attendancesRef.current = attendances;
  }, [attendances]);

  const clearPrivateState = useCallback(() => {
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }
    setCurrentUser(null);
    currentUserRef.current = null;
    setSessions([]);
    sessionsRef.current = [];
    setAttendances([]);
    attendancesRef.current = [];
    setPraktikanList([]);
  }, []);

  /**
   * Memuat data sesi & presensi yang diizinkan untuk pengguna aktif dari Firestore
   */
  const syncAuthorizedWorkspaceData = useCallback(async (user: Pengguna) => {
    try {
      const sessionIds = ['sesi-1', 'sesi-2', 'sesi-3'];
      const loadedSessions: Sesi[] = [];
      for (const sId of sessionIds) {
        try {
          const doc = await firestoreDb.getDoc<Sesi>(`sessions/${sId}`, user.id);
          if (doc) loadedSessions.push(doc);
        } catch {
          // Abaikan sesi yang tidak termasuk kewenangan kelas pengguna
        }
      }
      setSessions(loadedSessions);
      sessionsRef.current = loadedSessions;

      if (user.peran === 'asisten') {
        const pIds = [
          'praktikan-1',
          'praktikan-2',
          'praktikan-3',
          'praktikan-4',
          'praktikan-5',
          'praktikan-6',
        ];
        const loadedPraktikan: Pengguna[] = [];
        for (const pId of pIds) {
          try {
            const pProfile = await userService.getUserProfile(pId);
            if (pProfile && pProfile.aktif) {
              loadedPraktikan.push(pProfile);
            }
          } catch {
            // Abaikan
          }
        }
        setPraktikanList(loadedPraktikan);

        const loadedAtt: Presensi[] = [];
        for (const s of loadedSessions) {
          for (const p of loadedPraktikan) {
            try {
              const att = await firestoreDb.getDoc<Presensi>(
                `attendances/${s.id}_${p.id}`,
                user.id
              );
              if (att) loadedAtt.push(att);
            } catch {
              // Abaikan
            }
          }
        }
        setAttendances(loadedAtt);
        attendancesRef.current = loadedAtt;
      } else {
        const loadedAtt: Presensi[] = [];
        for (const s of loadedSessions) {
          try {
            const att = await firestoreDb.getDoc<Presensi>(
              `attendances/${s.id}_${user.id}`,
              user.id
            );
            if (att) loadedAtt.push(att);
          } catch {
            // Abaikan
          }
        }
        setAttendances(loadedAtt);
        attendancesRef.current = loadedAtt;
      }
    } catch {
      // Penanganan error spesifik dilakukan per layar oleh service masing-masing
    }
  }, []);

  /**
   * Memuat dan memasang listener real-time pada dokumen profil `users/{uid}` (FR-S2-03, FR-S2-04)
   */
  const attachProfileObserver = useCallback(
    (uid: string) => {
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      const unsubscribe = userService.subscribeUserProfile(
        uid,
        (profile) => {
          if (!profile) {
            // Saat proses registrasi sedang menulis profil awal ke Firestore, tunggu hingga selesai
            if (isAuthenticatingRef.current) {
              return;
            }
            setCurrentUser(null);
            currentUserRef.current = null;
            setAuthStatus('profile-pending');
            setAuthError(
              'Dokumen profil akun Anda belum tersedia di Firestore. Silakan hubungi pengelola praktikum.'
            );
            return;
          }

          setCurrentUser(profile);
          currentUserRef.current = profile;

          if (!profile.aktif) {
            setAuthStatus('profile-pending');
            setAuthError(
              'Akun Anda sedang menunggu aktivasi atau dinonaktifkan oleh pengelola laboratorium.'
            );
            return;
          }

          setAuthError(null);
          setAuthStatus('authenticated');
          void syncAuthorizedWorkspaceData(profile);
        },
        (err) => {
          setAuthError(formatAuthError(err));
          setAuthStatus('profile-error');
        }
      );

      profileUnsubscribeRef.current = unsubscribe;
    },
    [syncAuthorizedWorkspaceData]
  );

  // Observer Firebase Authentication saat aplikasi pertama kali dijalankan (FR-S2-03)
  useEffect(() => {
    const unsubscribeAuth = authService.subscribeAuthState((authUser) => {
      if (!authUser) {
        clearPrivateState();
        setAuthStatus('unauthenticated');
        return;
      }

      attachProfileObserver(authUser.uid);
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
      }
    };
  }, [attachProfileObserver, clearPrivateState]);

  // A. loginWithEmail (FR-S2-02)
  const loginWithEmail = useCallback(
    async (input: LoginInput): Promise<{ ok: boolean; error?: string }> => {
      setIsAuthenticating(true);
      setAuthError(null);
      try {
        const profile = await authService.login(input);
        setCurrentUser(profile);
        currentUserRef.current = profile;

        if (!profile.aktif) {
          setAuthStatus('profile-pending');
          return { ok: true };
        }

        setAuthStatus('authenticated');
        await syncAuthorizedWorkspaceData(profile);
        return { ok: true };
      } catch (err) {
        const message = formatAuthError(err);
        setAuthError(message);
        return { ok: false, error: message };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [syncAuthorizedWorkspaceData]
  );

  // B. registerAccount (FR-S2-01)
  const registerAccount = useCallback(
    async (input: RegisterInput): Promise<{ ok: boolean; error?: string }> => {
      setIsAuthenticating(true);
      setAuthError(null);
      try {
        const profile = await authService.register(input);
        setCurrentUser(profile);
        currentUserRef.current = profile;
        setAuthStatus(profile.aktif ? 'authenticated' : 'profile-pending');
        if (profile.aktif) {
          await syncAuthorizedWorkspaceData(profile);
        }
        return { ok: true };
      } catch (err) {
        const message = formatAuthError(err);
        setAuthError(message);
        return { ok: false, error: message };
      } finally {
        setIsAuthenticating(false);
      }
    },
    [syncAuthorizedWorkspaceData]
  );

  // C. refreshProfile (FR-S2-21: tombol Coba Lagi saat gagal memuat profil)
  const refreshProfile = useCallback(async (): Promise<void> => {
    const authUser = authService.getCurrentAuthUser();
    if (!authUser) {
      setAuthStatus('unauthenticated');
      return;
    }

    setAuthStatus('initializing');
    setAuthError(null);
    try {
      const profile = await userService.getUserProfile(authUser.uid);
      if (!profile) {
        setCurrentUser(null);
        setAuthStatus('profile-pending');
        setAuthError('Profil pengguna belum ditemukan di Cloud Firestore.');
        return;
      }
      setCurrentUser(profile);
      currentUserRef.current = profile;
      if (!profile.aktif) {
        setAuthStatus('profile-pending');
        return;
      }
      setAuthStatus('authenticated');
      await syncAuthorizedWorkspaceData(profile);
    } catch (err) {
      setAuthError(formatAuthError(err));
      setAuthStatus('profile-error');
    }
  }, [syncAuthorizedWorkspaceData]);

  // D. clearAuthError
  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // E. registerCleanupListener (FR-S2-13)
  const registerCleanupListener = useCallback(
    (unsubscribe: () => void): (() => void) => {
      return registerFirestoreUnsubscribe(unsubscribe);
    },
    []
  );

  // F. logout (FR-S2-03)
  const logout = useCallback(async (): Promise<void> => {
    clearAllFirestoreListeners();
    clearPrivateState();
    setAuthError(null);
  }, [clearPrivateState]);

  // G. login(userId) untuk kompatibilitas pemanggilan berdasarkan UID
  const login = useCallback(
    (userId: string): void => {
      const cred = DEMO_CREDENTIAL_BY_UID[userId];
      if (cred) {
        void loginWithEmail(cred);
      }
    },
    [loginWithEmail]
  );

  // H. openSession(sesiId) terhubung ke Firestore
  const openSession = useCallback((sesiId: string): void => {
    const user = currentUserRef.current;
    if (!user || user.peran !== 'asisten') return;

    const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
    if (!targetSession || targetSession.status !== 'belum_dibuka') return;

    const now = serverTimestamp();
    const updatedSessions = sessionsRef.current.map((s) =>
      s.id === sesiId && s.status === 'belum_dibuka'
        ? { ...s, status: 'dibuka' as StatusSesi, dibukaPada: s.dibukaPada ?? now, updatedAt: now }
        : s
    );
    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);

    void firestoreDb.updateDoc(
      `sessions/${sesiId}`,
      { status: 'dibuka', dibukaPada: now, updatedAt: now },
      user.id
    );
  }, []);

  // I. closeSession(sesiId, catatan?) terhubung ke Firestore
  const closeSession = useCallback((sesiId: string, catatan?: string): void => {
    const user = currentUserRef.current;
    if (!user || user.peran !== 'asisten') return;

    const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
    if (!targetSession || targetSession.status !== 'dibuka') return;

    const now = serverTimestamp();
    const trimmedCatatan = catatan?.trim();
    const updatedSessions = sessionsRef.current.map((s) =>
      s.id === sesiId && s.status === 'dibuka'
        ? {
          ...s,
          status: 'ditutup' as StatusSesi,
          ditutupPada: s.ditutupPada ?? now,
          catatanPenutup: trimmedCatatan ? trimmedCatatan : s.catatanPenutup,
          updatedAt: now,
        }
        : s
    );
    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);

    void firestoreDb.updateDoc(
      `sessions/${sesiId}`,
      {
        status: 'ditutup',
        ditutupPada: now,
        ...(trimmedCatatan ? { catatanPenutup: trimmedCatatan } : {}),
        updatedAt: now,
      },
      user.id
    );
  }, []);

  // J. checkIn(sesiId) dengan ID deterministik `${sesiId}_${uid}` (FR-S2-11, FR-S2-12)
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

      if (user.kelas && targetSession.kelas && user.kelas !== targetSession.kelas) {
        return { ok: false };
      }

      if (targetSession.status === 'belum_dibuka') {
        return { ok: false, reason: 'belum_dibuka' };
      }

      if (targetSession.status === 'ditutup') {
        return { ok: false, reason: 'ditutup' };
      }

      const deterministicId = `${sesiId}_${user.id}`;
      const isAlreadyCheckedIn = attendancesRef.current.some(
        (att) =>
          att.id === deterministicId ||
          (att.sesiId === sesiId &&
            (att.praktikanId === user.id || att.praktikanUid === user.id))
      );
      if (isAlreadyCheckedIn) {
        return { ok: false, reason: 'sudah_presensi' };
      }

      const now = serverTimestamp();
      const newPresensi: Presensi = {
        id: deterministicId,
        sesiId,
        sessionId: sesiId,
        classId: targetSession.classId ?? 'kelas-a',
        praktikanUid: user.id,
        praktikanId: user.id,
        waktuHadir: now,
        createdAt: now,
      };

      attendancesRef.current = [...attendancesRef.current, newPresensi];
      setAttendances(attendancesRef.current);

      void firestoreDb.createDoc(
        `attendances/${deterministicId}`,
        newPresensi as unknown as Record<string, unknown>,
        user.id
      );

      return { ok: true };
    },
    []
  );

  const getAttendance = useCallback((sesiId: string): Presensi[] => {
    return attendancesRef.current.filter((a) => a.sesiId === sesiId);
  }, []);

  const getUserAttendance = useCallback((userId: string): Presensi[] => {
    return attendancesRef.current.filter(
      (a) => a.praktikanId === userId || a.praktikanUid === userId
    );
  }, []);

  const value: SiprakContextValue = {
    currentUser,
    authStatus,
    authError,
    isAuthenticating,
    loginWithEmail,
    registerAccount,
    refreshProfile,
    clearAuthError,
    registerCleanupListener,
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
