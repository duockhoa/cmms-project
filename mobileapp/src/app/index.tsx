import { useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { api } from '../services/api';

export default function Index() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getEquipmentList();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CMMS Mobile App</Text>
      <Text style={styles.subtitle}>Test Kết Nối Backend</Text>

      <Button title="Gọi API Lấy Thiết Bị" onPress={testConnection} />

      {loading && <ActivityIndicator style={{ marginTop: 20 }} size="large" />}

      {error && <Text style={styles.error}>Lỗi: {error}</Text>}

      {data && (
        <View style={styles.resultContainer}>
          <Text style={styles.success}>Kết nối thành công!</Text>
          <Text>Số lượng thiết bị tải về: {data.data?.length || 0}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  error: {
    color: 'red',
    marginTop: 20,
  },
  success: {
    color: 'green',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
});
