import type { Presensi, Sesi, StatusRiwayat } from '@/types/siprak';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const;

const dua = (nilai: number): string => String(nilai).padStart(2, '0');

/** Format waktu ISO atau Date ke HH:MM memakai jam lokal perangkat. */
export function formatJam(iso: string | Date | undefined): string {
  if (!iso) return '--:--';
  const tanggal = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(tanggal.getTime())) return '--:--';
  return `${dua(tanggal.getHours())}:${dua(tanggal.getMinutes())}`;
}

/** Format YYYY-MM-DD ke nama hari Indonesia; data tidak valid dikembalikan apa adanya. */
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

/** Format ISO atau Date menjadi format lengkap Indonesia (contoh: 14 Nov 2026, 08:30 WIB). */
export function formatWaktuLengkap(iso: string | Date | undefined): string {
  if (!iso) return '-';
  const tanggal = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(tanggal.getTime())) return '-';

  const hari = tanggal.getDate();
  const bulan = NAMA_BULAN[tanggal.getMonth()];
  const tahun = tanggal.getFullYear();
  const jam = dua(tanggal.getHours());
  const menit = dua(tanggal.getMinutes());

  return `${hari} ${bulan} ${tahun}, ${jam}:${menit}`;
}

/** Urutkan sesi berdasarkan tanggal dan jam mulai, dari yang paling awal. */
export function urutkanSesi(daftar: Sesi[]): Sesi[] {
  return [...daftar].sort((a, b) => {
    const waktuA = `${a.tanggal} ${a.jamMulai}`;
    const waktuB = `${b.tanggal} ${b.jamMulai}`;
    return waktuA.localeCompare(waktuB);
  });
}

/** Cari presensi berdasarkan pasangan sesi dan praktikan (mendukung praktikanUid dan praktikanId). */
export function cariPresensi(
  daftar: Presensi[],
  sesiId: string,
  uidOrId: string,
): Presensi | undefined {
  return daftar.find((presensi) =>
    presensi.sesiId === sesiId &&
    (presensi.praktikanUid === uidOrId || presensi.praktikanId === uidOrId)
  );
}

/**
 * Aturan SRS Lampiran A.2:
 * 1. Jika attendance ada -> 'hadir'
 * 2. Jika sesi.status === 'belum_dibuka' -> 'belum_dimulai'
 * 3. Selain itu -> 'belum_hadir'
 */
export function getStatusRiwayat(
  sesi: Sesi,
  presensiOrHasAttended: Presensi | boolean | undefined
): StatusRiwayat {
  const attendanceExists = typeof presensiOrHasAttended === 'boolean'
    ? presensiOrHasAttended
    : Boolean(presensiOrHasAttended);

  if (attendanceExists) {
    return 'hadir';
  }
  if (sesi.status === 'belum_dibuka') {
    return 'belum_dimulai';
  }
  return 'belum_hadir';
}

/**
 * ID dokumen presensi deterministik sesuai FR-S2-12 dan SRS 6.2:
 * Format: `${sessionId}_${praktikanUid}`
 */
export function getAttendanceDocId(sessionId: string, praktikanUid: string): string {
  return `${sessionId}_${praktikanUid}`;
}

/** Validasi alasan pengajuan izin (FR-S2-16 & FR-S2-21). */
export function validateAlasanIzin(alasan: string): { valid: boolean; error?: string } {
  const trimmed = alasan.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Alasan pengajuan izin tidak boleh kosong.' };
  }
  if (trimmed.length < 10) {
    return { valid: false, error: 'Alasan izin minimal 10 karakter untuk kejelasan alasan.' };
  }
  if (trimmed.length > 500) {
    return { valid: false, error: 'Alasan izin maksimal 500 karakter.' };
  }
  return { valid: true };
}
