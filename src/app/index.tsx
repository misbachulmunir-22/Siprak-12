import { useSiprak } from "@/context/SiprakContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function pesanError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (
    error instanceof Error &&
    error.message.startsWith("NIM sudah terdaftar")
  ) {
    return error.message;
  }

  switch (code) {
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Silakan masuk.";
    case "auth/invalid-email":
      return "Format email belum benar.";
    case "auth/weak-password":
      return "Kata sandi terlalu lemah. Gunakan minimal 8 karakter.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau kata sandi tidak sesuai.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
    case "auth/network-request-failed":
      return "Koneksi bermasalah. Periksa internet lalu coba lagi.";
    case "firestore/permission-denied":
      return "Akses profil ditolak. Periksa aturan Firestore.";
    default:
      return "Terjadi kesalahan. Periksa koneksi lalu coba lagi.";
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    authReady,
    authProfileError,
    currentUser,
    registerAccount,
    signInAccount,
    logout,
  } = useSiprak();

  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit =
    mode === "daftar"
      ? Boolean(
          nama.trim() &&
            nim.trim() &&
            emailValid &&
            password.length >= 8 &&
            !isSubmitting,
        )
      : !isSubmitting;

  useEffect(() => {
    if (authReady && currentUser) {
      router.replace(
        currentUser.peran === "asisten" ? "/asisten" : "/praktikan",
      );
    }
  }, [authReady, currentUser, router]);

  function gantiMode(modeBaru: "masuk" | "daftar") {
    setMode(modeBaru);
    setErrorMessage("");
  }

  async function kirimForm() {
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Isi email dan kata sandi terlebih dahulu.");
      return;
    }

    if (mode === "daftar") {
      if (!nama.trim() || !nim.trim()) {
        setErrorMessage("Isi nama dan NIM terlebih dahulu.");
        return;
      }

      if (password.length < 8) {
        setErrorMessage("Kata sandi harus memiliki minimal 8 karakter.");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (mode === "daftar") {
        await registerAccount({
          nama,
          nim,
          email,
          password,
        });
      } else {
        await signInAccount(email, password);
      }
    } catch (error) {
      setErrorMessage(pesanError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!authReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <Text style={styles.brand}>SIPRAK</Text>
          <Text style={styles.loadingText}>Memeriksa sesi akun...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === "masuk" ? (
            <View style={styles.brandSection}>
              <Text style={styles.brand}>SIPRAK</Text>
              <View style={styles.eyebrowPill}>
                <Text style={styles.eyebrowText}>PRAKTIKUM LEBIH TERATUR</Text>
              </View>
              <Text style={styles.title}>Selamat datang kembali.</Text>
              <Text style={styles.subtitle}>
                Masuk untuk mengelola praktikum dan presensi dalam satu tempat.
              </Text>
            </View>
          ) : (
            <View style={styles.registerHeader}>
              <View style={styles.registerTitleRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Kembali ke halaman masuk"
                  disabled={isSubmitting}
                  hitSlop={8}
                  onPress={() => {
                    setPasswordVisible(false);
                    gantiMode("masuk");
                  }}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>‹</Text>
                </Pressable>
                <Text style={styles.registerTitle}>Daftar praktikan</Text>
              </View>
              <Text style={styles.registerSubtitle}>
                Lengkapi data untuk mengikuti praktikum.
              </Text>
            </View>
          )}

          {authProfileError ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{authProfileError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={logout}
                style={styles.warningButton}
              >
                <Text style={styles.warningButtonText}>
                  Keluar dan coba lagi
                </Text>
              </Pressable>
            </View>
          ) : null}

          {mode === "daftar" ? (
            <>
              <Text style={styles.label}>Nama lengkap</Text>
              <TextInput
                value={nama}
                onChangeText={setNama}
                placeholder="Contoh: Alya Putri"
                placeholderTextColor="#52627B"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
                style={styles.input}
              />

              <Text style={styles.label}>NIM</Text>
              <TextInput
                value={nim}
                onChangeText={setNim}
                placeholder="Masukkan NIM"
                placeholderTextColor="#52627B"
                keyboardType="number-pad"
                autoCapitalize="none"
                editable={!isSubmitting}
                style={styles.input}
              />

            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setErrorMessage("");
            }}
            placeholder="nama@kampus.ac.id"
            placeholderTextColor="#52627B"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            editable={!isSubmitting}
            returnKeyType="next"
            style={[
              styles.input,
              mode === "daftar" && email.length > 0 && !emailValid
                ? styles.inputInvalid
                : null,
            ]}
          />
          {mode === "daftar" && email.length > 0 && !emailValid ? (
            <Text accessibilityLiveRegion="polite" style={styles.inlineError}>
              Masukkan alamat email yang valid.
            </Text>
          ) : null}

          <Text style={styles.label}>Kata sandi</Text>
          <View style={styles.passwordField}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={
                mode === "daftar" ? "Minimal 8 karakter" : "Masukkan kata sandi"
              }
              placeholderTextColor="#52627B"
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              textContentType={mode === "daftar" ? "newPassword" : "password"}
              editable={!isSubmitting}
              returnKeyType="go"
              onSubmitEditing={() => void kirimForm()}
              style={styles.passwordInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              accessibilityState={{ selected: passwordVisible }}
              disabled={isSubmitting}
              hitSlop={8}
              onPress={() => setPasswordVisible((visible) => !visible)}
              style={styles.passwordToggle}
            >
              <View style={styles.eyeIcon}>
                <View style={styles.eyePupil} />
              </View>
            </Pressable>
          </View>
          {mode === "daftar" ? (
            <Text style={styles.passwordHint}>Gunakan minimal 8 karakter.</Text>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void kirimForm()}
            style={({ pressed }) => [
              styles.primaryButton,
              !canSubmit && styles.primaryButtonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                !canSubmit && styles.primaryButtonTextDisabled,
              ]}
            >
              {isSubmitting ? "Memproses..." : mode === "masuk" ? "Masuk" : "Daftar akun"}
            </Text>
          </Pressable>

          <View style={styles.switchRow}>
            {mode === "masuk" ? (
              <>
                <Text style={styles.switchText}>Belum punya akun praktikan?</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => {
                    setPasswordVisible(false);
                    gantiMode("daftar");
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.switchLink}>Daftar akun</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Masuk ke akun yang sudah ada"
                disabled={isSubmitting}
                onPress={() => {
                  setPasswordVisible(false);
                  gantiMode("masuk");
                }}
                hitSlop={8}
              >
                <Text>
                  <Text style={styles.switchText}>Sudah punya akun? </Text>
                  <Text style={styles.switchLinkInline}>Masuk</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#F4F7FC" },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 34,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  loading: { alignItems: "flex-start", flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  loadingText: { color: "#52627B", fontSize: 14, marginTop: 16 },
  brandSection: { marginBottom: 34 },
  registerHeader: { marginBottom: 28 },
  registerTitleRow: { alignItems: "center", flexDirection: "row", marginLeft: -8 },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  backButtonText: { color: "#173F7A", fontSize: 36, lineHeight: 40, marginTop: -4 },
  registerTitle: { color: "#172B4D", fontSize: 24, fontWeight: "700", marginTop: 4 },
  registerSubtitle: { color: "#52627B", fontSize: 16, lineHeight: 23, marginTop: 18 },
  brand: { color: "#173F7A", fontSize: 34, fontWeight: "800", letterSpacing: -0.8 },
  eyebrowPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E9EFFA",
    borderRadius: 8,
    marginTop: 24,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  eyebrowText: { color: "#173F7A", fontSize: 13, fontWeight: "700" },
  title: { color: "#172B4D", fontSize: 30, fontWeight: "800", lineHeight: 38, marginTop: 32 },
  subtitle: { color: "#52627B", fontSize: 16, lineHeight: 23, marginTop: 12 },
  label: { color: "#173F7A", fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 22 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderRadius: 12,
    borderWidth: 1,
    color: "#172B4D",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputInvalid: { borderColor: "#B42332", borderWidth: 2 },
  inlineError: { color: "#B42332", fontSize: 13, lineHeight: 18, marginTop: 6 },
  passwordField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D8E1EE",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 52,
  },
  passwordInput: { color: "#172B4D", flex: 1, fontSize: 16, minHeight: 50, paddingHorizontal: 14, paddingVertical: 10 },
  passwordToggle: { alignItems: "center", height: 48, justifyContent: "center", marginRight: 6, width: 48 },
  eyeIcon: { alignItems: "center", borderColor: "#52627B", borderRadius: 12, borderWidth: 2, height: 16, justifyContent: "center", width: 23 },
  eyePupil: { backgroundColor: "#52627B", borderRadius: 4, height: 7, width: 7 },
  passwordHint: { color: "#52627B", fontSize: 13, lineHeight: 19, marginTop: 8 },
  infoBox: { backgroundColor: "#E9EFFA", borderRadius: 12, marginTop: 16, padding: 14 },
  infoTitle: { color: "#173F7A", fontSize: 13, fontWeight: "700" },
  infoText: { color: "#52627B", fontSize: 13, lineHeight: 19, marginTop: 5 },
  errorBox: { backgroundColor: "#FCEBEC", borderRadius: 12, marginTop: 16, padding: 12 },
  errorText: { color: "#B42332", fontSize: 14, lineHeight: 20 },
  warningBox: { backgroundColor: "#FFF3E2", borderRadius: 12, marginBottom: 12, padding: 13 },
  warningText: { color: "#8A4B08", fontSize: 14, lineHeight: 20 },
  warningButton: { alignSelf: "flex-start", marginTop: 8, minHeight: 44, justifyContent: "center", paddingRight: 8 },
  warningButtonText: { color: "#173F7A", fontSize: 14, fontWeight: "700" },
  primaryButton: { alignItems: "center", backgroundColor: "#173F7A", borderRadius: 12, justifyContent: "center", marginTop: 38, minHeight: 52 },
  primaryButtonDisabled: { backgroundColor: "#E1E8F2" },
  buttonPressed: { opacity: 0.78 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  primaryButtonTextDisabled: { color: "#52627B" },
  switchRow: { alignItems: "center", flexDirection: "column", gap: 8, justifyContent: "center", marginTop: 28 },
  switchText: { color: "#52627B", fontSize: 15, textAlign: "center" },
  switchLink: { color: "#173F7A", fontSize: 16, fontWeight: "700", minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, textAlign: "center" },
  switchLinkInline: { color: "#173F7A", fontSize: 15, fontWeight: "700" },
});
