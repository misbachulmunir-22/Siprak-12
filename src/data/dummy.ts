import { Pengguna, Sesi, Presensi } from '@/types/siprak';

export const dummyAsisten: Pengguna = {
  id: 'ast-1',
  nama: 'Jeje Setyo',
  peran: 'asisten',
};

export const dummyPraktikanList: Pengguna[] = [
  { id: 'pkt-1', nama: 'Ahmad Rizki', nim: '24060122140001', kelas: 'Lab Komputasi A', peran: 'praktikan' },
  { id: 'pkt-2', nama: 'Budi Santoso', nim: '24060122140002', kelas: 'Lab Komputasi A', peran: 'praktikan' },
  { id: 'pkt-3', nama: 'Citra Lestari', nim: '24060122140003', kelas: 'Lab Komputasi A', peran: 'praktikan' },
  { id: 'pkt-4', nama: 'Dewi Anggraini', nim: '24060122140004', kelas: 'Lab Komputasi A', peran: 'praktikan' },
  { id: 'pkt-5', nama: 'Eko Prasetyo', nim: '24060122140005', kelas: 'Lab Komputasi A', peran: 'praktikan' },
  { id: 'pkt-6', nama: 'Fajar Pratama', nim: '24060122140006', kelas: 'Lab Komputasi A', peran: 'praktikan' },
];

export const dummySessions: Sesi[] = [
  {
    id: 'sesi-1',
    praktikum: 'Praktikum Pengembangan Perangkat Lunak Mobile',
    pertemuan: 1,
    kelas: 'Lab Komputasi A',
    lab: 'Laboratorium Rekayasa Perangkat Lunak',
    tanggal: '2026-10-17',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'ditutup',
    dibukaPada: '2026-10-17T08:05:00.000Z',
    ditutupPada: '2026-10-17T10:30:00.000Z',
    catatanPenutup: 'Praktikum modul 1 pengenalan lingkungan kerja selesai. Tugas mandiri dikumpulkan sebelum sesi berikutnya.',
  },
  {
    id: 'sesi-2',
    praktikum: 'Praktikum Pengembangan Perangkat Lunak Mobile',
    pertemuan: 2,
    kelas: 'Lab Komputasi A',
    lab: 'Laboratorium Rekayasa Perangkat Lunak',
    tanggal: '2026-10-24',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'belum_dibuka',
  },
  {
    id: 'sesi-3',
    praktikum: 'Praktikum Pengembangan Perangkat Lunak Mobile',
    pertemuan: 3,
    kelas: 'Lab Komputasi A',
    lab: 'Laboratorium Rekayasa Perangkat Lunak',
    tanggal: '2026-10-31',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'belum_dibuka',
  },
  {
    id: 'sesi-4',
    praktikum: 'Praktikum Pengembangan Perangkat Lunak Mobile',
    pertemuan: 4,
    kelas: 'Lab Komputasi A',
    lab: 'Laboratorium Rekayasa Perangkat Lunak',
    tanggal: '2026-11-07',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    status: 'dibuka',
    dibukaPada: '2026-11-07T08:02:15.000Z',
  },
];

export const dummyAttendances: Presensi[] = [
  {
    id: 'prs-1',
    sesiId: 'sesi-1',
    praktikanId: 'pkt-1',
    waktuHadir: '2026-10-17T08:08:20.000Z',
  },
  {
    id: 'prs-2',
    sesiId: 'sesi-1',
    praktikanId: 'pkt-2',
    waktuHadir: '2026-10-17T08:11:45.000Z',
  },
  {
    id: 'prs-3',
    sesiId: 'sesi-1',
    praktikanId: 'pkt-3',
    waktuHadir: '2026-10-17T08:14:10.000Z',
  },
  {
    id: 'prs-4',
    sesiId: 'sesi-1',
    praktikanId: 'pkt-4',
    waktuHadir: '2026-10-17T08:16:30.000Z',
  },
];
