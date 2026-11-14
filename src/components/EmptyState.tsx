import { StyleSheet, Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  description: string;
};

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.icon} accessibilityElementsHidden>
        <Text style={styles.iconText}>i</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderColor: '#E3E9F2',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: '#E8EEFA',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginBottom: 12,
    width: 44,
  },
  iconText: { color: '#315CCB', fontSize: 22, fontWeight: '700' },
  title: { color: '#17243B', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  description: { color: '#65738A', fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
});
