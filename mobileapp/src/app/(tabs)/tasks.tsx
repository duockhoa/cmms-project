import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.getWorkOrders();
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { bg: '#fef9c3', text: '#ca8a04' }; // yellow
      case 'IN_PROGRESS': return { bg: '#dbeafe', text: '#2563eb' }; // blue
      case 'COMPLETED': return { bg: '#dcfce7', text: '#16a34a' }; // green
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const colors = getStatusColor(item.status);
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/work-order/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.details}>Thiết bị: {item.equipment?.name || '---'}</Text>
        <Text style={styles.details}>Mức độ: {item.priority}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#2563eb" />
      ) : (
        <FlatList 
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có phiếu bảo trì nào được giao.</Text>}
          refreshing={loading}
          onRefresh={fetchTasks}
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  details: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 4,
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
