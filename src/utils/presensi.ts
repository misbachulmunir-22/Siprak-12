import type { Presensi, Sesi, StatusRiwayat } from '@/types/siprak';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

const dua = (nilai: number): string => String(nilai).padStart(2, '0');

/** Format ISO ke HH:MM memakai jam lokal perangkat. Nilai tidak valid menjadi --:--. */
export function formatJam(iso: string): string {
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return '--:--';
  return `${dua(tanggal.getHours())}:${dua(tanggal.getMinutes())}`;
}

/** Format YYYY-MM-DD ke nama hari Indonesia; data yang tidak valid dikembalikan apa adanya. */
export function formatTanggal(tanggal: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal);
  if (!cocok) return tanggal;

  const tahun = Number(cocok[1]);
  const bulan = Number(cocok[2]);
  const hari = Number(cocok[3]);
  const tanggalLokal = new Date(tahun, bulan - 1, hari);

  if (
    bulan < 1 || bulan > 12 ||
    tanggalLokal.getFullYear() !== tahun ||
    tanggalLokal.getMonth() !== bulan - 1 ||
    tanggalLokal.getDate() !== hari
  ) {
    return tanggal;
  }

  return `${NAMA_HARI[tanggalLokal.getDay()]}, ${hari} ${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

/** Urutkan sesi berdasarkan tanggal dan jam mulai, dari yang paling awal. */
export function urutkanSesi(daftar: Sesi[]): Sesi[] {
  return [...daftar].sort((a, b) => {
    const waktuA = `${a.tanggal} ${a.jamMulai}`;
    const waktuB = `${b.tanggal} ${b.jamMulai}`;
    return waktuA.localeCompare(waktuB);
  });
}

/** Cari presensi berdasarkan pasangan sesi dan praktikan. */
export function cariPresensi(
  daftar: Presensi[],
  sesiId: string,
  praktikanId: string,
): Presensi | undefined {
  return daftar.find((presensi) => presensi.sesiId === sesiId && presensi.praktikanId === praktikanId);
}

/** Aturan FR-11: hadir jika ada presensi, belum dimulai jika sesi belum dibuka, selain itu belum hadir. */
export function getStatusRiwayat(sesi: Sesi, presensi: Presensi | undefined): StatusRiwayat {
  if (presensi) return 'hadir';
  return sesi.status === 'belum_dibuka' ? 'belum_dimulai' : 'belum_hadir';
}
