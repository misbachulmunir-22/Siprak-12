# Audit ZIP Jeje terhadap baseline main dan SRS Sprint 2

## Hasil pemeriksaan

Sumber yang dibandingkan:
- `Siprak-12-main (3)(4).zip` — baseline kode.
- `Siprak-12-feat-s2-auth-firebase-p1(3).zip` — referensi hasil Jeje.
- `SRS_Siprak-12_Sprint-2_Revisi_Final (1)(5).pdf` — acuan kebutuhan Sprint 2.

## Mengapa ZIP Jeje tidak bisa langsung dipakai

| Area | Temuan pada ZIP Jeje | Penanganan pada patch ini |
|---|---|---|
| Backend | `src/lib/firebase.ts` adalah implementasi REST/local mock buatan sendiri dengan memory/localStorage fallback dan akun seed. | Tidak digunakan. Kembali ke Firebase JS SDK modular yang sudah ada di baseline. |
| Dependencies | `package.json` Jeje tidak memiliki dependency `firebase`. | Tidak membawa `package.json` Jeje; memakai `firebase` dari baseline `main`. |
| Project config | Jeje memindahkan import ke `@/lib/firebase`; baseline sudah memiliki `src/firebase.ts` dengan Firebase project `siprak-12-sprint-2`. | Memakai `src/firebase.ts` baseline dan menambahkan persistence Auth. |
| Akun demo | Ada seed email/password demo dan daftar UID hardcoded dalam Context. | Login hanya email/password Firebase; tidak ada kredensial demo hardcoded. |
| Role | `userService` Jeje mengubah role berdasarkan email demo tertentu. | Tidak ada pemetaan role dari email. Role dibaca dari `users/{uid}.role`. |
| Keanggotaan | Profil demo diberi kelas seperti `kelas-a` secara hardcoded. | Registrasi tidak menetapkan kelas. Membership menjadi tanggung jawab modul kelas/P2. |
| Logout | Context Jeje membersihkan state/listener, tetapi fungsi logout tidak memanggil `authService.logout()`/Firebase `signOut`. | Logout menjalankan Firebase `signOut` lalu membersihkan state/listener. |
| Data global | Context Jeje melakukan prefetch ID sesi/praktikan hardcoded. | Context hanya mengelola Auth/profil. Data bisnis dimuat service per modul. |
| Security Rules | Rules Jeje mengizinkan assistant membaca profil praktikan tanpa batasan daftar, dan update sesi hanya membatasi field classId/status tanpa whitelist field. | Rules ditulis ulang lebih ketat dan dibagi menjadi auth-only sementara + rancangan gabungan. Tetap wajib diuji emulator sebelum deploy. |

## Batas implementasi

Patch ini difokuskan pada tanggung jawab Programmer 1:
- FR-S2-01: registrasi akun.
- FR-S2-02: login.
- FR-S2-03: logout dan pemulihan sesi.
- FR-S2-04: profil dan pembatasan role.
- Fondasi FR-S2-22: aturan akses Firestore.
- FR-S2-21 untuk state loading/error pada alur autentikasi.

Kode ini tidak mengambil alih UI/CRUD kelas, jadwal, sesi, presensi, rekap, atau pengajuan izin milik modul P2–P4. Adapter lama pada Context hanya dipertahankan agar komponen Sprint 1 masih kompatibel saat integrasi bertahap; adapter itu bukan implementasi Firestore untuk Sprint 2.
