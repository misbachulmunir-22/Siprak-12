import { StatusSesi } from '@/types/siprak';

/**
 * Tema bersama aplikasi Siprak-12.
 * Digunakan oleh seluruh modul untuk menjaga konsistensi visual.
 * 
 * CATATAN INTEGRASI UNTUK PROGRAMMER 2:
 * Komponen StatusBadge nantinya harus mengambil konfigurasi warna dan label
 * dari statusTokens di bawah ini.
 */

export const colors = {
  primary: '#1E40AF', // Biru navy profesional
  primaryDark: '#1E3A8A',
  primaryLight: '#3B82F6',
  background: '#F8FAFC', // Latar belakang terang (slate-50)
  surface: '#FFFFFF', // Permukaan kartu/elemen putih
  surfaceSubtle: '#F1F5F9', // Permukaan abu-abu lembut
  text: '#0F172A', // Teks kontras tinggi (slate-900)
  textSecondary: '#475569', // Teks sekunder (slate-600)
  muted: '#64748B', // Teks muted/petunjuk (slate-500)
  border: '#E2E8F0', // Garis batas elemen (slate-200)
  borderFocus: '#3B82F6',
  danger: '#DC2626', // Merah peringatan/hapus (red-600)
  dangerLight: '#FEE2E2',
  success: '#16A34A', // Hijau berhasil (green-600)
  successLight: '#DCFCE7',
  warning: '#D97706', // Oranye/kuning peringatan
  warningLight: '#FEF3C7',
  disabled: '#CBD5E1',
  disabledText: '#94A3B8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
};

export const statusTokens: Record<
  StatusSesi,
  {
    label: string;
    background: string;
    text: string;
  }
> = {
  belum_dibuka: {
    label: 'Belum dibuka',
    background: '#FFF4D6',
    text: '#825B00',
  },
  dibuka: {
    label: 'Dibuka',
    background: '#DFF5E9',
    text: '#17643D',
  },
  ditutup: {
    label: 'Ditutup',
    background: '#E9EDF3',
    text: '#526074',
  },
};
