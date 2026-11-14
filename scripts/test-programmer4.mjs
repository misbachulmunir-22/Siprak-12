import assert from 'node:assert';

console.log('====================================================');
console.log('🧪 MENJALANKAN PENGUJIAN MODUL PROGRAMMER 4');
console.log('Sesuai Dokumen SRS-SIPRAK12-S2-2026-001');
console.log('====================================================\n');

// 1. Pengujian utilitas presensi & riwayat
import {
  formatJam,
  formatTanggal,
  formatWaktuLengkap,
  getAttendanceDocId,
  getStatusRiwayat,
  validateAlasanIzin,
} from '../src/utils/presensi.js';

console.log('▶ [1/4] Menguji Utilitas Presensi & Riwayat...');

// A. Format Jam
assert.strictEqual(formatJam('2026-10-31T08:05:00.000Z') !== '--:--', true, 'formatJam valid');
assert.strictEqual(formatJam(undefined), '--:--', 'formatJam undefined');
assert.strictEqual(formatJam('invalid-date'), '--:--', 'formatJam invalid date');
console.log('  ✓ formatJam lulus');

// B. Format Tanggal
const formattedDate = formatTanggal('2026-10-31');
assert.strictEqual(formattedDate.includes('31 Okt 2026') || formattedDate.includes('Oktober'), true, 'formatTanggal valid');
console.log('  ✓ formatTanggal lulus');

// C. ID Dokumen Deterministik (FR-S2-12 & SRS 6.2)
const docId = getAttendanceDocId('sesi-abc', 'uid-123');
assert.strictEqual(docId, 'sesi-abc_uid-123', 'getAttendanceDocId deterministik');
console.log('  ✓ getAttendanceDocId (ID deterministik) lulus');

// D. Rumus Status Riwayat (SRS Lampiran A.2)
const dummySesi = {
  id: 'sesi-1',
  praktikum: 'PPB',
  pertemuan: 1,
  kelas: 'A',
  lab: 'Lab 1',
  tanggal: '2026-10-10',
  jamMulai: '08:00',
  jamSelesai: '10:00',
  status: 'belum_dibuka',
};

// 1. Ada presensi -> selalu 'hadir'
assert.strictEqual(getStatusRiwayat(dummySesi, true), 'hadir', 'Status jika hadir');
assert.strictEqual(
  getStatusRiwayat({ ...dummySesi, status: 'ditutup' }, true),
  'hadir',
  'Status jika hadir walau sesi ditutup'
);

// 2. Tidak ada presensi + sesi belum dibuka -> 'belum_dimulai'
assert.strictEqual(getStatusRiwayat(dummySesi, false), 'belum_dimulai', 'Status belum dibuka');

// 3. Tidak ada presensi + sesi dibuka / ditutup -> 'belum_hadir'
assert.strictEqual(
  getStatusRiwayat({ ...dummySesi, status: 'dibuka' }, false),
  'belum_hadir',
  'Status sesi dibuka belum hadir'
);
assert.strictEqual(
  getStatusRiwayat({ ...dummySesi, status: 'ditutup' }, false),
  'belum_hadir',
  'Status sesi ditutup belum hadir'
);
console.log('  ✓ getStatusRiwayat (SRS A.2) lulus');

// E. Validasi Alasan Izin (FR-S2-16 & FR-S2-21)
assert.strictEqual(validateAlasanIzin('').valid, false, 'Alasan kosong ditolak');
assert.strictEqual(validateAlasanIzin('   ').valid, false, 'Alasan spasi saja ditolak');
assert.strictEqual(validateAlasanIzin('demam').valid, false, 'Alasan terlalu pendek (<10 karakter) ditolak');
assert.strictEqual(
  validateAlasanIzin('Saya mengalami demam tinggi dan harus istirahat').valid,
  true,
  'Alasan valid diterima'
);
assert.strictEqual(validateAlasanIzin('a'.repeat(501)).valid, false, 'Alasan >500 karakter ditolak');
console.log('  ✓ validateAlasanIzin lulus\n');

// 2. Pengujian Adapter AI (FR-S2-17 & FR-S2-18)
console.log('▶ [2/4] Menguji Adapter AI (aiService)...');
import { classifyLeaveReason } from '../src/services/aiService.js';

// Test AI fallback saat endpoint belum diset
delete process.env.EXPO_PUBLIC_AI_API_BASE_URL;
delete process.env.EXPO_PUBLIC_USE_AI_MOCK;

const resUnconfigured = await classifyLeaveReason('Alasan sakit', 'req-1');
assert.strictEqual(
  resUnconfigured.status,
  'tidak_tersedia',
  'Status harus tidak_tersedia jika belum dikonfigurasi'
);
console.log('  ✓ Fallback saat AI belum dikonfigurasi lulus');

// Test Mock Classification
process.env.EXPO_PUBLIC_USE_AI_MOCK = 'true';
const resMockSakit = await classifyLeaveReason('Saya sedang sakit flu dan pusing berat', 'req-2');
assert.strictEqual(resMockSakit.status, 'berhasil', 'Mock klasifikasi berhasil');
assert.strictEqual(resMockSakit.category, 'Sakit', 'Kategori sakit terdeteksi');
assert.strictEqual(typeof resMockSakit.confidence === 'number', true, 'Confidence berupa number');
console.log('  ✓ Mock klasifikasi AI lulus (kategori: ' + resMockSakit.category + ', confidence: ' + resMockSakit.confidence + ')\n');

// 3. Pengujian Pencatatan Presensi & Pencegahan Duplikasi (UT-S2-08, UT-S2-09, UT-S2-10)
console.log('▶ [3/4] Menguji Pencatatan Presensi (attendanceWriteService)...');
import { recordAttendance } from '../src/services/attendanceWriteService.js';

const sesiDibuka = {
  ...dummySesi,
  id: 'sesi-test-dibuka',
  status: 'dibuka',
};

const sesiBelumDibuka = {
  ...dummySesi,
  id: 'sesi-test-belum',
  status: 'belum_dibuka',
};

const sesiDitutup = {
  ...dummySesi,
  id: 'sesi-test-tutup',
  status: 'ditutup',
};

// UT-S2-10: Coba presensi pada sesi belum dibuka
const resBelum = await recordAttendance(sesiBelumDibuka, 'praktikan-test-1');
assert.strictEqual(resBelum.ok, false, 'Presensi pada sesi belum dibuka harus ditolak');
assert.strictEqual(resBelum.reason, 'belum_dibuka', 'Reason harus belum_dibuka');
console.log('  ✓ UT-S2-10 (Sesi belum dibuka) ditolak dengan benar');

// UT-S2-10: Coba presensi pada sesi sudah ditutup
const resTutup = await recordAttendance(sesiDitutup, 'praktikan-test-1');
assert.strictEqual(resTutup.ok, false, 'Presensi pada sesi ditutup harus ditolak');
assert.strictEqual(resTutup.reason, 'ditutup', 'Reason harus ditutup');
console.log('  ✓ UT-S2-10 (Sesi ditutup) ditolak dengan benar');

// UT-S2-08: Presensi berhasil pada sesi dibuka
const resHadir = await recordAttendance(sesiDibuka, 'praktikan-test-1');
assert.strictEqual(resHadir.ok, true, 'Presensi pertama pada sesi dibuka harus berhasil');
assert.strictEqual(resHadir.attendance.praktikanUid, 'praktikan-test-1');
assert.strictEqual(resHadir.attendance.sesiId, 'sesi-test-dibuka');
console.log('  ✓ UT-S2-08 (Presensi berhasil) lulus');

// UT-S2-09: Presensi ganda (mencatat ulang pada sesi yang sama)
const resGanda = await recordAttendance(sesiDibuka, 'praktikan-test-1');
assert.strictEqual(resGanda.ok, false, 'Presensi kedua harus ditolak (idempoten)');
assert.strictEqual(resGanda.reason, 'sudah_presensi', 'Reason harus sudah_presensi');
console.log('  ✓ UT-S2-09 (Pencegahan presensi ganda) lulus\n');

// 4. Pengujian Pengajuan Izin & Integrasi AI (UT-S2-13, UT-S2-14)
console.log('▶ [4/4] Menguji Pengajuan Izin & Integrasi AI (leaveService)...');
import { submitLeaveRequest } from '../src/services/leaveService.js';

// UT-S2-13: Pengajuan izin + AI berhasil
process.env.EXPO_PUBLIC_USE_AI_MOCK = 'true';
const resIzin1 = await submitLeaveRequest(
  sesiDibuka,
  'praktikan-test-2',
  'Saya mengalami demam tinggi dan dianjurkan dokter istirahat di rumah.'
);
assert.strictEqual(resIzin1.ok, true, 'Pengajuan izin berhasil tersimpan');
assert.strictEqual(resIzin1.leaveRequest.status, 'menunggu', 'Status keputusan harus MENUNGGU (bukan otomatis disetujui AI)');
assert.strictEqual(resIzin1.leaveRequest.aiStatus, 'berhasil', 'aiStatus harus berhasil');
assert.strictEqual(resIzin1.leaveRequest.aiCategory, 'Sakit', 'aiCategory terisi hasil klasifikasi');
console.log('  ✓ UT-S2-13 (Pengajuan izin + AI berhasil) lulus:');
console.log('    - Status keputusan:', resIzin1.leaveRequest.status);
console.log('    - Status AI:', resIzin1.leaveRequest.aiStatus);
console.log('    - Prediksi kategori:', resIzin1.leaveRequest.aiCategory);

// Pencegahan duplikasi pengajuan izin untuk sesi yang sama
const resIzinDuplikat = await submitLeaveRequest(
  sesiDibuka,
  'praktikan-test-2',
  'Mencoba mengajukan izin kedua kalinya pada sesi yang sama.'
);
assert.strictEqual(resIzinDuplikat.ok, false, 'Pengajuan izin duplikat harus ditolak');
console.log('  ✓ Pencegahan duplikasi pengajuan izin lulus');

// UT-S2-14: AI fallback saat gagal / timeout / tidak tersedia
delete process.env.EXPO_PUBLIC_AI_API_BASE_URL;
delete process.env.EXPO_PUBLIC_USE_AI_MOCK;

const resIzinFallback = await submitLeaveRequest(
  { ...sesiDibuka, id: 'sesi-test-fallback' },
  'praktikan-test-3',
  'Saya harus mendampingi orang tua di rumah sakit hari ini.'
);
assert.strictEqual(resIzinFallback.ok, true, 'Pengajuan tetap BERHASIL tersimpan meski AI tidak tersedia');
assert.strictEqual(resIzinFallback.leaveRequest.status, 'menunggu', 'Status izin TETAP menunggu');
assert.strictEqual(
  resIzinFallback.leaveRequest.aiStatus === 'tidak_tersedia' || resIzinFallback.leaveRequest.aiStatus === 'gagal',
  true,
  'aiStatus mencatat kegagalan/ketidaktersediaan'
);
console.log('  ✓ UT-S2-14 (AI gagal/tidak tersedia) lulus:');
console.log('    - Pengajuan tetap tersimpan:', resIzinFallback.ok);
console.log('    - Status keputusan tetap:', resIzinFallback.leaveRequest.status);
console.log('    - Status AI tercatat:', resIzinFallback.leaveRequest.aiStatus);

console.log('\n====================================================');
console.log('🎉 SEMUA PENGUJIAN PROGRAMMER 4 BERHASIL DENGAN LULUS!');
console.log('====================================================');
