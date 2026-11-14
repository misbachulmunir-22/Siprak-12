# Catatan Setup & Serah Terima Fondasi — Programmer 1 (Siprak-12)

Dokumen ini disusun oleh **Programmer 1** untuk memberikan panduan arsitektur, kontrak teknis, serta instruksi integrasi modul kepada rekan tim (Harits/Programmer 2, Jeje/Programmer 3, Najib/Programmer 4).

---

## 1. Lingkungan Pengembangan & Versi Dependensi

Pemeriksaan kode dan fondasi dijalankan pada lingkungan berikut:
- **Node.js**: `v24.21.0`
- **npm**: `11.19.0`
- **Expo SDK**: `~58.0.16`
- **Expo Router**: `~58.0.24`
- **React Native**: `0.88.0`
- **React**: `19.3.0`
- **TypeScript**: `~6.0.3` (Strict Mode aktif, zero `any`)

---

## 2. Cara Menjalankan Proyek

### A. Instalasi Dependensi
Gunakan `npm ci` agar dependensi terkunci sesuai dengan `package-lock.json`:
```bash
npm ci
```
*(Catatan: Jangan gunakan `npm audit fix --force` karena dapat memicu konflik versi antarpaket Expo).*

### B. Menjalankan Development Server
```bash
npx expo start
```
Gunakan tombol shortcut pada terminal:
- Tekan `a` untuk membuka di Android emulator / perangkat Android.
- Tekan `w` untuk membuka di browser web.
- Tekan `r` untuk reload aplikasi.

### C. Menjalankan Typecheck dan Lint
```bash
npx tsc --noEmit
npx expo lint
```

---

## 3. Contoh Perintah Build EAS (Panduan Cloud Build)

Sesuai ketentuan, **jangan menjalankan build cloud otomatis**. Jika tim siap membuat build Android:

- **Development Build (Internal APK dengan Dev Client)**:
  ```bash
  npx eas-cli@latest build --profile development --platform android
  ```
- **Preview Build (Internal Standalone APK)**:
  ```bash
  npx eas-cli@latest build --profile preview --platform android
  ```

Konfigurasi `eas.json` telah diperbarui dengan profil `preview` yang menghasilkan APK Android (`"buildType": "apk"`). Konfigurasi `projectId`, `package`, dan `scheme` dipertahankan sepenuhnya.

---

## 4. Karakteristik State & Data In-Memory

Aplikasi Siprak-12 pada Sprint 1 berjalan secara **in-memory lokal**:
1. **Tanpa Database / Backend**: Tidak ada persistensi ke disk/AsyncStorage.
2. **Kondisi Awal**: `currentUser` bernilai `null` saat aplikasi pertama kali dibuka (menampilkan layar masuk).
3. **Data Bertahan Saat Ganti Peran**: Mengganti peran atau logout **tidak** mereset data sesi yang sudah dibuka/ditutup maupun presensi yang sudah ditambahkan.
4. **Data Reset Saat Aplikasi Restart**: Jika aplikasi di-reload (`r`) atau di-restart, state akan kembali ke dummy data awal di `src/data/dummy.ts`.

---

## 5. Kontrak Tipe Data (`@/types/siprak`)

Import yang harus digunakan oleh modul rekan tim:
```typescript
import type {
  Pengguna,
  Peran,
  Sesi,
  StatusSesi,
  StatusRiwayat,
  Presensi,
  AsistenSesiActionsProps,
  PraktikanPresensiActionProps,
  SiprakContextValue,
} from '@/types/siprak';
```

---

## 6. Akses State & Aksi (`@/context/SiprakContext`)

Import yang harus digunakan:
```typescript
import { useSiprakContext } from '@/context/SiprakContext';
```

Nilai dan metode yang tersedia:
```typescript
const {
  currentUser,        // Pengguna | null (asisten / praktikan)
  sessions,           // Sesi[] (4 sesi awal kelas A)
  attendances,        // Presensi[] (data presensi terkini)
  praktikanList,      // Pengguna[] (6 praktikan kelas A)
  login,              // (userId: string) => void
  logout,             // () => void
  openSession,        // (sesiId: string) => void (Khusus asisten, sesi belum_dibuka)
  closeSession,       // (sesiId: string, catatan?: string) => void (Khusus asisten, sesi dibuka)
  checkIn,            // (sesiId: string) => { ok: boolean; reason?: 'belum_dibuka' | 'ditutup' | 'sudah_presensi' }
  getAttendance,      // (sesiId: string) => Presensi[]
  getUserAttendance,  // (userId: string) => Presensi[]
} = useSiprakContext();
```

### Proteksi & Keamanan State
- **Gembok Ketukan Cepat (Anti-Double Check-In)**: Fungsi `checkIn` menggunakan referensi tersinkronisasi (`attendancesRef`) sehingga langsung menolak panggilan berulang instan sebelum render React selesai.
- **Validasi Kelas**: Praktikan hanya diizinkan presensi pada sesi yang memiliki kelas sama dengan kelasnya.
- **Status Guard**: Sesi yang sudah ditutup tidak dapat dibuka kembali; sesi belum dibuka tidak dapat ditutup.
- **Role Guard**: Hanya asisten yang dapat memanggil `openSession` dan `closeSession`.

---

## 7. Desain & Tema Bersama (`@/theme`)

Import tema:
```typescript
import { colors, spacing, fontSizes, statusTokens } from '@/theme';
```

### Token Status Sesi (`statusTokens`)
Komponen `StatusBadge` milik Programmer 2 harus mengambil warna latar, teks, dan label dari token ini:
- `belum_dibuka`: `{ label: 'Belum dibuka', background: '#FFF4D6', text: '#825B00' }`
- `dibuka`: `{ label: 'Dibuka', background: '#DFF5E9', text: '#17643D' }`
- `ditutup`: `{ label: 'Ditutup', background: '#E9EDF3', text: '#526074' }`

---

## 8. Komponen Bersama (`@/components`)

Tersedia dengan default export:
1. `Button` (`@/components/Button`):
   - Props: `title`, `onPress`, `disabled?`, `variant?: 'primary' | 'secondary' | 'danger'`, `style?`, `textStyle?`.
   - Area sentuh minimal 44dp, respons visual, accessibility attrs.
2. `ScreenContainer` (`@/components/ScreenContainer`):
   - Props: `children`, `style?`, `disablePadding?`, `edges?`.
   - Menggunakan SafeAreaContext bawaan, `flex: 1`, tidak mengunci scrollview (aman untuk FlatList).
3. `ConfirmModal` (`@/components/ConfirmModal`):
   - Props: `visible`, `title`, `message?`, `confirmText?`, `cancelText?`, `onConfirm`, `onCancel`, `children?`, `confirmDisabled?`, `destructive?`.
   - Slot `children` dapat digunakan untuk input catatan penutup sesi (Programmer 3).

---

## 9. Struktur Rute & Panduan Integrasi Modul Rekan

| Path Rute | File Lokasi | Penanggung Jawab | Status Saat Ini | Keterangan Integrasi |
|---|---|---|---|---|
| `/` | `src/app/index.tsx` | Programmer 1 | **Selesai** | Layar masuk dengan seleksi peran & identitas |
| `/asisten` | `src/app/asisten/index.tsx` | Programmer 2 (Harits) | *Placeholder* | Tab Jadwal Asisten |
| `/asisten/rekap` | `src/app/asisten/rekap.tsx` | Programmer 3 (Jeje) | *Placeholder* | Tab Rekap Asisten |
| `/asisten/profil` | `src/app/asisten/profil.tsx` | Programmer 1 | **Selesai** | Profil Asisten & Ganti Peran |
| `/praktikan` | `src/app/praktikan/index.tsx` | Programmer 2 (Harits) | *Placeholder* | Tab Jadwal Praktikan |
| `/praktikan/riwayat`| `src/app/praktikan/riwayat.tsx` | Programmer 4 (Najib) | *Placeholder* | Tab Riwayat Praktikan |
| `/praktikan/profil` | `src/app/praktikan/profil.tsx` | Programmer 1 | **Selesai** | Profil Praktikan & Ganti Peran |
| `/sesi/[id]` | `src/app/sesi/[id].tsx` | Programmer 2 (Harits) | *Placeholder* (dengan guard) | Layar Detail Sesi & Aksi Sesi |
| `/rekap/[id]` | `src/app/rekap/[id].tsx` | Programmer 3 (Jeje) | *Placeholder* (dengan guard) | Layar Detail Rekap Sesi |

### Cara Mengintegrasikan Modul:
1. **Harits (P2)**:
   - Ganti isi `src/app/asisten/index.tsx` dan `src/app/praktikan/index.tsx` dengan komponen `JadwalList`, `SesiCard`, dan `EmptyState`.
   - Di `src/app/sesi/[id].tsx`, pasang `SesiInfoCard`, `StatusBadge`, serta panggil `AsistenSesiActions` (jika peran asisten) atau `PraktikanPresensiAction` (jika peran praktikan).
2. **Jeje (P3)**:
   - Isi `src/app/asisten/rekap.tsx` dengan daftar `RekapItem`.
   - Isi `src/app/rekap/[id].tsx` dengan rekap per sesi lengkap.
   - Sediakan komponen named export `export function AsistenSesiActions({ sesi }: AsistenSesiActionsProps)` di `@/components/AsistenSesiActions.tsx`.
3. **Najib (P4)**:
   - Isi `src/app/praktikan/riwayat.tsx` dengan komponen riwayat presensi praktikan.
   - Sediakan default export `export default function PraktikanPresensiAction({ sesi }: PraktikanPresensiActionProps)` di `@/components/PraktikanPresensiAction.tsx`.
   - Tulis dokumentasi akhir di `README.md` utama.

---

## 10. Hasil Pemeriksaan & Batasan

- **TypeScript (`npx tsc --noEmit`)**: **LULUS (0 error)**.
- **Linting (`npx expo lint`)**: Berjalan sesuai aturan Expo.
- **Uji Android Emulator / Device**: Belum dijalankan (memerlukan lingkungan emulator lokal pengguna).
- **Usulan Konfigurasi Aplikasi**: Nama aplikasi di `app.json` saat ini masih bernilai `"my-expo-app"`. Diusulkan untuk diubah menjadi `"Siprak-12"` setelah disepakati bersama oleh tim.
