import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSiprakContext } from '@/context/SiprakContext';
import { AsistenSesiActions } from '@/components/AsistenSesiActions';
import PraktikanPresensiAction from '@/components/PraktikanPresensiAction';
import EmptyState from '@/components/EmptyState';
import SesiInfoCard from '@/components/SesiInfoCard';

export default function SesiDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, sessions } = useSiprakContext();
  const sesi = sessions.find((item) => item.id === id);

  if (!sesi) {
    return (
      <View style={styles.missing}>
        <EmptyState title="Sesi tidak ditemukan" description="Sesi ini mungkin sudah tidak tersedia. Kembali ke jadwal untuk memilih sesi lain." />
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke jadwal" onPress={() => router.back()} hitSlop={8} style={styles.backLink}>
        <Text style={styles.backText}>‹  Jadwal</Text>
      </Pressable>
      <Text style={styles.screenTitle}>Detail sesi</Text>
      <SesiInfoCard sesi={sesi} />
      <View style={styles.actionSection}>
        {currentUser?.peran === 'asisten' ? <AsistenSesiActions sesi={sesi} /> : null}
        {currentUser?.peran === 'praktikan' ? <PraktikanPresensiAction sesi={sesi} /> : null}
        {!currentUser ? (
          <EmptyState title="Pilih identitas terlebih dahulu" description="Masuk sebagai asisten atau praktikan untuk melihat tindakan yang tersedia." />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F5F7FB', flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: 18, paddingTop: 12 },
  backLink: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingRight: 12 },
  backText: { color: '#315CCB', fontSize: 15, fontWeight: '700' },
  screenTitle: { color: '#17243B', fontSize: 24, fontWeight: '800', marginBottom: 16 },
  actionSection: { marginTop: 16 },
  missing: { backgroundColor: '#F5F7FB', flex: 1, justifyContent: 'center', padding: 18 },
  backButton: { alignItems: 'center', backgroundColor: '#315CCB', borderRadius: 12, justifyContent: 'center', marginTop: 14, minHeight: 48 },
  backButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
