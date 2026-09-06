import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun, Loader2, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { login, requestPasswordReset, resetPassword, getErrorMessage } from '../lib/api';
import Swal from 'sweetalert2';
import { sendOTPEmail } from '../lib/email';

type Step = 'login' | 'forgot-request' | 'forgot-reset';

export default function Login() {
  const [step, setStep] = useState<Step>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // forgot password
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpToken, setFpToken] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Enter both username and password.', confirmButtonColor: '#78001d' });
      return;
    }
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Login Failed', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!fpIdentifier.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Enter your username or email.', confirmButtonColor: '#78001d' });
      return;
    }
    setLoading(true);
    try {
      const token = await requestPasswordReset(fpIdentifier.trim());
      setPendingToken(token);
      // Attempt to send via SMTP if an email address was provided
      if (fpIdentifier.includes('@')) {
        try {
          await sendOTPEmail(fpIdentifier, fpIdentifier, token, 30);
          Swal.fire({ icon: 'success', title: 'Code Sent', text: `A reset code has been sent to ${fpIdentifier}. It expires in 30 minutes.`, confirmButtonColor: '#78001d' });
        } catch {
          // SMTP not configured — show code in dialog
          Swal.fire({
            icon: 'info',
            title: 'Reset Code',
            html: `Your reset code:<br/><strong style="font-size:28px;letter-spacing:6px;color:#78001d">${token}</strong><br/><small style="color:#584141">Share this with the user.</small>`,
            confirmButtonColor: '#78001d',
          });
        }
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Reset Code Generated',
          html: `Your reset code:<br/><strong style="font-size:28px;letter-spacing:6px;color:#78001d">${token}</strong><br/><small style="color:#584141">Share this with the user or configure SMTP in Settings.</small>`,
          confirmButtonColor: '#78001d',
        });
      }
      setStep('forgot-reset');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const code = fpToken.trim() || pendingToken;
    if (!code) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Enter the reset code.', confirmButtonColor: '#78001d' }); return; }
    if (!fpNewPw || fpNewPw !== fpConfirmPw) { Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'Passwords do not match.', confirmButtonColor: '#78001d' }); return; }
    if (fpNewPw.length < 6) { Swal.fire({ icon: 'warning', title: 'Too Short', text: 'Password must be at least 6 characters.', confirmButtonColor: '#78001d' }); return; }
    setLoading(true);
    try {
      await resetPassword(code, fpNewPw);
      Swal.fire({ icon: 'success', title: 'Password Reset', text: 'Your password has been reset.', confirmButtonColor: '#78001d' });
      setStep('login');
      setFpIdentifier(''); setFpToken(''); setFpNewPw(''); setFpConfirmPw(''); setPendingToken('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(err), confirmButtonColor: '#78001d' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Theme toggle */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img
            src="/ndl.png"
            alt="Noble Diagnostic Laboratory"
            style={{
              height: 80,
              maxWidth: 240,
              objectFit: 'contain',
              marginBottom: 12,
            }}
            onError={e => {
              // Fallback to icon if image fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1>Noble Diagnostic Laboratory</h1>
          <p>Professionalism Is Part Of Us</p>
        </div>

        {/* Login form */}
        {step === 'login' && (
          <>
            <h2>Secure Sign In</h2>
            <p className="login-subtitle">Authorized Personnel Only</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username <span className="required">*</span></label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Password <span className="required">*</span></label>
                  <button type="button" onClick={() => setStep('forgot-request')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--on-surface-variant)', padding: 4, display: 'flex', cursor: 'pointer' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, height: 40, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                disabled={loading}
              >
                {loading
                  ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Signing in…</>
                  : <><Shield size={14} /> Secure Sign In</>}
              </button>
            </form>

            {import.meta.env.DEV && (
              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                Default: <strong>admin</strong> / <strong>Admin@123</strong>
              </p>
            )}

            {/* Security footer */}
            <div className="login-security-footer">
              <div className="login-security-item">
                <Shield size={12} />
                <span>256-bit Encryption</span>
              </div>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--outline-variant)' }} />
              <div className="login-security-item">
                <CheckCircle size={12} />
                <span>Compliance Verified</span>
              </div>
            </div>
          </>
        )}

        {/* Forgot password — request step */}
        {step === 'forgot-request' && (
          <>
            <h2>Reset Password</h2>
            <p className="login-subtitle">Enter username or email</p>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 16 }}>
              Enter your username or registered email to receive a reset code.
            </p>
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input className="form-control" type="text" placeholder="e.g. admin or user@email.com"
                value={fpIdentifier} onChange={e => setFpIdentifier(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('login')}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleRequestReset} disabled={loading}>
                {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Sending…</> : 'Send Code'}
              </button>
            </div>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--on-surface-variant)' }}>
              Already have a code?{' '}
              <button type="button" onClick={() => setStep('forgot-reset')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                Enter code
              </button>
            </p>
          </>
        )}

        {/* Forgot password — reset step */}
        {step === 'forgot-reset' && (
          <>
            <h2>New Password</h2>
            <p className="login-subtitle">Enter reset code &amp; new password</p>
            <div className="form-group">
              <label className="form-label">Reset Code</label>
              <input className="form-control" type="text" placeholder="6-digit code"
                value={fpToken} onChange={e => setFpToken(e.target.value)}
                maxLength={6} style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18, height: 44 }} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={fpNewPw} onChange={e => setFpNewPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-control" type="password" value={fpConfirmPw} onChange={e => setFpConfirmPw(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('forgot-request')}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleResetPassword} disabled={loading}>
                {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Resetting…</> : 'Reset Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
