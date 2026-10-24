import React, { useState } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSiprakContext } from '@/context/SiprakContext';
import { AsistenSesiActions } from '@/components/AsistenSesiActions';

export default function AsistenHomeScreen() {
  const { currentUser, sessions, attendances } = useSiprakContext();
  const [selectedSesiId, setSelectedSesiId] = useState<string>(sessions[1]?.id || 'sesi-2');

  const selectedSesi = sessions.find((s) => s.id === selectedSesiId) || sessions[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>SIPRAK-12</Text>
          <Text style={styles.appSubtitle}>Sistem Informasi Praktikum</Text>
        </View>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>MODUL ASISTEN</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Kartu Profil Asisten */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarInitial}>
              {currentUser?.nama?.charAt(0) || 'J'}
            </Text>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{currentUser?.nama || 'Jeje Setyo'}</Text>
            <Text style={styles.profileRole}>Asisten Laboratorium</Text>
          </View>
          <TouchableOpacity
            style={styles.rekapNavButton}
            onPress={() => router.push('/asisten/rekap')}
            activeOpacity={0.8}
          >
            <Text style={styles.rekapNavButtonText}>Buka Tab Rekap</Text>
          </TouchableOpacity>
        </View>

        {/* Pemilih Sesi Praktikum untuk Pengujian Panel Aksi */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>Pilih Sesi Praktikum</Text>
          <Text style={styles.sectionHeaderSubtitle}>
            Pilih sesi di bawah untuk menguji aksi Buka Sesi, Tutup Sesi, dan Rekap kehadiran.
          </Text>

          <View style={styles.sesiSelectorRow}>
            {sessions.map((sesi) => {
              const isSelected = sesi.id === selectedSesi.id;
              const isBelum = sesi.status === 'belum_dibuka';
              const isBuka = sesi.status === 'dibuka';

              return (
                <TouchableOpacity
                  key={sesi.id}
                  style={[
                    styles.sesiChip,
                    isSelected && styles.sesiChipSelected,
                  ]}
                  onPress={() => setSelectedSesiId(sesi.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sesiChipText,
                      isSelected && styles.sesiChipTextSelected,
                    ]}
                  >
                    Pertemuan {sesi.pertemuan}
                  </Text>
                  <View
                    style={[
                      styles.chipStatusDot,
                      isBelum
                        ? styles.chipDotBelum
                        : isBuka
                        ? styles.chipDotBuka
                        : styles.chipDotTutup,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Info Detail Sesi Terpilih */}
        <View style={styles.selectedSesiDetailCard}>
          <Text style={styles.sesiPraktikumTitle}>{selectedSesi.praktikum}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Kelas</Text>
              <Text style={styles.metaVal}>{selectedSesi.kelas}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Laboratorium</Text>
              <Text style={styles.metaVal}>{selectedSesi.lab}</Text>
            </View>
          </View>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaVal}>{selectedSesi.tanggal}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Jadwal</Text>
              <Text style={styles.metaVal}>
                {selectedSesi.jamMulai} - {selectedSesi.jamSelesai} WIB
              </Text>
            </View>
          </View>
        </View>

        {/* Komponen Utama Programmer 3: AsistenSesiActions */}
        <AsistenSesiActions sesi={selectedSesi} />

        {/* Ringkasan Cepat Navigasi */}
        <View style={styles.quickNavCard}>
          <Text style={styles.quickNavTitle}>Navigasi Layar Rekapitulasi</Text>
          <Text style={styles.quickNavDesc}>
            Anda dapat langsung memeriksa tabel rekapitulasi kehadiran mahasiswa untuk seluruh sesi praktikum.
          </Text>
          <TouchableOpacity
            style={styles.quickNavBtn}
            onPress={() => router.push('/asisten/rekap')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickNavBtnText}>Menuju Tab Rekapitulasi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rekapNavButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rekapNavButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  sectionContainer: {
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  sesiSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sesiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sesiChipSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  sesiChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginRight: 6,
  },
  sesiChipTextSelected: {
    color: '#FFFFFF',
  },
  chipStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipDotBelum: {
    backgroundColor: '#94A3B8',
  },
  chipDotBuka: {
    backgroundColor: '#22C55E',
  },
  chipDotTutup: {
    backgroundColor: '#EF4444',
  },
  selectedSesiDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 6,
  },
  sesiPraktikumTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  metaGrid: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  quickNavCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  quickNavTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  quickNavDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  quickNavBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  quickNavBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});