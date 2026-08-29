import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const HRM_API_URL = import.meta.env.VITE_HRM_ROOT_URL || 'http://localhost:3000';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${HRM_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Sai tên đăng nhập hoặc mật khẩu');
      }

      const data = await res.json();
      const token = data.accessToken || data.access_token || data.token;

      if (!token) {
        throw new Error('Không nhận được token từ server');
      }

      // Store tokens
      localStorage.setItem('accessToken', token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Redirect to intended destination or home
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect') || '/';
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-page">
      <div className="lp-card">
        {/* Logo */}
        <div className="lp-logo-wrap">
          <img src="/dkpharmalogo.png" alt="DKPharma" className="lp-logo-img" />
        </div>

        <h1 className="lp-title">Đăng Nhập Vào DKPharma</h1>

        {/* Error */}
        {error && (
          <div className="lp-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="lp-form">
          <div className="lp-field">
            <label htmlFor="lp-username" className="lp-label">Username</label>
            <input
              id="lp-username"
              type="text"
              className="lp-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          <div className="lp-field">
            <label htmlFor="lp-password" className="lp-label">Password</label>
            <div className="lp-input-wrap">
              <input
                id="lp-password"
                type={showPassword ? 'text' : 'password'}
                className="lp-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="lp-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="lp-submit"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="lp-spinner" />
                Đang nhập...
              </>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="lp-links">
          <p className="lp-link-row">
            Bạn chưa có tài khoản? <a href={`${HRM_API_URL}/register`} className="lp-link">Đăng ký</a>
          </p>
          <a href={`${HRM_API_URL}/forgot-password`} className="lp-link">Lấy lại mật khẩu...</a>
        </div>

        <p className="lp-policy">
          Đăng nhập đồng nghĩa với đã đồng ý điều khoản và chính sách của chúng tôi.
        </p>
      </div>

      <style>{`
        .lp-page {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef1f5;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 9999;
        }

        .lp-card {
          width: 100%;
          max-width: 430px;
          margin: 0 16px;
          padding: 40px 40px 32px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.07);
          animation: lpFadeIn 0.35s ease both;
        }

        @keyframes lpFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Logo */
        .lp-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .lp-logo-img {
          height: 56px;
          width: auto;
          object-fit: contain;
        }

        /* Title */
        .lp-title {
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          color: #1a2a3a;
          margin-bottom: 28px;
        }

        /* Error */
        .lp-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          margin-bottom: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 13px;
        }

        /* Form */
        .lp-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .lp-label {
          font-size: 13px;
          font-weight: 600;
          color: #1a2a3a;
        }

        .lp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .lp-input {
          width: 100%;
          padding: 10px 0;
          background: transparent;
          border: none;
          border-bottom: 1.5px solid #d1d5db;
          color: #1a2a3a;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .lp-input::placeholder {
          color: #9ca3af;
        }

        .lp-input:focus {
          border-bottom-color: #1a3c6e;
        }

        .lp-input:disabled {
          opacity: 0.5;
        }

        .lp-input-wrap .lp-input {
          padding-right: 36px;
        }

        .lp-eye {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 4px;
        }

        .lp-eye:hover {
          color: #374151;
        }

        /* Submit */
        .lp-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 20px;
          margin-top: 4px;
          background: #1a3c6e;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
        }

        .lp-submit:hover:not(:disabled) {
          background: #15325c;
        }

        .lp-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .lp-spinner {
          animation: lpSpin 1s linear infinite;
        }

        @keyframes lpSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Links */
        .lp-links {
          text-align: center;
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .lp-link-row {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .lp-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }

        .lp-link:hover {
          text-decoration: underline;
        }

        /* Policy */
        .lp-policy {
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          margin-top: 16px;
          line-height: 1.5;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .lp-card {
            padding: 32px 24px 24px;
          }
        }
      `}</style>
    </div>
  );
}
