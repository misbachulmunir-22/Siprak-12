# Siprak-12 — Sistem Informasi Praktikum

Prototipe Sprint 1 untuk alur presensi praktikum asisten dan praktikan. Pada Sprint 1, data disimpan dalam state aplikasi dan belum memakai database, backend, atau autentikasi sungguhan.

## Lingkup Programmer 4

Berkas yang menjadi tanggung jawab Programmer 4 pada paket ini:

- `src/components/PraktikanPresensiAction.tsx` — konfirmasi presensi, status sesi, dan pencegahan presensi ganda pada UI.
- `src/components/PresensiSuccessSheet.tsx` — bottom sheet sukses dengan waktu yang benar-benar tercatat di Context.
- `src/app/praktikan/riwayat.tsx` — riwayat kelas praktikan, status Hadir/Belum hadir/Belum dimulai, total kehadiran, serta empty state.
- `src/utils/presensi.ts` — helper format tanggal/jam, urutan sesi, pencarian presensi, dan penentuan status riwayat.

Programmer 4 tidak mengubah `SiprakContext`, tipe bersama, tema global, layout tab, halaman masuk, halaman jadwal/detail sesi, maupun modul asisten.

## Persyaratan dan perintah pemeriksaan

Gunakan Node.js/npm sesuai versi proyek yang disepakati tim. Dari akar repositori:

```bash
npm install
npx tsc --noEmit
npx expo-doctor
```

Proyek dalam SRS menggunakan Expo development build (bukan Expo Go):

```bash
npx expo start --dev-client
```

Untuk membuat APK development, login ke Expo lalu jalankan:

```bash
npx eas-cli login
npx eas-cli build --platform android --profile development
```

Pastikan profil `development` dalam `eas.json` disiapkan Programmer 1 sesuai konfigurasi tim.

## Kontrak integrasi yang digunakan paket ini

Paket ini mengikuti API Context yang tersedia dalam ZIP `feat/modul-asisten-jeje` yang diberikan untuk integrasi:

- `useSiprakContext()` dari `@/context/SiprakContext`.
- Tipe `PraktikanPresensiActionProps`, `Sesi`, `Presensi`, dan `StatusRiwayat` dari `@/types/siprak`.
- Context menyediakan `currentUser`, `sessions`, `attendances`, `checkIn(sesiId)`, dan `getUserAttendance(userId)`.

Jangan menyalin berkas Context atau tipe bersama dari paket ini, karena memang tidak disertakan: keduanya bukan berkas milik Programmer 4. Integrasikan setelah kontrak tersebut masuk ke branch integrasi. Programmer 2 perlu memasang komponen aksi ini di detail sesi dan mendaftarkan rute riwayat lewat layout praktikan.
