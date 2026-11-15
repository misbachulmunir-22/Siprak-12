# Permintaan perubahan Firestore Rules dari Programmer 2 kepada Programmer 1

File `firestore.rules` tetap dimiliki P1. Jangan menimpa rules dari P1 menggunakan patch ini. Setelah review, P1 perlu menggabungkan akses P2 berikut:

1. `classes/{classId}`:
   - Asisten pada `assistantUids` dapat create/read/update/arsip.
   - Praktikan hanya read jika `classes/{classId}/members/{request.auth.uid}` ada dan `active == true`.
2. `classes/{classId}/members/{uid}`:
   - Asisten kelas terkait dapat list/get/create/update `active` membership.
   - Praktikan hanya dapat get dokumen dengan `{uid}` sama dengan UID login.
   - Query collection group P2 menggunakan `where('uid', '==', request.auth.uid)` dan `where('active', '==', true)`; pastikan Rules mengizinkan list pada dokumen milik UID tersebut dan uji dengan Emulator.
3. `schedules/{scheduleId}`:
   - Asisten yang ditugaskan pada `classId` dapat create/read/update/arsip.
   - Praktikan yang merupakan anggota aktif dapat read.
4. `sessions/{sessionId}`:
   - Asisten kelas terkait dapat create sesi awal `belum_dibuka`.
   - P2 perlu mengubah metadata jadwal pada sesi terkait: `praktikum`, `pertemuan`, `lab`, `tanggal`, `jamMulai`, `jamSelesai`, `kelas`, `updatedAt`, tanpa mengubah `status`, `dibukaPada`, atau `ditutupPada`.
   - P3 tetap satu-satunya owner transisi status `belum_dibuka -> dibuka -> ditutup`.
   - Arsip dapat mengubah `active` menjadi false tanpa mengubah status sesi.
   - Praktikan anggota kelas dapat read.

Contoh batas perubahan metadata sesi yang perlu diakomodasi pada rule `allow update` yang sudah dimiliki P1:

```javascript
(
  assistantFor(resource.data.classId)
  && request.resource.data.classId == resource.data.classId
  && request.resource.data.status == resource.data.status
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    'praktikum', 'pertemuan', 'lab', 'tanggal',
    'jamMulai', 'jamSelesai', 'kelas', 'updatedAt'
  ])
)
```

Gabungkan kondisi tersebut dengan kondisi update status sesi milik P3 (OR), bukan menggantikan validasi transisi P3. P1 harus menguji semua kondisi melalui Firebase Emulator sebelum deploy.

Indeks yang mungkin diminta Firestore:
- `classes`: `assistantUids ARRAY_CONTAINS` + `active ASC`.
- `schedules`: `classId ASC` + `active ASC`.
- `sessions`: `classId ASC` + `active ASC`.
- collection group `members`: `uid ASC` + `active ASC`.

Catatan: Firestore dapat menampilkan tautan pembuatan index saat query pertama dijalankan. Buat index yang diminta pada Firebase Console.
