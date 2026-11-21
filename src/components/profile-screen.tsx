import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSiprak } from "@/context/SiprakContext";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";
}

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout } = useSiprak();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const nama = currentUser?.nama ?? "Pengguna SIPRAK";
  const isPraktikan = currentUser?.peran === "praktikan";

  function keluarAkun() {
    setLogoutModalVisible(false);
    logout();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>AKUN SIPRAK</Text>
            <Text style={styles.title}>Profil</Text>
            <Text style={styles.subtitle}>Identitas dan akses akunmu.</Text>
          </View>
          <View style={styles.headerIcon}>
            <SymbolView
              name={{ android: "manage_accounts", ios: "person.crop.circle", web: "manage_accounts" }}
              size={28}
              tintColor="#173F7A"
            />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(nama)}</Text>
            </View>
            <View style={styles.activeBadge}>
              <SymbolView
                name={{ android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" }}
                size={16}
                tintColor="#B8F0D0"
              />
              <Text style={styles.activeText}>Akun aktif</Text>
            </View>
          </View>

          <Text style={styles.name}>{nama}</Text>
          <View style={styles.rolePill}>
            <SymbolView
              name={isPraktikan
                ? { android: "school", ios: "graduationcap", web: "school" }
                : { android: "support_agent", ios: "person.badge.key", web: "support_agent" }}
              size={17}
              tintColor="#FFFFFF"
            />
            <Text style={styles.roleText}>
              {isPraktikan ? "Praktikan" : "Asisten praktikum"}
            </Text>
          </View>
          <Text style={styles.heroHint}>
            {isPraktikan
              ? "Peserta kegiatan praktikum SIPRAK"
              : "Pengelola jadwal dan presensi praktikum"}
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Informasi akun</Text>
            <Text style={styles.sectionCaption}>Detail identitas yang terdaftar</Text>
          </View>
          <SymbolView
            name={{ android: "badge", ios: "person.text.rectangle", web: "badge" }}
            size={23}
            tintColor="#52627B"
          />
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            icon={{ android: "person", ios: "person", web: "person" }}
            label="Nama lengkap"
            value={nama}
          />
          <InfoRow
            icon={{ android: "verified_user", ios: "checkmark.seal", web: "verified_user" }}
            label="Peran"
            value={isPraktikan ? "Praktikan" : "Asisten praktikum"}
          />
          {isPraktikan ? (
            <>
              <InfoRow
                icon={{ android: "badge", ios: "number", web: "badge" }}
                label="NIM"
                value={currentUser?.nim || "Belum tersedia"}
              />
              <InfoRow
                icon={{ android: "school", ios: "graduationcap", web: "school" }}
                label="Kelas"
                value={currentUser?.kelas || "Belum terhubung"}
                isLast={!currentUser?.namaPraktikum}
              />
              {currentUser?.namaPraktikum ? (
                <InfoRow
                  icon={{ android: "science", ios: "flask", web: "science" }}
                  label="Praktikum"
                  value={currentUser.namaPraktikum}
                  isLast
                />
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.aboutCard}>
          <View style={styles.aboutIcon}>
            <SymbolView
              name={{ android: "auto_awesome", ios: "sparkles", web: "auto_awesome" }}
              size={21}
              tintColor="#173F7A"
            />
          </View>
          <View style={styles.aboutCopy}>
            <Text style={styles.aboutTitle}>Satu tempat untuk praktikum</Text>
            <Text style={styles.aboutText}>
              Kelola jadwal, presensi, peserta, dan pengajuan izin melalui SIPRAK.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setLogoutModalVisible(true)}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <View style={styles.logoutIconBox}>
            <SymbolView
              name={{ android: "logout", ios: "rectangle.portrait.and.arrow.right", web: "logout" }}
              size={22}
              tintColor="#B42332"
            />
          </View>
          <View style={styles.logoutCopy}>
            <Text style={styles.logoutTitle}>Keluar dari akun</Text>
            <Text style={styles.logoutSubtitle}>Akhiri sesi SIPRAK di perangkat ini</Text>
          </View>
          <SymbolView
            name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
            size={21}
            tintColor="#B42332"
          />
        </Pressable>
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay} accessibilityViewIsModal>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup dialog"
            onPress={() => setLogoutModalVisible(false)}
            style={styles.modalScrim}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <SymbolView
                name={{ android: "logout", ios: "rectangle.portrait.and.arrow.right", web: "logout" }}
                size={28}
                tintColor="#B42332"
              />
            </View>
            <Text style={styles.modalTitle}>Keluar dari akun?</Text>
            <Text style={styles.modalDescription}>
              Kamu akan keluar dari SIPRAK dan kembali ke halaman masuk.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={keluarAkun}
              style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
            >
              <Text style={styles.confirmButtonText}>Keluar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLogoutModalVisible(false)}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: SymbolName;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && styles.lastInfoRow]}>
      <View style={styles.infoIconBox}>
        <SymbolView name={icon} size={20} tintColor="#173F7A" />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#F4F7FC", flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 36 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { color: "#174A78", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#172B4D", fontSize: 30, fontWeight: "800", marginTop: 5 },
  subtitle: { color: "#52627B", fontSize: 14, marginTop: 4 },
  headerIcon: { alignItems: "center", backgroundColor: "#E8EFFB", borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  hero: { backgroundColor: "#173F7A", borderRadius: 24, marginTop: 24, overflow: "hidden", padding: 22 },
  heroTopRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  avatar: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "rgba(255,255,255,0.55)", borderRadius: 38, borderWidth: 3, height: 76, justifyContent: "center", width: 76 },
  avatarText: { color: "#173F7A", fontSize: 25, fontWeight: "800" },
  activeBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 20, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 8 },
  activeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  name: { color: "#FFFFFF", fontSize: 23, fontWeight: "800", marginTop: 18 },
  rolePill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 18, flexDirection: "row", gap: 7, marginTop: 10, paddingHorizontal: 12, paddingVertical: 7 },
  roleText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  heroHint: { color: "#D8E5F8", fontSize: 13, lineHeight: 19, marginTop: 12 },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 26 },
  sectionTitle: { color: "#172B4D", fontSize: 18, fontWeight: "800" },
  sectionCaption: { color: "#71819A", fontSize: 12, marginTop: 4 },
  infoCard: { backgroundColor: "#FFFFFF", borderColor: "#DCE5F1", borderRadius: 20, borderWidth: 1, paddingHorizontal: 16 },
  infoRow: { alignItems: "center", borderBottomColor: "#EDF1F6", borderBottomWidth: 1, flexDirection: "row", gap: 13, minHeight: 74, paddingVertical: 11 },
  lastInfoRow: { borderBottomWidth: 0 },
  infoIconBox: { alignItems: "center", backgroundColor: "#EAF0FB", borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  infoCopy: { flex: 1 },
  infoLabel: { color: "#71819A", fontSize: 12, fontWeight: "600" },
  infoValue: { color: "#172B4D", fontSize: 15, fontWeight: "700", marginTop: 4 },
  aboutCard: { alignItems: "center", backgroundColor: "#EAF0FB", borderRadius: 18, flexDirection: "row", gap: 13, marginTop: 18, padding: 16 },
  aboutIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  aboutCopy: { flex: 1 },
  aboutTitle: { color: "#173F7A", fontSize: 14, fontWeight: "800" },
  aboutText: { color: "#52627B", fontSize: 12, lineHeight: 18, marginTop: 4 },
  logoutButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#F0D6DA", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 12, marginTop: 22, minHeight: 76, paddingHorizontal: 15 },
  logoutIconBox: { alignItems: "center", backgroundColor: "#FDECEF", borderRadius: 13, height: 44, justifyContent: "center", width: 44 },
  logoutCopy: { flex: 1 },
  logoutTitle: { color: "#B42332", fontSize: 15, fontWeight: "800" },
  logoutSubtitle: { color: "#71819A", fontSize: 12, marginTop: 4 },
  pressed: { opacity: 0.82 },
  modalOverlay: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(23,43,77,0.58)" },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 26, maxWidth: 440, padding: 24, width: "100%" },
  modalIcon: { alignItems: "center", backgroundColor: "#FDECEF", borderRadius: 17, height: 60, justifyContent: "center", width: 60 },
  modalTitle: { color: "#172B4D", fontSize: 23, fontWeight: "800", marginTop: 20 },
  modalDescription: { color: "#52627B", fontSize: 15, lineHeight: 23, marginTop: 10 },
  confirmButton: { alignItems: "center", backgroundColor: "#B42332", borderRadius: 14, justifyContent: "center", marginTop: 24, minHeight: 54 },
  confirmButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cancelButton: { alignItems: "center", backgroundColor: "#EAF0FB", borderRadius: 14, justifyContent: "center", marginTop: 11, minHeight: 54 },
  cancelButtonText: { color: "#173F7A", fontSize: 16, fontWeight: "800" },
});
