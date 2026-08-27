import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.getWorkOrderDetails(id as string);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAction = async (actionStr: string, confirmMessage: string) => {
    Alert.alert('Xác nhận', confirmMessage, [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Đồng ý', 
        onPress: async () => {
          try {
            setActionLoading(true);
            await api.updateWorkOrderStatus(id as string, actionStr);
            // Sau khi action thành công, tải lại data (trạng thái sẽ tự động đổi từ BE)
            await fetchDetail();
            Alert.alert('Thành công', 'Đã cập nhật tiến độ công việc.');
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể thực hiện thao tác.');
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

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
        <Text>Không tải được thông tin phiếu bảo trì.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>Thiết bị: {data.equipment?.name}</Text>
        <Text style={styles.subtitle}>Trạng thái hiện tại: {data.status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mô tả công việc</Text>
        <Text style={styles.description}>{data.description || 'Không có mô tả chi tiết.'}</Text>
      </View>

      <View style={styles.actionsContainer}>
        {data.status === 'PENDING' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#2563eb' }]}
            onPress={() => handleAction('START', 'Bạn đã đến hiện trường và bắt đầu xử lý?')}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Bắt đầu công việc</Text>
          </TouchableOpacity>
        )}

        {data.status === 'IN_PROGRESS' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#10b981', marginBottom: 12 }]}
              onPress={() => handleAction('COMPLETE', 'Bạn xác nhận đã hoàn tất công việc này?')}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>Báo cáo Hoàn tất</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#64748b' }]}
              onPress={() => alert('Đang code chức năng nhập log...')}
            >
              <Text style={styles.actionButtonText}>Ghi chú Log quá trình</Text>
            </TouchableOpacity>
          </>
        )}

        {data.status === 'COMPLETED' && (
          <View style={styles.completedBox}>
            <Text style={styles.completedText}>Công việc này đã hoàn thành</Text>
          </View>
        )}
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  description: {
    color: '#475569',
    lineHeight: 22,
  },
  actionsContainer: {
    marginBottom: 40,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  completedBox: {
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completedText: {
    color: '#16a34a',
    fontWeight: 'bold',
  }
});
