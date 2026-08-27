import { useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Ensure browser session is completed
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      setLoading(true);
      // Giả lập flow SSO bằng WebBrowser
      const HRM_URL = process.env.EXPO_PUBLIC_HRM_ROOT_URL || 'https://hrm.example.com';
      const returnUrl = Linking.createURL('login-callback');
      
      // Mở trình duyệt giả lập login
      const result = await WebBrowser.openAuthSessionAsync(
        `${HRM_URL}/sso/login?redirect_uri=${encodeURIComponent(returnUrl)}`,
        returnUrl
      );

      if (result.type === 'success' && result.url) {
        // Lấy token từ url (ví dụ: myapp://login-callback?token=123)
        const parsedUrl = Linking.parse(result.url);
        const token = parsedUrl.queryParams?.token;

        if (token) {
          await SecureStore.setItemAsync('userToken', token as string);
          router.replace('/(tabs)/home');
        } else {
          Alert.alert('Lỗi', 'Không lấy được token xác thực.');
        }
      } else {
        // Fallback for development since we don't have real HRM SSO yet
        await fallbackDevLogin();
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const fallbackDevLogin = async () => {
    // Lưu token giả để vào app
    await SecureStore.setItemAsync('userToken', 'tech-demo-token');
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CMMS Mobile</Text>
      <Text style={styles.subtitle}>Dành cho Kỹ thuật viên</Text>
      
      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" />
        ) : (
          <Button title="Đăng nhập qua HRM (SSO)" onPress={handleLogin} color="#2563eb" />
        )}
      </View>
      <Text style={styles.hint}>Nhấn đăng nhập sẽ chuyển hướng sang hệ thống nhân sự.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  }
});
