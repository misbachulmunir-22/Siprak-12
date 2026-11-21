import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { penggunaDummy } from "@/data/dummy";
import {
  ambilProfil,
  daftarAkun,
  keluarAkun,
  masukAkun,
  type ProfilAkun,
} from "@/lib/firebase-account";
import { ambilKelasAsisten } from "@/lib/firebase-classes";
import {
  ambilAnggotaPraktikum,
  ambilSemuaPraktikumAsisten,
} from "@/lib/firebase-practicums";
import {
  ajukanIzin,
  ambilIzinAsisten,
  ambilIzinPraktikan,
} from "@/lib/firebase-izin";
import {
  ambilPresensiAsisten,
  ambilPresensiPraktikan,
  ambilSesiAsisten,
  ambilSesiPraktikan,
  bukaSesiKelas,
  catatPresensi,
  tutupSesiKelas,
} from "@/lib/firebase-sessions";
import type {
  KelasPraktikum,
  PengajuanIzin,
  Praktikum,
  Pengguna,
  Presensi,
  Sesi,
  SiprakContextValue,
} from "@/types/siprak";

const SiprakContext = createContext<SiprakContextValue | null>(null);

type SiprakProviderProps = {
  children: ReactNode;
};

function ubahKePengguna(profil: ProfilAkun): Pengguna {
  return {
    id: profil.uid,
    nama: profil.nama,
    nim: profil.nim,
    peran: profil.peran,
  };
}

export function SiprakProvider({ children }: SiprakProviderProps) {
  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authProfileError, setAuthProfileError] = useState<string | null>(null);
  const [classes, setClasses] = useState<KelasPraktikum[]>([]);
  const [practicums, setPracticums] = useState<Praktikum[]>([]);
  const [sessions, setSessions] = useState<Sesi[]>([]);
  const [attendances, setAttendances] = useState<Presensi[]>([]);
  const [praktikanList, setPraktikanList] = useState<Pengguna[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<PengajuanIzin[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthProfileError(null);
        setClasses([]);
        setPracticums([]);
        setSessions([]);
        setAttendances([]);
        setPraktikanList([]);
        setLeaveRequests([]);
        setAuthReady(true);
        return;
      }

      setAuthReady(false);

      void ambilProfil(firebaseUser.uid)
        .then((profil) => {
          setCurrentUser(ubahKePengguna(profil));
          setAuthProfileError(null);
        })
        .catch(() => {
          setCurrentUser(null);
          setClasses([]);
          setPracticums([]);
          setSessions([]);
          setAttendances([]);
          setPraktikanList([]);
          setLeaveRequests([]);
          setAuthProfileError(
            "Profil akun belum tersedia atau tidak dapat dibaca.",
          );
        })
        .finally(() => {
          setAuthReady(true);
        });
    });

    return unsubscribe;
  }, []);

  async function registerAccount(input: {
    nama: string;
    nim: string;
    email: string;
    password: string;
  }) {
    const profil = await daftarAkun(input);
    setCurrentUser(ubahKePengguna(profil));
    setAuthProfileError(null);
  }

  async function signInAccount(email: string, password: string) {
    const profil = await masukAkun(email, password);
    setCurrentUser(ubahKePengguna(profil));
    setAuthProfileError(null);
  }

  function login(userId: string) {
    const user = penggunaDummy.find((item) => item.id === userId);

    if (user) {
      setCurrentUser(user);
    }
  }

  function logout() {
    setCurrentUser(null);
    setClasses([]);
    setPracticums([]);
    setSessions([]);
    setAttendances([]);
    setPraktikanList([]);
    setLeaveRequests([]);
    void keluarAkun();
  }

  const refreshSessions = useCallback(async () => {
    if (!currentUser) {
      setClasses([]);
      setPracticums([]);
      setSessions([]);
      setAttendances([]);
      setPraktikanList([]);
      setLeaveRequests([]);
      return;
    }

    if (currentUser.peran === "asisten") {
      const [sesiFirebase, kelasFirebase, praktikumFirebase] = await Promise.all([
        ambilSesiAsisten(),
        ambilKelasAsisten(),
        ambilSemuaPraktikumAsisten(),
      ]);

      const anggotaPerPraktikum = await Promise.all(
        praktikumFirebase.map(async (praktikum) => ({
          praktikum,
          kelas: kelasFirebase.find((kelas) => kelas.id === praktikum.kelasId),
          anggota: await ambilAnggotaPraktikum(praktikum.kelasId, praktikum.id),
        })),
      );

      const daftarPraktikan: Pengguna[] = anggotaPerPraktikum.flatMap(
        ({ kelas, praktikum, anggota }) => kelas ?
          anggota
            .map((anggotaKelas) => ({
              id: anggotaKelas.uid,
              nama: anggotaKelas.nama,
              nim: anggotaKelas.nim,
              peran: "praktikan" as const,
              kelas: kelas.nama,
              kelasId: kelas.id,
              praktikumId: praktikum.id,
              namaPraktikum: praktikum.nama,
              statusKeanggotaan: anggotaKelas.status,
            })) : [],
      );

      const [presensiFirebase, izinFirebase] = await Promise.all([
        ambilPresensiAsisten(sesiFirebase),
        ambilIzinAsisten(sesiFirebase),
      ]);

      setSessions(sesiFirebase);
      setClasses(kelasFirebase);
      setPracticums(praktikumFirebase);
      setAttendances(presensiFirebase);
      setPraktikanList(daftarPraktikan);
      setLeaveRequests(izinFirebase);
      return;
    }

    const sesiFirebase = await ambilSesiPraktikan();

    const [presensiFirebase, izinFirebase] = await Promise.all([
      ambilPresensiPraktikan(sesiFirebase),
      ambilIzinPraktikan(sesiFirebase),
    ]);

    setSessions(sesiFirebase);
    setClasses([]);
    setPracticums([]);
    setAttendances(presensiFirebase);
    setPraktikanList([]);
    setLeaveRequests(izinFirebase);
  }, [currentUser]);

  async function openSession(sesi: Sesi) {
    await bukaSesiKelas(sesi);
    await refreshSessions();
  }

  async function closeSession(sesi: Sesi, catatan?: string) {
    await tutupSesiKelas(sesi, catatan);
    await refreshSessions();
  }

  async function checkIn(sesi: Sesi): Promise<Presensi> {
    if (!currentUser) {
      throw new Error("Silakan masuk terlebih dahulu.");
    }

    if (currentUser.peran !== "praktikan") {
      throw new Error("Masuk sebagai praktikan untuk melakukan presensi.");
    }

    const presensiBaru = await catatPresensi(sesi);

    setAttendances((daftarLama) => {
      const sudahAda = daftarLama.some(
        (item) =>
          item.sesiId === sesi.id && item.praktikanId === currentUser.id,
      );

      return sudahAda ? daftarLama : [...daftarLama, presensiBaru];
    });

    return presensiBaru;
  }

  async function submitLeave(
    sesi: Sesi,
    alasan: string,
  ): Promise<PengajuanIzin> {
    if (!currentUser) {
      throw new Error("Silakan masuk terlebih dahulu.");
    }

    if (currentUser.peran !== "praktikan") {
      throw new Error("Hanya praktikan yang dapat mengajukan izin.");
    }

    const pengajuan = await ajukanIzin(sesi, currentUser, alasan);

    setLeaveRequests((daftarLama) => [
      ...daftarLama.filter(
        (item) =>
          item.kelasId !== pengajuan.kelasId ||
          item.sesiId !== pengajuan.sesiId,
      ),
      pengajuan,
    ]);

    return pengajuan;
  }

  function getAttendance(sesiId: string) {
    return attendances.filter((item) => item.sesiId === sesiId);
  }

  function getUserAttendance(userId: string) {
    return attendances.filter((item) => item.praktikanId === userId);
  }

  const value: SiprakContextValue = {
    currentUser,
    authReady,
    authProfileError,
    classes,
    practicums,
    sessions,
    attendances,
    praktikanList,
    leaveRequests,
    login,
    logout,
    registerAccount,
    signInAccount,
    refreshSessions,
    openSession,
    closeSession,
    checkIn,
    submitLeave,
    getAttendance,
    getUserAttendance,
  };

  return (
    <SiprakContext.Provider value={value}>{children}</SiprakContext.Provider>
  );
}

export function useSiprak() {
  const context = useContext(SiprakContext);

  if (!context) {
    throw new Error("useSiprak harus digunakan di dalam SiprakProvider.");
  }

  return context;
}
