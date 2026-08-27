import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để tự động đính kèm token
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Authentication (nếu cần login bằng mật khẩu thay vì SSO)
  loginWithPassword: async (credentials: any) => {
    const res = await apiClient.post('/api/v1/auth/login', credentials);
    return res.data;
  },
  
  // Equipment
  getEquipmentList: async (params?: any) => {
    const res = await apiClient.get('/api/v1/equipment', { params });
    return res.data;
  },
  getEquipmentDetails: async (id: string) => {
    const res = await apiClient.get(`/api/v1/equipment/${id}`);
    return res.data;
  },

  // Work Orders
  getWorkOrders: async (params?: any) => {
    const res = await apiClient.get('/api/v1/work-orders', { params });
    return res.data;
  },
  getWorkOrderDetails: async (id: string) => {
    const res = await apiClient.get(`/api/v1/work-orders/${id}`);
    return res.data;
  },
  updateWorkOrderStatus: async (id: string, action: string, data?: any) => {
    // action có thể là START, COMPLETE
    const res = await apiClient.post(`/api/v1/work-orders/${id}/status`, { action, ...data });
    return res.data;
  },
};
