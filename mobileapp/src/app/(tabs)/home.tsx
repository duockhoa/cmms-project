import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Xin chào, Kỹ thuật viên!</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Công việc hôm nay</Text>
        <Text style={styles.cardNumber}>3</Text>
        <Text style={styles.cardSubtitle}>phiếu bảo trì cần xử lý</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(tabs)/tasks')}
        >
          <Text style={styles.buttonText}>Xem danh sách</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thiết bị</Text>
        <Text style={styles.cardSubtitle}>Tra cứu thông tin thiết bị hoặc quét mã QR</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.button, styles.outlineButton, { flex: 1, marginRight: 8 }]}
            onPress={() => router.push('/(tabs)/equipment')}
          >
            <Text style={styles.outlineButtonText}>Danh sách</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { flex: 1 }]}
            onPress={() => router.push('/(tabs)/scanner')}
          >
            <Text style={styles.buttonText}>Quét mã QR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f1f5f9',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  outlineButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});
