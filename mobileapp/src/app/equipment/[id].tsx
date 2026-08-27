import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';

export default function EquipmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.getEquipmentDetails(id as string);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Không tải được thông tin thiết bị.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{data.name}</Text>
        <Text style={styles.subtitle}>Mã: {data.code}</Text>
        {data.accountingCode && (
          <Text style={styles.subtitle}>Mã Phụ (KT): {data.accountingCode}</Text>
        )}
        <View style={{ marginTop: 8, flexDirection: 'row' }}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{data.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin chung</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Loại thiết bị:</Text>
          <Text style={styles.value}>{data.category}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Vị trí:</Text>
          <Text style={styles.value}>{data.location}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Số Serial:</Text>
          <Text style={styles.value}>{data.serialNumber || '---'}</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => alert('Chức năng tạo báo cáo sự cố đang phát triển')}
      >
        <Text style={styles.actionButtonText}>Báo cáo sự cố thiết bị này</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  badge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    color: '#64748b',
  },
  value: {
    fontWeight: '500',
    color: '#334155',
  },
  actionButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
