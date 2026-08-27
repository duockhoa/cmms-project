import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';

export default function EquipmentScreen() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await api.getEquipmentList({ search });
      setEquipment(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [search]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/equipment/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.code}>{item.code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'OPERATIONAL' ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[styles.statusText, { color: item.status === 'OPERATIONAL' ? '#16a34a' : '#ef4444' }]}>
            {item.status === 'OPERATIONAL' ? 'Hoạt động' : 'Bảo trì'}
          </Text>
        </View>
      </View>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.details}>{item.location} • {item.category}</Text>
      {item.accountingCode && (
        <Text style={styles.accountingCode}>Mã KT: {item.accountingCode}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã thiết bị..."
          value={search}
          onChangeText={setSearch}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#2563eb" />
      ) : (
        <FlatList 
          data={equipment}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy thiết bị nào.</Text>}
          refreshing={loading}
          onRefresh={fetchEquipment}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  code: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  details: {
    color: '#64748b',
    fontSize: 13,
  },
  accountingCode: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
  }
});
