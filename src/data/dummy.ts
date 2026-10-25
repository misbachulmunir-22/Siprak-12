import { Pengguna, Presensi, Sesi } from '@/types/siprak';

export const dummyAsisten: Pengguna = {
  id: 'asisten-1',
  nama: 'Budi Santoso, S.Kom.',
  peran: 'asisten',
};

export const dummyPraktikanList: Pengguna[] = [
  {
    id: 'praktikan-1',
    nama: 'Ahmad Fauzi',
    peran: 'praktikan',
    nim: '220101001',
    kelas: 'A',
  },
  {
    id: 'praktikan-2',
    nama: 'Bella Septiani',
    peran: 'praktikan',
    nim: '220101002',
    kelas: 'A',
  },
  {
    id: 'praktikan-3',
    nama: 'Citra Dewi',
    peran: 'praktikan',
    nim: '220101003',
    kelas: 'A',
  },
  {
    id: 'praktikan-4',
    nama: 'Dimas Prasetyo',
    peran: 'praktikan',
    nim: '220101004',
    kelas: 'A',
  },
  {
    id: 'praktikan-5',
    nama: 'Eka Rahmawati',
    peran: 'praktikan',
    nim: '220101005',
    kelas: 'A',
  },
  {
    id: 'praktikan-6',
    nama: 'Fajar Nugraha',
    peran: 'praktikan',
    nim: '220101006',
    kelas: 'A',
  },
];

export const dummySessions: Sesi[] = [
  {
    id: 'sesi-1',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 1,
    kelas: 'A',
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-10',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'ditutup',
    dibukaPada: '2026-10-10T08:02:00.000Z',
    ditutupPada: '2026-10-10T10:30:00.000Z',
    catatanPenutup: 'Sesi pengenalan React Native dan Expo selesai dengan tertib.',
  },
  {
    id: 'sesi-2',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 2,
    kelas: 'A',
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-17',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'belum_dibuka',
  },
  {
    id: 'sesi-3',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 3,
    kelas: 'A',
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-24',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'belum_dibuka',
  },
  {
    id: 'sesi-4',
    praktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 4,
    kelas: 'A',
    lab: 'Lab Komputer 3',
    tanggal: '2026-10-31',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'dibuka',
    dibukaPada: '2026-10-31T08:01:15.000Z',
  },
];

export const dummyAttendances: Presensi[] = [
  {
    id: 'presensi-1',
    sesiId: 'sesi-1',
    praktikanId: 'praktikan-1',
    waktuHadir: '2026-10-10T08:05:00.000Z',
  },
  {
    id: 'presensi-2',
    sesiId: 'sesi-1',
    praktikanId: 'praktikan-2',
    waktuHadir: '2026-10-10T08:07:30.000Z',
  },
  {
    id: 'presensi-3',
    sesiId: 'sesi-1',
    praktikanId: 'praktikan-3',
    waktuHadir: '2026-10-10T08:12:00.000Z',
  },
  {
    id: 'presensi-4',
    sesiId: 'sesi-1',
    praktikanId: 'praktikan-4',
    waktuHadir: '2026-10-10T08:15:20.000Z',
  },
  {
    id: 'presensi-5',
    sesiId: 'sesi-1',
    praktikanId: 'praktikan-5',
    waktuHadir: '2026-10-10T08:20:00.000Z',
  },
];
