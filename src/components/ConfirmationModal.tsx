import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  busy = false,
  error = "",
}: ConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup konfirmasi"
          disabled={busy}
          style={styles.scrim}
          onPress={onCancel}
        />
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <SymbolView
              name={{ android: "delete", ios: "trash", web: "delete" }}
              size={30}
              tintColor="#B42332"
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onConfirm}
            style={[styles.confirmButton, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancel}
            style={[styles.cancelButton, busy && styles.disabled]}
          >
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(23, 43, 77, 0.58)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    maxWidth: 520,
    padding: 24,
    width: "100%",
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#FDECEF",
    borderRadius: 18,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  title: {
    color: "#172B4D",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 22,
  },
  message: {
    color: "#52627B",
    fontSize: 17,
    lineHeight: 25,
    marginTop: 12,
  },
  error: {
    color: "#B42332",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: "#B42332",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 28,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  confirmText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#EAF0FB",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 58,
    paddingHorizontal: 18,
  },
  cancelText: { color: "#173F7A", fontSize: 17, fontWeight: "800" },
  disabled: { opacity: 0.62 },
});
