const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3001';

export const api = {
  getEquipmentList: async () => {
    try {
      // Giả lập lấy token từ AsyncStorage
      const response = await fetch(`${API_BASE}/api/v1/equipment`, {
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': 'tech-demo-id', // Bỏ qua auth tạm thời để test
        },
      });
      if (!response.ok) throw new Error('Network error');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
};
