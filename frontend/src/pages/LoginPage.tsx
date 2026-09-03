import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '../components/common/Toast';

const HRM_API_URL = import.meta.env.VITE_HRM_ROOT_URL || 'https://hrmserver.dkpharma.io.vn';

export function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already logged in, redirect to home
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập đầy đủ Username và Password.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`${HRM_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Sai tên đăng nhập hoặc mật khẩu.');
      }

      const data = await response.json();
      const accessToken = data.accessToken || data.access_token || data.token;
      const refreshToken = data.refreshToken || data.refresh_token;

      if (!accessToken) {
        throw new Error('Không nhận được mã xác thực từ máy chủ.');
      }

      // Save tokens
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      toast.success('Thành công', 'Đăng nhập thành công!');

      // Redirect to intended destination or home
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/';
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      const msg = error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setErrorMessage(msg);
      toast.error('Đăng nhập thất bại', msg);
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo & Header */}
        <div className="login-logo-container">
          <img
            src="/dkpharmalogo.png"
            alt="DKPharma Logo"
            className="login-logo"
          />
        </div>

        <h2 className="login-title">ĐĂNG NHẬP HỆ THỐNG</h2>
        <p className="login-subtitle">Hệ thống Quản lý Thiết bị & Bảo trì CMMS</p>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-alert-error">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form FormField structure matching other internal apps */}
        <form onSubmit={onSubmit} className="login-form">
          {/* Username Field */}
          <div className="form-item">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={isLoading}
              required
            />
          </div>

          {/* Password Field */}
          <div className="form-item">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div className="relative-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading || !username || !password}
          >
            {isLoading && <Loader2 size={18} className="animate-spin mr-2" />}
            Đăng Nhập
          </button>
        </form>

        {/* Links */}
        <div className="login-footer-links">
          <p className="login-footer-text">
            Bạn chưa có tài khoản?{' '}
            <a
              href={`${HRM_API_URL}/register`}
              target="_blank"
              rel="noopener noreferrer"
              className="login-link"
            >
              Đăng ký
            </a>
          </p>
          <a
            href={`${HRM_API_URL}/forgot-password`}
            target="_blank"
            rel="noopener noreferrer"
            className="login-link"
          >
            Lấy lại mật khẩu...
          </a>
        </div>

        <p className="login-policy">
          Đăng nhập đồng nghĩa với đã đồng ý điều khoản và chính sách của chúng tôi.
        </p>
      </div>

      <style>{`
        .login-wrapper {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 9999;
          padding: 16px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 36px 32px 28px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          animation: loginFadeIn 0.3s ease-out;
        }

        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .login-logo {
          height: 48px;
          width: auto;
          object-fit: contain;
        }

        .login-title {
          text-align: center;
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.3px;
          margin: 0 0 4px 0;
        }

        .login-subtitle {
          text-align: center;
          font-size: 12.5px;
          color: #64748b;
          margin: 0 0 22px 0;
        }

        .login-alert-error {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          margin-bottom: 16px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 13px;
          line-height: 1.4;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .form-control {
          width: 100%;
          padding: 9px 12px;
          font-size: 13.5px;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .form-control:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .form-control:disabled {
          background-color: #f8fafc;
          opacity: 0.7;
          cursor: not-allowed;
        }

        .relative-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .relative-input-wrap .form-control {
          padding-right: 40px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s ease;
        }

        .password-toggle-btn:hover {
          color: #475569;
        }

        .login-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px 16px;
          margin-top: 6px;
          background-color: #0f172a;
          border: 1px solid #0f172a;
          border-radius: 6px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, opacity 0.15s ease;
        }

        .login-submit-btn:hover:not(:disabled) {
          background-color: #1e293b;
        }

        .login-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-footer-links {
          text-align: center;
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .login-footer-text {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }

        .login-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }

        .login-link:hover {
          text-decoration: underline;
        }

        .login-policy {
          text-align: center;
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 16px;
          line-height: 1.4;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 28px 20px 20px;
          }
        }
      `}</style>
    </div>
  );
}
