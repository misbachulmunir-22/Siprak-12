# Siprak-12 — Pengganti Modul Programmer 1 (Auth & Profil)

## Isi ZIP dan cara pakai

Arsip ini adalah **patch**, bukan salinan penuh proyek. Isinya hanya file yang perlu ditambahkan atau diganti di atas baseline `main`, agar pekerjaan modul lain tidak tertimpa.

1. Pastikan terminal berada di folder proyek `Siprak-12` pada branch `pm/sprint-2-implementation`.
2. Buat salinan/commit checkpoint sebelum menimpa file.
3. Ekstrak isi ZIP ini langsung ke root folder proyek (pilih merge/replace untuk file yang sama). Folder `src/` akan digabungkan dengan struktur yang sudah ada; file rules dan dokumentasi berada di root proyek.
4. Dari root proyek jalankan:

```bash
npx expo install @react-native-async-storage/async-storage
npx expo install --fix
npx tsc --noEmit
```

Firebase SDK `firebase` sudah ada pada `package.json` baseline `main`, jadi tidak perlu memasang Firebase SDK lagi. Paket AsyncStorage diperlukan untuk persistensi sesi Firebase Authentication di React Native.

## Yang disediakan

- `src/firebase.ts`: memakai kembali konfigurasi Firebase `siprak-12-sprint-2` dari baseline `main`, menambahkan Firebase Auth persistence berbasis AsyncStorage, dan tetap memakai Firestore modular SDK.
- `src/services/authService.ts`: registrasi, login, logout, reset password, validasi, dan pesan error Firebase.
- `src/services/userService.ts`: baca/tulis/listen profil `users/{uid}` dan mapper dokumen Firestore ke model aplikasi.
- `src/context/SiprakContext.tsx`: observer auth, listener profil real-time, role dan active dari Firestore, cleanup listener saat logout.
- `src/types/siprak.ts`: menambahkan kontrak auth/profil dan model SRS Sprint 2 sambil menjaga tipe layar Sprint 1.
- `src/components/AuthForm.tsx`, `src/app/register.tsx`, `src/app/account-pending.tsx`: form registrasi, form login, dan halaman status akun.
- `src/app/index.tsx` dan `src/app/_layout.tsx`: mengganti pemilihan identitas dummy menjadi login email/password dan mendaftarkan route baru.
- `src/app/asisten/_layout.tsx` dan `src/app/praktikan/_layout.tsx`: route guard menunggu status auth selesai dan memeriksa role dari profil Firestore.
- `src/components/ProfileView.tsx`: mengganti aksi “Ganti Peran” menjadi logout; role tidak bisa diganti dari aplikasi.
- `firestore.rules`: rancangan aturan akses deny-by-default untuk koleksi Sprint 2 yang tercantum pada SRS.

## Perbaikan penting dibanding ZIP Jeje

1. Backend tiruan `src/lib/firebase.ts` Jeje tidak digunakan. Modul tersebut memakai penyimpanan lokal/memory dan REST wrapper buatan sendiri, bukan Firebase SDK yang sudah dipasang di `main`.
2. Tidak ada akun demo dengan password hardcoded dan tidak ada role asisten otomatis berdasarkan email. Semua role dibaca dari `users/{uid}`.
3. Registrasi hanya membuat role `praktikan`. Form klien tidak menyediakan pilihan role asisten.
4. Logout benar-benar menjalankan `signOut(auth)` dan membersihkan listener/state privat.
5. Data profil tidak diberi kelas hardcoded seperti `kelas-a` atau pemetaan email demo. Keanggotaan kelas dikelola modul kelas.
6. Login pulih setelah aplikasi ditutup/dibuka menggunakan AsyncStorage.

## Pengaturan Firebase yang harus dilakukan

### 1. Authentication

Di Firebase Console, buka project **siprak-12-sprint-2** → Authentication → Sign-in method → aktifkan **Email/Password**.

### 2. Firestore Rules untuk tes P1

Untuk menguji registrasi/login pada fase P1 saja, gunakan `firestore.auth-only.rules` terlebih dahulu di Firebase Console → Firestore Database → Rules → paste isi file → Publish. Aturan sementara ini hanya membuka pembuatan dan pembacaan profil milik akun sendiri; semua koleksi lain tetap tertutup. **Jangan gunakan file auth-only sebagai rules final Sprint 2.**

Setelah P2/P3/P4 selesai dan kontrak field dikunci, uji `firestore.rules` di Firebase Emulator Suite. File ini adalah baseline gabungan semua koleksi SRS dan harus direview sebelum dipublikasikan.

Database tetap menggunakan Cloud Firestore project yang sama. Setelah registrasi berhasil, aplikasi membuat dokumen:

`users/{Firebase Auth UID}`

Field awal:
- `uid`: UID Firebase Authentication
- `nama`: nama pengguna
- `email`: email akun
- `role`: `praktikan`
- `nim`: opsional
- `active`: `true`
- `createdAt`, `updatedAt`: server timestamp

### 3. Membuat akun asisten

Akun asisten **tidak** dapat dibuat dari halaman registrasi. Pengelola harus membuat akun melalui Firebase Authentication Console, lalu membuat/memperbarui dokumen `users/{uid}` melalui proses administratif tepercaya dengan minimal field:

```json
{
  "uid": "UID_DARI_FIREBASE_AUTH",
  "nama": "Nama Asisten",
  "email": "email-asisten@example.com",
  "role": "asisten",
  "active": true
}
```

Tambahkan `createdAt` dan `updatedAt` dengan tipe Timestamp. Penugasan kelas tetap dilakukan pada dokumen kelas melalui modul P2/pengelola.

## Penting tentang `firestore.rules`

File rules di arsip ini merupakan **baseline implementasi Sprint 2**, bukan bukti bahwa semua UT sudah lulus. SRS halaman 26 menyatakan Lampiran B hanya kerangka diskusi dan P1 wajib melengkapi serta menguji di Firebase Emulator sebelum deploy.

Untuk kompatibilitas `firestore.rules`, service P4 harus membuat ID dokumen izin deterministik: `${sessionId}_${praktikanUid}`. Ini dipakai Rules untuk mencegah dua pengajuan aktif pada sesi yang sama dan mengizinkan pemilik mengajukan ulang setelah status sebelumnya `ditolak`.

Karena modul P2/P3/P4 belum diintegrasikan, jangan langsung publish rules ke Firebase production sebelum:
- kontrak `classId`, `sessionId`, `assistantUids`, `members/{uid}`, dan field timestamp dikonfirmasi seluruh programmer;
- semua service P2/P3/P4 menggunakan collection/field yang sama;
- Security Rules diuji untuk akun praktikan, asisten, pengguna tanpa profil, dan akses lintas akun;
- uji presensi paralel dan uji keputusan izin dijalankan.

Aturan `users` mencegah pengguna mengubah `role` atau `active` miliknya sendiri. Perubahan role harus dilakukan oleh pengelola tepercaya.

## Batas lingkup / integrasi berikutnya

- Modul ini menangani FR-S2-01 sampai FR-S2-04 dan fondasi otorisasi FR-S2-22.
- `SiprakContext` tidak lagi mengambil sessions/attendances/praktikan dari `dummy.ts`. Field kompatibilitas lama masih ada tetapi berupa array kosong agar komponen Sprint 1 tidak langsung gagal compile.
- Fungsi `login(userId)`, `openSession`, `closeSession`, dan `checkIn` dipertahankan sebagai adapter sementara; fungsi sesi/presensi ini sengaja tidak menjalankan operasi lokal. P3/P4 wajib menggantinya dengan service Firestore.
- Listener profil dibersihkan saat logout/unmount. Hook data modul lain dapat menggunakan `registerCleanupListener()` dari `useSiprakContext()` untuk mendaftarkan cleanup.

## Checklist uji P1

- [ ] Registrasi dengan email baru membuat akun Auth dan dokumen `users/{uid}` role `praktikan`.
- [ ] Pengguna tidak dapat mengirim role `asisten` dari form/klien.
- [ ] Login email/password valid memuat profil dari Firestore.
- [ ] Kredensial salah menampilkan pesan yang mudah dipahami.
- [ ] Force close lalu buka aplikasi: status login dipulihkan.
- [ ] Logout mengakhiri sesi Firebase dan kembali ke halaman masuk.
- [ ] Role tidak sesuai tidak dapat membuka route kelompok lain.
- [ ] Akun yang profilnya hilang/tidak aktif diarahkan ke halaman status akun.
- [ ] Pengguna tidak dapat membaca/mengubah profil pengguna lain melalui rules.
- [ ] Uji emulator membuktikan request tanpa role aktif ditolak.

## Daftar file

Lihat `PATCH_MANIFEST.txt` untuk daftar file yang ditambahkan/diganti.
