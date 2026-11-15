/**
 * Global Context hanya mengelola autentikasi dan profil global.
 * Data sesi/presensi/kelas wajib dikelola service/hook tiap modul (SRS Bab 6.5).
 *
 * Array dan fungsi sesi lama masih diekspos sebagai adapter transisi agar
 * komponen Sprint 1 yang belum dimigrasikan tidak gagal TypeScript.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authService, formatAuthError } from '@/services/authService';
import { userService } from '@/services/userService';
import type {
  AuthActionResult,
  AuthStatus,
  LoginInput,
  Pengguna,
  Presensi,
  RegisterInput,
  Sesi,
  SiprakContextValue,
} from '@/types/siprak';

const SiprakContext = createContext<SiprakContextValue | null>(null);

export interface SiprakProviderProps {
  children: ReactNode;
}

export function SiprakProvider({ children }: SiprakProviderProps) {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Compat data Sprint 1. Sengaja kosong: dummy.ts bukan sumber data produksi.
  const [sessions] = useState<Sesi[]>([]);
  const [attendances] = useState<Presensi[]>([]);
  const [praktikanList] = useState<Pengguna[]>([]);

  const profileUnsubscribeRef = useRef<(() => void) | null>(null);
  const isRegisteringRef = useRef(false);
  const cleanupListenersRef = useRef<Set<() => void>>(new Set());

  const cleanupPrivateListeners = useCallback(() => {
    profileUnsubscribeRef.current?.();
    profileUnsubscribeRef.current = null;

    cleanupListenersRef.current.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // Cleanup satu listener tidak boleh menghalangi cleanup listener lain.
      }
    });
    cleanupListenersRef.current.clear();
  }, []);

  const clearPrivateState = useCallback(() => {
    cleanupPrivateListeners();
    setCurrentUser(null);
  }, [cleanupPrivateListeners]);

  useEffect(() => {
    const unsubscribeAuth = authService.subscribeAuthState((firebaseUser) => {
      profileUnsubscribeRef.current?.();
      profileUnsubscribeRef.current = null;
      setCurrentUser(null);
      setAuthError(null);

      if (!firebaseUser) {
        clearPrivateState();
        setAuthStatus('unauthenticated');
        return;
      }

      setAuthStatus('initializing');

      // Listener profil membuat perubahan role/active dari pengelola diketahui
      // tanpa login ulang, sekaligus menjadi sumber kebenaran untuk role UI.
      profileUnsubscribeRef.current = userService.subscribeUserProfile(
        firebaseUser.uid,
        (profile) => {
          if (!profile) {
            // Saat registrasi, Auth dapat memicu observer sebelum users/{uid}
            // selesai dibuat. Tunggu snapshot berikutnya, jangan tampilkan pending terlalu dini.
            if (isRegisteringRef.current) {
              setAuthStatus('initializing');
              return;
            }
            setCurrentUser(null);
            setAuthStatus('profile-pending');
            setAuthError(
              'Profil users/{uid} belum tersedia. Hubungi pengelola praktikum untuk pemeriksaan akun.'
            );
            return;
          }

          setCurrentUser(profile);
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
          setAuthStatus('profile-error');
          setAuthError(formatAuthError(error));
        }
      );
    });

    return () => {
      unsubscribeAuth();
      cleanupPrivateListeners();
    };
  }, [clearPrivateState]);

  const loginWithEmail = useCallback(
    async (input: LoginInput): Promise<AuthActionResult> => {
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        await authService.login(input);
        // onAuthStateChanged memuat profil dan menentukan role/route.
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
        // Profil dibuat oleh authService; observer Firebase mengarahkan route.
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
      setAuthStatus('unauthenticated');
      return;
    }

    setAuthStatus('initializing');
    setAuthError(null);
    try {
      const profile = await userService.refreshOwnProfile(firebaseUser.uid);
      if (!profile) {
        setCurrentUser(null);
        setAuthStatus('profile-pending');
        setAuthError('Profil pengguna belum ditemukan di Cloud Firestore.');
        return;
      }

      setCurrentUser(profile);
      if (profile.aktif !== true) {
        setAuthStatus('profile-pending');
        setAuthError('Akun Anda belum aktif. Hubungi pengelola praktikum.');
        return;
      }

      setAuthStatus('authenticated');
    } catch (error) {
      setAuthStatus('profile-error');
      setAuthError(formatAuthError(error));
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

  const logout = useCallback(async (): Promise<void> => {
    try {
      // signOut memicu observer; state privat juga dibersihkan segera.
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

  // Adapter lama hanya untuk mencegah kerusakan API saat migrasi bertahap.
  // Implementasi Firestore yang sebenarnya menjadi tanggung jawab P2/P3/P4.
  const login = useCallback((_userId: string): void => {
    setAuthError('Gunakan login email dan kata sandi Firebase.');
  }, []);

  const openSession = useCallback((_sesiId: string): void => {
    // TODO integrasi P3: sessionService.openSession().
  }, []);

  const closeSession = useCallback((_sesiId: string, _catatan?: string): void => {
    // TODO integrasi P3: sessionService.closeSession().
  }, []);

  const checkIn = useCallback(
    (_sesiId: string): {
      ok: boolean;
      reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi';
    } => ({ ok: false, reason: 'belum_dibuka' }),
    []
  );

  const getAttendance = useCallback((_sesiId: string): Presensi[] => [], []);
  const getUserAttendance = useCallback((_userId: string): Presensi[] => [], []);

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
    // Helper cleanup disediakan lewat registerCleanupListener di API internal
    // untuk hook modul yang perlu dihentikan saat logout.
  };

  // Expose cleanup registration non-enumerably is unnecessary; kept available
  // by the Context contract as a named property below.
  return (
    <SiprakContext.Provider
      value={value as SiprakContextValue & { registerCleanupListener: typeof registerCleanupListener }}>
      {children}
    </SiprakContext.Provider>
  );
}

export function useSiprakContext(): SiprakContextValue & {
  registerCleanupListener: (unsubscribe: () => void) => () => void;
} {
  const context = useContext(SiprakContext);
  if (!context) {
    throw new Error('useSiprakContext must be used within a SiprakProvider');
  }
  return context as SiprakContextValue & {
    registerCleanupListener: (unsubscribe: () => void) => () => void;
  };
}
