import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { login, requestPasswordReset, resetPassword } from '../lib/api';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';

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
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Enter both username and password.', confirmButtonColor: '#f54927' });
      return;
    }
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      setUser(user);
      navigate('/dashboard');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Login Failed', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!fpIdentifier.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Enter your username or email.', confirmButtonColor: '#f54927' });
      return;
    }
    setLoading(true);
    try {
      const token = await requestPasswordReset(fpIdentifier.trim());
      setPendingToken(token);

      // Send via EmailJS if configured
      const serviceId = localStorage.getItem('emailjs_service_id');
      const templateId = localStorage.getItem('emailjs_template_id');
      const publicKey = localStorage.getItem('emailjs_public_key');
      if (serviceId && templateId && publicKey) {
        await emailjs.send(serviceId, templateId, {
          to_email: fpIdentifier.includes('@') ? fpIdentifier : '',
          identifier: fpIdentifier,
          reset_code: token,
        }, { publicKey });
        Swal.fire({ icon: 'success', title: 'Code Sent', text: 'A reset code has been sent to your email. It expires in 30 minutes.', confirmButtonColor: '#f54927' });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Reset Code Generated',
          html: `EmailJS is not configured. Your reset code is:<br/><strong style="font-size:24px;letter-spacing:4px">${token}</strong><br/><small>Share this with the user or configure EmailJS in Settings.</small>`,
          confirmButtonColor: '#f54927',
        });
      }
      setStep('forgot-reset');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const code = fpToken.trim() || pendingToken;
    if (!code) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Enter the reset code.', confirmButtonColor: '#f54927' }); return;
    }
    if (!fpNewPw || fpNewPw !== fpConfirmPw) {
      Swal.fire({ icon: 'warning', title: 'Password Mismatch', text: 'Passwords do not match.', confirmButtonColor: '#f54927' }); return;
    }
    if (fpNewPw.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Too Short', text: 'Password must be at least 6 characters.', confirmButtonColor: '#f54927' }); return;
    }
    setLoading(true);
    try {
      await resetPassword(code, fpNewPw);
      Swal.fire({ icon: 'success', title: 'Password Reset', text: 'Your password has been reset. You can now sign in.', confirmButtonColor: '#f54927' });
      setStep('login');
      setFpIdentifier(''); setFpToken(''); setFpNewPw(''); setFpConfirmPw(''); setPendingToken('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: String(err), confirmButtonColor: '#f54927' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <div className="login-card">
        <div className="login-logo">
          <img src="/ndl.png" alt="NDL" style={{ height: 56, marginBottom: 8, objectFit: 'contain' }} />
          <h1>Noble Diagnostic Laboratory</h1>
          <p>Professionalism Is Part Of Us</p>
        </div>

        {step === 'login' && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username <span className="required">*</span></label>
              <input className="form-control" type="text" placeholder="Enter your username"
                value={username} onChange={e => setUsername(e.target.value)}
                autoComplete="username" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input className="form-control" type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password" value={password}
                  onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                  style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 4,
                    display: 'flex', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px' }}
              disabled={loading}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12 }}>
              <button type="button" onClick={() => setStep('forgot-request')}
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
                Forgot Password?
              </button>
            </p>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              Default: <strong>admin</strong> / <strong>Admin@123</strong>
            </p>
          </form>
        )}

        {step === 'forgot-request' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter your username or registered email to receive a reset code.
            </p>
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input className="form-control" type="text" placeholder="e.g. admin or user@email.com"
                value={fpIdentifier} onChange={e => setFpIdentifier(e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setStep('login')}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleRequestReset} disabled={loading}>
                {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Sending...</> : 'Send Code'}
              </button>
            </div>
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
              Already have a code?{' '}
              <button type="button" onClick={() => setStep('forgot-reset')}
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: 11 }}>
                Enter code
              </button>
            </p>
          </div>
        )}

        {step === 'forgot-reset' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter the 6-digit code and your new password.
            </p>
            <div className="form-group">
              <label className="form-label">Reset Code</label>
              <input className="form-control" type="text" placeholder="6-digit code"
                value={fpToken} onChange={e => setFpToken(e.target.value)}
                maxLength={6} style={{ letterSpacing: 4, textAlign: 'center', fontSize: 18 }} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={fpNewPw}
                onChange={e => setFpNewPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-control" type="password" value={fpConfirmPw}
                onChange={e => setFpConfirmPw(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setStep('forgot-request')}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleResetPassword} disabled={loading}>
                {loading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Resetting...</> : 'Reset Password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
