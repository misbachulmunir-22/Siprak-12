import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

type DataStateProps = {
  kind: "empty" | "error";
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function DataState({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: DataStateProps) {
  const error = kind === "error";
  const icon = error ? "warning" : "inbox";

  return (
    <View style={[styles.state, compact && styles.stateCompact]}>
      <View style={[styles.iconTile, error && styles.errorIconTile]}>
        <SymbolView
          name={{
            android: icon,
            ios: error ? "exclamationmark.triangle" : "tray",
            web: icon,
          }}
          size={30}
          tintColor={error ? "#B42332" : "#173F7A"}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <View accessibilityLabel="Memuat data" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonShort} />
          <View style={styles.skeletonMedium} />
          <View style={styles.skeletonLong} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE5F1",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  stateCompact: { marginTop: 12, paddingVertical: 22 },
  iconTile: {
    alignItems: "center",
    backgroundColor: "#EAF0FB",
    borderRadius: 20,
    height: 72,
    justifyContent: "center",
    marginBottom: 18,
    width: 72,
  },
  errorIconTile: { backgroundColor: "#FDECEF" },
  title: { color: "#172B4D", fontSize: 18, fontWeight: "800", textAlign: "center" },
  message: { color: "#52627B", fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  action: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#173F7A",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  actionText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.86 },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 16,
    padding: 20,
  },
  skeletonShort: { backgroundColor: "#E1E8F2", borderRadius: 7, height: 16, width: "38%" },
  skeletonMedium: { backgroundColor: "#E1E8F2", borderRadius: 7, height: 20, marginTop: 16, width: "72%" },
  skeletonLong: { backgroundColor: "#EDF1F6", borderRadius: 7, height: 16, marginTop: 14, width: "90%" },
});
