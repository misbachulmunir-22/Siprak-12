import {
  dummyAttendances,
  dummyPraktikanList,
  dummySessions,
} from '@/data/dummy';
import { authService, formatAuthError } from '@/services/authService';
import { userService } from '@/services/userService';
import {
  AuthActionResult,
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
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const SiprakContext = createContext<SiprakContextValue | null>(null);

export interface SiprakProviderProps {
  children: ReactNode;
}

export function SiprakProvider({ children }: SiprakProviderProps) {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Data kompatibilitas Sprint 1 dipertahankan agar layar lama tidak rusak.
  // Modul Sprint 2 tetap memakai service Firestore masing-masing.
  const [sessions, setSessions] = useState<Sesi[]>(() => [...dummySessions]);
  const [attendances, setAttendances] = useState<Presensi[]>(() => [
    ...dummyAttendances,
  ]);
  const [praktikanList] = useState<Pengguna[]>(() => [...dummyPraktikanList]);

  const currentUserRef = useRef<Pengguna | null>(currentUser);
  const sessionsRef = useRef<Sesi[]>(sessions);
  const attendancesRef = useRef<Presensi[]>(attendances);
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);
  const isRegisteringRef = useRef(false);
  const cleanupListenersRef = useRef<Set<() => void>>(new Set());

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    attendancesRef.current = attendances;
  }, [attendances]);

  const cleanupPrivateListeners = useCallback(() => {
    profileUnsubscribeRef.current?.();
    profileUnsubscribeRef.current = null;

    cleanupListenersRef.current.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // Satu listener gagal dibersihkan tidak boleh menghentikan cleanup lain.
      }
    });
    cleanupListenersRef.current.clear();
  }, []);

  const clearPrivateState = useCallback(() => {
    cleanupPrivateListeners();
    setCurrentUser(null);
    currentUserRef.current = null;
  }, [cleanupPrivateListeners]);

  // Pulihkan sesi Firebase dan dengarkan profil/role dari users/{uid}.
  useEffect(() => {
    const unsubscribeAuth = authService.subscribeAuthState((firebaseUser) => {
      profileUnsubscribeRef.current?.();
      profileUnsubscribeRef.current = null;
      setCurrentUser(null);
      currentUserRef.current = null;
      setAuthError(null);

      if (!firebaseUser) {
        clearPrivateState();
        setAuthStatus('unauthenticated');
        return;
      }

      setAuthStatus('initializing');
      profileUnsubscribeRef.current = userService.subscribeUserProfile(
        firebaseUser.uid,
        (profile) => {
          if (!profile) {
            // Observer Auth bisa berjalan sebelum dokumen profil registrasi dibuat.
            if (isRegisteringRef.current) {
              setAuthStatus('initializing');
              return;
            }
            setCurrentUser(null);
            currentUserRef.current = null;
            setAuthStatus('profile-pending');
            setAuthError(
              'Profil users/{uid} belum tersedia. Hubungi pengelola praktikum untuk pemeriksaan akun.'
            );
            return;
          }

          setCurrentUser(profile);
          currentUserRef.current = profile;
          if (profile.aktif !== true) {
            setAuthStatus('profile-pending');
            setAuthError(
              'Akun Anda belum aktif. Hubungi pengelola praktikum untuk aktivasi.'
            );
            return;
          }

          setAuthError(null);
          setAuthStatus('authenticated');
        },
        (error) => {
          setCurrentUser(null);
          currentUserRef.current = null;
          setAuthStatus('profile-error');
          setAuthError(formatAuthError(error));
        }
      );
    });

    return () => {
      unsubscribeAuth();
      cleanupPrivateListeners();
    };
  }, [clearPrivateState, cleanupPrivateListeners]);

  const loginWithEmail = useCallback(
    async (input: LoginInput): Promise<AuthActionResult> => {
      setIsAuthenticating(true);
      setAuthError(null);
      try {
        await authService.login(input);
        // onAuthStateChanged akan memuat profil dan role dari Firestore.
        return { ok: true };
      } catch (error) {
        const message = formatAuthError(error);
        setAuthError(message);
        return { ok: false, error: message };
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  const registerAccount = useCallback(
    async (input: RegisterInput): Promise<AuthActionResult> => {
      setIsAuthenticating(true);
      isRegisteringRef.current = true;
      setAuthError(null);
      try {
        await authService.register(input);
        return { ok: true };
      } catch (error) {
        const message = formatAuthError(error);
        setAuthError(message);
        return { ok: false, error: message };
      } finally {
        isRegisteringRef.current = false;
        setIsAuthenticating(false);
      }
    },
    []
  );

  const refreshProfile = useCallback(async (): Promise<void> => {
    const firebaseUser = authService.getCurrentAuthUser();
    if (!firebaseUser) {
      setCurrentUser(null);
      currentUserRef.current = null;
      setAuthStatus('unauthenticated');
      return;
    }

    setAuthStatus('initializing');
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const profile = await userService.refreshOwnProfile(firebaseUser.uid);
      if (!profile) {
        setCurrentUser(null);
        currentUserRef.current = null;
        setAuthStatus('profile-pending');
        setAuthError('Profil pengguna belum ditemukan di Cloud Firestore.');
        return;
      }

      setCurrentUser(profile);
      currentUserRef.current = profile;
      if (profile.aktif !== true) {
        setAuthStatus('profile-pending');
        setAuthError('Akun Anda belum aktif. Hubungi pengelola praktikum.');
        return;
      }

      setAuthError(null);
      setAuthStatus('authenticated');
    } catch (error) {
      setAuthStatus('profile-error');
      setAuthError(formatAuthError(error));
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const registerCleanupListener = useCallback((unsubscribe: () => void) => {
    cleanupListenersRef.current.add(unsubscribe);
    return () => {
      cleanupListenersRef.current.delete(unsubscribe);
      unsubscribe();
    };
  }, []);

  const login = useCallback((_userId: string): void => {
    setAuthError('Gunakan login email dan kata sandi Firebase.');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      clearPrivateState();
      setAuthError(null);
      setAuthStatus('unauthenticated');
    } catch (error) {
      const message = formatAuthError(error);
      setAuthError(message);
      throw error;
    }
  }, [clearPrivateState]);

  const openSession = useCallback((sesiId: string): void => {
    const user = currentUserRef.current;
    if (!user || user.peran !== 'asisten') return;

    const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
    if (!targetSession || targetSession.status !== 'belum_dibuka') return;

    const now = new Date().toISOString();
    const updatedSessions = sessionsRef.current.map((s) =>
      s.id === sesiId && s.status === 'belum_dibuka'
        ? { ...s, status: 'dibuka' as StatusSesi, dibukaPada: s.dibukaPada ?? now }
        : s
    );
    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);
  }, []);

  const closeSession = useCallback((sesiId: string, catatan?: string): void => {
    const user = currentUserRef.current;
    if (!user || user.peran !== 'asisten') return;

    const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
    if (!targetSession || targetSession.status !== 'dibuka') return;

    const now = new Date().toISOString();
    const trimmedCatatan = catatan?.trim();
    const updatedSessions = sessionsRef.current.map((s) =>
      s.id === sesiId && s.status === 'dibuka'
        ? {
            ...s,
            status: 'ditutup' as StatusSesi,
            ditutupPada: s.ditutupPada ?? now,
            catatanPenutup: trimmedCatatan ? trimmedCatatan : s.catatanPenutup,
          }
        : s
    );
    sessionsRef.current = updatedSessions;
    setSessions(updatedSessions);
  }, []);

  const checkIn = useCallback(
    (sesiId: string): {
      ok: boolean;
      reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi';
    } => {
      const user = currentUserRef.current;
      if (!user || user.peran !== 'praktikan') return { ok: false };

      const targetSession = sessionsRef.current.find((s) => s.id === sesiId);
      if (!targetSession) return { ok: false };
      if (!user.kelas || user.kelas !== targetSession.kelas) return { ok: false };
      if (targetSession.status === 'belum_dibuka') {
        return { ok: false, reason: 'belum_dibuka' };
      }
      if (targetSession.status === 'ditutup') {
        return { ok: false, reason: 'ditutup' };
      }

      const isAlreadyCheckedIn = attendancesRef.current.some(
        (att) => att.sesiId === sesiId && att.praktikanId === user.id
      );
      if (isAlreadyCheckedIn) return { ok: false, reason: 'sudah_presensi' };

      const newPresensi: Presensi = {
        id: `presensi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sesiId,
        praktikanId: user.id,
        praktikanUid: user.id,
        waktuHadir: new Date().toISOString(),
      };
      const updatedAttendances = [...attendancesRef.current, newPresensi];
      attendancesRef.current = updatedAttendances;
      setAttendances(updatedAttendances);
      return { ok: true };
    },
    []
  );

  const getAttendance = useCallback(
    (sesiId: string): Presensi[] =>
      attendancesRef.current.filter((attendance) => attendance.sesiId === sesiId),
    []
  );

  const getUserAttendance = useCallback(
    (userId: string): Presensi[] =>
      attendancesRef.current.filter((attendance) => attendance.praktikanId === userId),
    []
  );

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
    logout,
    sessions,
    attendances,
    praktikanList,
    login,
    openSession,
    closeSession,
    checkIn,
    getAttendance,
    getUserAttendance,
  };

  return <SiprakContext.Provider value={value}>{children}</SiprakContext.Provider>;
}

export function useSiprakContext(): SiprakContextValue {
  const context = useContext(SiprakContext);
  if (!context) {
    throw new Error('useSiprakContext must be used within a SiprakProvider');
  }
  return context;
}
