/**
 * p2-unit-tests.mjs
 *
 * Test Suite Pengujian Terisolasi untuk Modul Programmer 2 (Sprint 2)
 * Menguji:
 * - UT-S2-04: CRUD kelas dan peserta (keanggotaan & pemetaan UID)
 * - UT-S2-05: CRUD jadwal dan data master sesi (validasi jam & konsistensi)
 * - UT-S2-06: Jadwal berdasarkan peran dan kelas (isolasi antar asisten dan praktikan lintas kelas)
 * - UT-S2-13: Real-time listener & cleanup (unsubscribe)
 * - UT-S2-17: Penanganan validasi input dan empty state
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { classService } from '../services/classService.ts';
import { scheduleService } from '../services/scheduleService.ts';

test.beforeEach(() => {
  classService.resetStore();
  scheduleService.resetStore();
});

// ============================================================================
// UT-S2-04: CRUD KELAS DAN PESERTA
// ============================================================================

test('UT-S2-04: Asisten dapat membuat kelas baru dengan assistantUids dan active=true', async () => {
  const newClass = await classService.createClass({
    nama: 'Kelas C',
    kode: 'IF-C',
    namaPraktikum: 'Basis Data',
    assistantUid: 'asisten-1',
  });

  assert.equal(newClass.nama, 'Kelas C');
  assert.equal(newClass.kode, 'IF-C');
  assert.equal(newClass.active, true);
  assert.deepEqual(newClass.assistantUids, ['asisten-1']);

  const assistantClasses = await classService.getClassesForAssistant('asisten-1');
  assert.ok(assistantClasses.some((c) => c.id === newClass.id));
});

test('UT-S2-04: Pembuatan kelas gagal jika field wajib kosong atau kode duplikat', async () => {
  await assert.rejects(
    async () => {
      await classService.createClass({
        nama: '',
        kode: 'IF-X',
        namaPraktikum: 'Praktikum X',
        assistantUid: 'asisten-1',
      });
    },
    { message: /Nama kelas wajib diisi/ }
  );

  // Kode IF-A sudah ada di initialClasses
  await assert.rejects(
    async () => {
      await classService.createClass({
        nama: 'Kelas A Baru',
        kode: 'IF-A',
        namaPraktikum: 'Praktikum Duplikat',
        assistantUid: 'asisten-1',
      });
    },
    { message: /sudah ada dan masih aktif/ }
  );
});

test('UT-S2-04: Asisten dapat memperbarui kelas; asisten lain ditolak', async () => {
  const updated = await classService.updateClass(
    'kelas-a',
    { nama: 'Kelas A Revisi' },
    'asisten-1'
  );
  assert.equal(updated.nama, 'Kelas A Revisi');

  // Asisten-2 tidak ditugaskan di kelas-a, harus ditolak
  await assert.rejects(
    async () => {
      await classService.updateClass(
        'kelas-a',
        { nama: 'Kelas Dihack' },
        'asisten-2'
      );
    },
    { message: /tidak memiliki kewenangan/ }
  );
});

test('UT-S2-04: Arsip kelas mengubah active=false tanpa cascading delete', async () => {
  await classService.archiveClass('kelas-a', 'asisten-1');

  const activeClasses = await classService.getClassesForAssistant('asisten-1', false);
  assert.ok(!activeClasses.some((c) => c.id === 'kelas-a'));

  const allClasses = await classService.getClassesForAssistant('asisten-1', true);
  const archived = allClasses.find((c) => c.id === 'kelas-a');
  assert.ok(archived);
  assert.equal(archived.active, false);

  // Sesi dan jadwal tetap tersimpan (tidak terhapus)
  const schedules = await scheduleService.getSchedulesForClass('kelas-a');
  assert.ok(schedules.length > 0);
});

test('UT-S2-04: Pemetaan UID praktikan resmi ke kelas (FR-S2-05)', async () => {
  // praktikan-9 terdaftar di sistem tapi belum di kelas-a
  const member = await classService.addMemberToClass('kelas-a', {
    uid: 'praktikan-9',
    namaSnapshot: 'Indah Permata',
    nimSnapshot: '220101009',
    assistantUid: 'asisten-1',
  });

  assert.equal(member.uid, 'praktikan-9');
  assert.equal(member.namaSnapshot, 'Indah Permata');
  assert.equal(member.active, true);

  const members = await classService.getClassMembers('kelas-a');
  assert.ok(members.some((m) => m.uid === 'praktikan-9'));
});

test('UT-S2-04: Menolak UID tidak terdaftar atau non-aktif', async () => {
  await assert.rejects(
    async () => {
      await classService.addMemberToClass('kelas-a', {
        uid: 'uid-antah-berantah',
        namaSnapshot: 'Fake Student',
        nimSnapshot: '999999',
        assistantUid: 'asisten-1',
      });
    },
    { message: /tidak terdaftar sebagai pengguna resmi/ }
  );

  // Akun nonaktif
  await assert.rejects(
    async () => {
      await classService.addMemberToClass('kelas-a', {
        uid: 'praktikan-nonaktif',
        namaSnapshot: 'Kiki',
        nimSnapshot: '220101011',
        assistantUid: 'asisten-1',
      });
    },
    { message: /tidak aktif/ }
  );
});

test('UT-S2-04: Mencegah keanggotaan ganda (duplikat aktif ditolak)', async () => {
  // praktikan-1 sudah ada di kelas-a
  await assert.rejects(
    async () => {
      await classService.addMemberToClass('kelas-a', {
        uid: 'praktikan-1',
        namaSnapshot: 'Ahmad Fauzi',
        nimSnapshot: '220101001',
        assistantUid: 'asisten-1',
      });
    },
    { message: /sudah terdaftar aktif/ }
  );
});

test('UT-S2-04: Mengaktifkan kembali anggota nonaktif pada dokumen yang sama', async () => {
  // Nonaktifkan praktikan-1 terlebih dahulu
  await classService.removeMemberFromClass('kelas-a', 'praktikan-1', 'asisten-1');
  const membersAfterRemove = await classService.getClassMembers('kelas-a', true);
  const deactivated = membersAfterRemove.find((m) => m.uid === 'praktikan-1');
  assert.ok(deactivated);
  assert.equal(deactivated.active, false);

  // Tambahkan kembali praktikan-1
  const reactivated = await classService.addMemberToClass('kelas-a', {
    uid: 'praktikan-1',
    namaSnapshot: 'Ahmad Fauzi Reaktif',
    nimSnapshot: '220101001',
    assistantUid: 'asisten-1',
  });

  assert.equal(reactivated.uid, 'praktikan-1');
  assert.equal(reactivated.active, true);
  assert.equal(reactivated.namaSnapshot, 'Ahmad Fauzi Reaktif');

  // Pastikan jumlah dokumen anggota tidak bertambah ganda
  const finalMembers = await classService.getClassMembers('kelas-a', true);
  const occurrences = finalMembers.filter((m) => m.uid === 'praktikan-1');
  assert.equal(occurrences.length, 1);
});

test('UT-S2-04: Memperbarui field snapshot anggota yang diizinkan (FR-S2-07)', async () => {
  const updated = await classService.updateMemberSnapshot(
    'kelas-a',
    'praktikan-2',
    {
      namaSnapshot: 'Bella Septiani, S.Kom.',
      nimSnapshot: '220101002-R',
      assistantUid: 'asisten-1',
    }
  );

  assert.equal(updated.namaSnapshot, 'Bella Septiani, S.Kom.');
  assert.equal(updated.nimSnapshot, '220101002-R');
});

// ============================================================================
// UT-S2-05: CRUD JADWAL DAN DATA MASTER SESI
// ============================================================================

test('UT-S2-05: Validasi aturan input jadwal (jamSelesai > jamMulai, tanggal, pertemuan)', () => {
  // Valid case
  const valid = scheduleService.validateInput({
    classId: 'kelas-a',
    namaPraktikum: 'Praktikum Mobile',
    pertemuan: 1,
    lab: 'Lab 3',
    tanggal: '2026-11-20',
    jamMulai: '08:00',
    jamSelesai: '10:00',
  });
  assert.equal(valid.valid, true);

  // Invalid: jamSelesai <= jamMulai
  const invalidTime = scheduleService.validateInput({
    classId: 'kelas-a',
    namaPraktikum: 'Praktikum Mobile',
    pertemuan: 1,
    lab: 'Lab 3',
    tanggal: '2026-11-20',
    jamMulai: '10:00',
    jamSelesai: '08:00',
  });
  assert.equal(invalidTime.valid, false);
  assert.match(invalidTime.errors.jamSelesai, /setelah jam mulai/);

  // Invalid: pertemuan < 1
  const invalidPertemuan = scheduleService.validateInput({
    classId: 'kelas-a',
    namaPraktikum: 'Praktikum Mobile',
    pertemuan: 0,
    lab: 'Lab 3',
    tanggal: '2026-11-20',
    jamMulai: '08:00',
    jamSelesai: '10:00',
  });
  assert.equal(invalidPertemuan.valid, false);
  assert.match(invalidPertemuan.errors.pertemuan, /bilangan bulat positif/);

  // Invalid: format tanggal salah
  const invalidDate = scheduleService.validateInput({
    classId: 'kelas-a',
    namaPraktikum: 'Praktikum Mobile',
    pertemuan: 1,
    lab: 'Lab 3',
    tanggal: '20-11-2026',
    jamMulai: '08:00',
    jamSelesai: '10:00',
  });
  assert.equal(invalidDate.valid, false);
  assert.match(invalidDate.errors.tanggal, /YYYY-MM-DD/);
});

test('UT-S2-05: Membuat jadwal menghasilkan data master sesi dengan status belum_dibuka dan relasi sinkron', async () => {
  const result = await scheduleService.createScheduleAndSession({
    classId: 'kelas-a',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 5,
    lab: 'Lab Komputer 3',
    tanggal: '2026-11-07',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    createdBy: 'asisten-1',
  });

  assert.ok(result.schedule.id);
  assert.ok(result.session.id);
  assert.equal(result.session.scheduleId, result.schedule.id);
  assert.equal(result.session.classId, 'kelas-a');
  assert.equal(result.session.status, 'belum_dibuka');
  assert.equal(result.session.pertemuan, 5);
  assert.equal(result.session.active, true);
});

test('UT-S2-05: Mengubah jadwal memperbarui data master sesi yang bersesuaian', async () => {
  const updated = await scheduleService.updateScheduleAndSession('jadwal-2', {
    jamMulai: '09:00',
    jamSelesai: '11:30',
    lab: 'Lab Multimedia 1',
    updatedBy: 'asisten-1',
  });

  assert.equal(updated.schedule.jamMulai, '09:00');
  assert.equal(updated.schedule.jamSelesai, '11:30');
  assert.equal(updated.schedule.lab, 'Lab Multimedia 1');

  // Master sesi terkait harus ikut terbarui
  const session = await scheduleService.getSessionById('sesi-2');
  assert.ok(session);
  assert.equal(session.jamMulai, '09:00');
  assert.equal(session.jamSelesai, '11:30');
  assert.equal(session.lab, 'Lab Multimedia 1');
});

test('UT-S2-05: Mengarsipkan jadwal menonaktifkan jadwal & sesi tanpa hard delete', async () => {
  await scheduleService.archiveScheduleAndSession('jadwal-3', 'asisten-1');

  const activeSchedules = await scheduleService.getSchedulesForClass('kelas-a');
  assert.ok(!activeSchedules.some((s) => s.id === 'jadwal-3'));

  const session = await scheduleService.getSessionById('sesi-3');
  assert.equal(session, null); // Active filter returns null
});

// ============================================================================
// UT-S2-06: JADWAL BERDASARKAN PERAN DAN KELAS
// ============================================================================

test('UT-S2-06: Asisten hanya melihat sesi kelas tugasnya', async () => {
  const asisten1Sessions = await scheduleService.getSessionsForAssistant('asisten-1');
  assert.ok(asisten1Sessions.length > 0);
  assert.ok(asisten1Sessions.every((s) => s.classId === 'kelas-a'));

  const asisten2Sessions = await scheduleService.getSessionsForAssistant('asisten-2');
  assert.ok(asisten2Sessions.length > 0);
  assert.ok(asisten2Sessions.every((s) => s.classId === 'kelas-b'));
});

test('UT-S2-06: Dua praktikan dari kelas berbeda hanya melihat jadwal kelas masing-masing', async () => {
  // praktikan-1 terdaftar di kelas-a
  const praktikan1Sessions = await scheduleService.getSessionsForPraktikan('praktikan-1');
  assert.ok(praktikan1Sessions.length > 0);
  assert.ok(praktikan1Sessions.every((s) => s.classId === 'kelas-a'));
  assert.ok(!praktikan1Sessions.some((s) => s.classId === 'kelas-b'));

  // praktikan-7 terdaftar di kelas-b
  const praktikan7Sessions = await scheduleService.getSessionsForPraktikan('praktikan-7');
  assert.ok(praktikan7Sessions.length > 0);
  assert.ok(praktikan7Sessions.every((s) => s.classId === 'kelas-b'));
  assert.ok(!praktikan7Sessions.some((s) => s.classId === 'kelas-a'));
});

test('UT-S2-06: Sesi praktikan terurut secara kronologis (tanggal dan jamMulai)', async () => {
  const sessions = await scheduleService.getSessionsForPraktikan('praktikan-1');
  for (let i = 0; i < sessions.length - 1; i++) {
    const a = `${sessions[i].tanggal}T${sessions[i].jamMulai}`;
    const b = `${sessions[i + 1].tanggal}T${sessions[i + 1].jamMulai}`;
    assert.ok(a <= b, `Urutan tidak kronologis: ${a} harus sebelum atau sama dengan ${b}`);
  }
});

// ============================================================================
// UT-S2-13: REAL-TIME LISTENER & UNSUBSCRIBE
// ============================================================================

test('UT-S2-13: Listener kelas bereaksi secara real-time dan fungsi unsubscribe melepaskannya', async () => {
  let callCount = 0;
  let lastData = [];

  const unsubscribe = classService.subscribeClassesForAssistant('asisten-1', (list) => {
    callCount++;
    lastData = list;
  });

  assert.equal(callCount, 1); // initial emit
  const initialLength = lastData.length;

  // Tambahkan kelas baru
  await classService.createClass({
    nama: 'Kelas Baru Listener',
    kode: 'IF-NEW',
    namaPraktikum: 'Praktikum Realtime',
    assistantUid: 'asisten-1',
  });

  assert.equal(callCount, 2);
  assert.equal(lastData.length, initialLength + 1);

  // Unsubscribe
  unsubscribe();

  // Tambahkan kelas lagi
  await classService.createClass({
    nama: 'Kelas Pasca Unsub',
    kode: 'IF-UNSUB',
    namaPraktikum: 'Praktikum Unsub',
    assistantUid: 'asisten-1',
  });

  // Call count tidak boleh bertambah lagi
  assert.equal(callCount, 2);
});

test('UT-S2-13: Listener sesi praktikan bereaksi saat jadwal baru ditambahkan ke kelasnya', async () => {
  let sessionCallCount = 0;
  let latestSessions = [];

  const unsubscribe = scheduleService.subscribeSessionsForPraktikan('praktikan-1', (list) => {
    sessionCallCount++;
    latestSessions = list;
  });

  // Tunggu initial async emit
  await new Promise((resolve) => setTimeout(resolve, 20));
  const countBefore = latestSessions.length;

  // Tambahkan sesi baru ke kelas-a
  await scheduleService.createScheduleAndSession({
    classId: 'kelas-a',
    namaPraktikum: 'Pemrograman Perangkat Bergerak',
    pertemuan: 6,
    lab: 'Lab Komputer 3',
    tanggal: '2026-11-14',
    jamMulai: '08:00',
    jamSelesai: '10:30',
    createdBy: 'asisten-1',
  });

  // Tunggu listener emit perubahan
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.ok(sessionCallCount >= 2);
  assert.equal(latestSessions.length, countBefore + 1);

  unsubscribe();
});

// ============================================================================
// UT-S2-17: KONDISI LOADING, KOSONG, VALIDASI, DAN ERROR
// ============================================================================

test('UT-S2-17: Query tanpa data mengembalikan array kosong dengan bersih (Empty State)', async () => {
  // Buat kelas baru yang belum memiliki anggota atau jadwal
  const emptyClass = await classService.createClass({
    nama: 'Kelas Kosong',
    kode: 'IF-EMPTY',
    namaPraktikum: 'Praktikum Kosong',
    assistantUid: 'asisten-1',
  });

  const members = await classService.getClassMembers(emptyClass.id);
  assert.equal(members.length, 0);

  const schedules = await scheduleService.getSchedulesForClass(emptyClass.id);
  assert.equal(schedules.length, 0);

  // Praktikan tanpa keanggotaan kelas mengembalikan 0 sesi
  const unknownStudentSessions = await scheduleService.getSessionsForPraktikan('praktikan-unknown');
  assert.equal(unknownStudentSessions.length, 0);
});

test('UT-S2-17: Kegagalan validasi input tidak mengubah atau menyimpan data ke store', async () => {
  const initialClassCount = (await classService.getClassesForAssistant('asisten-1', true)).length;

  // Percobaan create class dengan nama kosong
  await assert.rejects(async () => {
    await classService.createClass({
      nama: '   ',
      kode: 'IF-FAIL',
      namaPraktikum: 'Praktikum Gagal',
      assistantUid: 'asisten-1',
    });
  });

  const finalClassCount = (await classService.getClassesForAssistant('asisten-1', true)).length;
  assert.equal(finalClassCount, initialClassCount);

  // Percobaan create schedule dengan jam selesai sebelum jam mulai
  const initialScheduleCount = (await scheduleService.getSchedulesForClass('kelas-a')).length;
  await assert.rejects(async () => {
    await scheduleService.createScheduleAndSession({
      classId: 'kelas-a',
      namaPraktikum: 'Pemrograman Perangkat Bergerak',
      pertemuan: 7,
      lab: 'Lab 3',
      tanggal: '2026-11-20',
      jamMulai: '11:00',
      jamSelesai: '09:00', // salah
      createdBy: 'asisten-1',
    });
  });

  const finalScheduleCount = (await scheduleService.getSchedulesForClass('kelas-a')).length;
  assert.equal(finalScheduleCount, initialScheduleCount);
});

