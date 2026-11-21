import type { Pengguna, Presensi, Sesi } from "@/types/siprak";

export const asistenDummy: Pengguna = {
  id: "asisten-1",
  nama: "Raka Pratama",
  peran: "asisten",
};

export const praktikanDummy: Pengguna[] = [
  {
    id: "praktikan-1",
    nama: "Alya Putri",
    peran: "praktikan",
    nim: "24010101",
    kelas: "IF-12",
  },
  {
    id: "praktikan-2",
    nama: "Bima Pratama",
    peran: "praktikan",
    nim: "24010102",
    kelas: "IF-12",
  },
  {
    id: "praktikan-3",
    nama: "Citra Maharani",
    peran: "praktikan",
    nim: "24010103",
    kelas: "IF-12",
  },
  {
    id: "praktikan-4",
    nama: "Daffa Ramadhan",
    peran: "praktikan",
    nim: "24010104",
    kelas: "IF-12",
  },
  {
    id: "praktikan-5",
    nama: "Nadia Safitri",
    peran: "praktikan",
    nim: "24010105",
    kelas: "IF-12",
  },
  {
    id: "praktikan-6",
    nama: "Rizky Saputra",
    peran: "praktikan",
    nim: "24010106",
    kelas: "IF-12",
  },
];

export const penggunaDummy: Pengguna[] = [asistenDummy, ...praktikanDummy];

export const sesiDummy: Sesi[] = [
  {
    id: "sesi-1",
    kelasId: "kelas-dummy-1",
    praktikumId: "praktikum-dummy-1",
    praktikum: "Praktikum Pemrograman Mobile",
    pertemuan: 1,
    kelas: "IF-12",
    lab: "Lab Mobile",
    tanggal: "2026-11-10",
    jamMulai: "08:00",
    jamSelesai: "10:00",
    status: "ditutup",
    dibukaPada: "2026-11-10T08:00:00+07:00",
    ditutupPada: "2026-11-10T10:00:00+07:00",
    catatanPenutup: "Praktikum selesai.",
  },
  {
    id: "sesi-2",
    kelasId: "kelas-dummy-1",
    praktikumId: "praktikum-dummy-1",
    praktikum: "Praktikum Pemrograman Mobile",
    pertemuan: 2,
    kelas: "IF-12",
    lab: "Lab Mobile",
    tanggal: "2026-11-19",
    jamMulai: "10:00",
    jamSelesai: "12:00",
    status: "belum_dibuka",
  },
  {
    id: "sesi-3",
    kelasId: "kelas-dummy-1",
    praktikumId: "praktikum-dummy-1",
    praktikum: "Praktikum Pemrograman Mobile",
    pertemuan: 3,
    kelas: "IF-12",
    lab: "Lab Mobile",
    tanggal: "2026-11-20",
    jamMulai: "13:00",
    jamSelesai: "15:00",
    status: "belum_dibuka",
  },
  {
    id: "sesi-4",
    kelasId: "kelas-dummy-1",
    praktikumId: "praktikum-dummy-1",
    praktikum: "Praktikum Pemrograman Mobile",
    pertemuan: 4,
    kelas: "IF-12",
    lab: "Lab Mobile",
    tanggal: "2026-11-18",
    jamMulai: "16:00",
    jamSelesai: "18:00",
    status: "dibuka",
    dibukaPada: "2026-11-18T16:00:00+07:00",
  },
];

export const presensiDummy: Presensi[] = [
  {
    id: "presensi-1",
    sesiId: "sesi-1",
    praktikanId: "praktikan-1",
    waktuHadir: "2026-11-10T08:05:00+07:00",
  },
  {
    id: "presensi-2",
    sesiId: "sesi-1",
    praktikanId: "praktikan-2",
    waktuHadir: "2026-11-10T08:07:00+07:00",
  },
];
