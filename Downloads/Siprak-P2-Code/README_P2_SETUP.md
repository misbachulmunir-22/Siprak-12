# Siprak-12 — Patch Programmer 2 (FR-S2-05 s.d. FR-S2-09)

Patch ini ditujukan untuk digabungkan ke atas `Siprak-12-Baseline+auth_firebase(p1)` yang diberikan. Ini bukan full project dan tidak membawa `node_modules`, konfigurasi Firebase, `package.json`, Context, model bersama, atau Firestore Rules.

## Cakupan
- FR-S2-05: pemetaan UID praktikan ke kelas.
- FR-S2-06: CRUD kelas (arsip non-destruktif).
- FR-S2-07: keanggotaan peserta; pengeluaran peserta tidak menghapus riwayat.
- FR-S2-08: pembuatan/arsip jadwal dan pembuatan dokumen sesi awal.
- FR-S2-09: daftar jadwal/sesi berbasis kelas dan role, listener Firestore.
- FR-S2-13: listener kelas/peserta/jadwal/master data.
- FR-S2-21: loading, empty, validasi, dan error pada layar P2.

## File
**Ditambahkan**
- `src/services/classService.ts`
- `src/services/scheduleService.ts`
- `src/hooks/useP2Data.ts`
- `src/app/asisten/kelas.tsx`
- `src/app/asisten/peserta.tsx`
- `src/app/asisten/jadwal.tsx`

**Diganti (P2 owner)**
- `src/components/JadwalList.tsx`
- `src/app/asisten/index.tsx`

Tidak ada perubahan pada file owner P1/P3/P4.

## Cara merge
1. Checkout branch integrasi yang sudah berisi P1.
2. Salin/merge isi folder `src/` dari ZIP ini ke root proyek. Jangan mengganti file lain.
3. Pastikan `src/firebase.ts`, `src/types/siprak.ts`, dan `src/context/SiprakContext.tsx` berasal dari patch P1.
4. Jalankan:
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```
5. P2 memerlukan Rules yang mengizinkan asisten yang tercantum pada `assistantUids` mengelola kelas dan subkoleksi `members`, serta mengizinkan praktikan membaca membership miliknya. P2 tidak mengubah `firestore.rules` karena file itu dimiliki P1. Serahkan matriks akses pada bagian bawah kepada P1 untuk digabung dan diuji.

## Kontrak data lintas P3/P4
P2 menggunakan collection dan field sesuai SRS:
- `classes/{classId}`: `nama`, `kode`, `namaPraktikum`, `assistantUids`, `active`, `createdAt`, `updatedAt`.
- `classes/{classId}/members/{uid}`: `uid`, `namaSnapshot`, `nimSnapshot`, `joinedAt`, `active`.
- `schedules/{scheduleId}`: `classId`, `namaPraktikum`, `pertemuan`, `lab`, `tanggal`, `jamMulai`, `jamSelesai`, `createdBy`, `active`, timestamps.
- `sessions/{sessionId}`: `scheduleId`, `classId`, `praktikum`, `pertemuan`, `kelas`, `lab`, `tanggal`, `jamMulai`, `jamSelesai`, `status='belum_dibuka'`, timestamps.

`sessionId` adalah ID dokumen Firestore yang dibuat saat jadwal disimpan. P3 harus membaca collection `sessions` dan memperbarui dokumen sesi tersebut, bukan membuat sesi kedua untuk jadwal yang sama. `scheduleId` disimpan di dokumen sesi untuk relasi.

P4 menggunakan `sessionId` dan `classId` dari dokumen `sessions`; membership berada pada `classes/{classId}/members/{praktikanUid}`. UID Firebase menjadi identitas utama.

## Matriks akses untuk P1 (FR-S2-22)
- `classes`: asisten hanya CRUD kelas ketika UID ada di `assistantUids`; praktikan hanya read kelas jika membership aktif.
- `classes/{classId}/members`: asisten yang ditugaskan boleh read/create/update membership; praktikan hanya read dokumen dengan ID UID miliknya.
- `users/{uid}`: P2 membaca profil UID yang dimasukkan untuk validasi role `praktikan` dan status `active`; penulisan `role`/`active` tidak dilakukan P2. Saat menambah/mengeluarkan anggota, P2 memperbarui hanya `kelasIds` pada profil peserta. Rules harus mengizinkan update terbatas field `kelasIds` oleh asisten kelas terkait, atau PM/P1 dapat memindahkan sinkronisasi ini ke backend tepercaya.
- `schedules`: asisten kelas terkait CRUD; praktikan read jika membership aktif.
- `sessions`: P2 membuat sesi awal dan memperbarui metadata jadwal; P3 memiliki aksi transisi status buka/tutup. Praktikan read jika membership aktif.

## Batasan implementasi / catatan integrasi
- API koleksi `users/{uid}/classMemberships` tidak digunakan. Data membership authoritative tetap `classes/{classId}/members/{uid}`; daftar kelas praktikan menggunakan `kelasIds` yang dipelihara pada profil users oleh operasi P2.
- Firestore `where ... in` membatasi query ke 30 classId per query pada implementasi ini. Jika akun perlu lebih dari 30 kelas, perlu batching query yang disetujui PM.
- P2 tidak mengubah status sesi; aksi buka/tutup tetap milik P3.
- Arsip menonaktifkan dokumen, tidak menghapus data historis.
- Rules P1 yang aktif harus direview. Jika rules masih `auth-only`, operasi kelas/jadwal akan menerima `permission-denied` sampai Rules gabungan diterapkan.
