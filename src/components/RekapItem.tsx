import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface RekapItemProps {
  nomor: number;
  nama: string;
  nim?: string;
  status: 'hadir' | 'belum_hadir';
  waktuHadir?: string;
}

export function RekapItem({ nomor, nama, nim, status, waktuHadir }: RekapItemProps) {
  const isHadir = status === 'hadir';

  const formatJam = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      const jam = String(date.getHours()).padStart(2, '0');
      const menit = String(date.getMinutes()).padStart(2, '0');
      return `${jam}:${menit} WIB`;
    } catch {
      return isoString;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.identityContainer}>
          <View style={styles.nomorBadge}>
            <Text style={styles.nomorText}>{nomor}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.namaText} numberOfLines={1}>
              {nama}
            </Text>
            {nim ? <Text style={styles.nimText}>NIM. {nim}</Text> : null}
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            isHadir ? styles.statusBadgeHadir : styles.statusBadgeBelum,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isHadir ? styles.statusDotHadir : styles.statusDotBelum,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isHadir ? styles.statusTextHadir : styles.statusTextBelum,
            ]}
          >
            {isHadir ? 'Hadir' : 'Belum hadir'}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.labelWaktu}>Waktu Presensi</Text>
        <Text style={[styles.valWaktu, isHadir && styles.valWaktuActive]}>
          {formatJam(waktuHadir)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  identityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  nomorBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nomorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  textContainer: {
    flex: 1,
  },
  namaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  nimText: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeHadir: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusBadgeBelum: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusDotHadir: {
    backgroundColor: '#16A34A',
  },
  statusDotBelum: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextHadir: {
    color: '#15803D',
  },
  statusTextBelum: {
    color: '#64748B',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  labelWaktu: {
    fontSize: 12,
    color: '#94A3B8',
  },
  valWaktu: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  valWaktuActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
});
