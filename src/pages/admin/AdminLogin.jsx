import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Waves, ArrowRight, Shield, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Mock admin credentials (UI-only prototype)
const ADMIN_EMAIL    = 'admin@swish.com';
const ADMIN_PASSWORD = 'Admin@123';

export default function AdminLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();
  const { adminLogin } = useApp();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    // Simulate a brief auth delay for realism
    await new Promise(r => setTimeout(r, 700));

    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      adminLogin();
      navigate('/admin', { replace: true });
    } else {
      setError('Invalid admin credentials. Access denied.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex selection:bg-brand-500/30">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#09090b] flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-brand-600/15 rounded-full blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-violet-600/15 rounded-full blur-[130px]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
            <Waves size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Swish</span>
        </div>

        {/* Center copy */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-400 mb-6">
            <Shield size={12} className="text-brand-400" />
            Restricted Area · Admins Only
          </div>
          <h2 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Platform<br />Control Center.
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Monitor users, moderate content, review reports, and keep the Swish campus community safe and thriving.
          </p>

          {/* Feature hints */}
          <div className="mt-10 space-y-3">
            {[
              'Real-time platform analytics',
              'User & content moderation',
              'Reports & flagging dashboard',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-brand-400" />
                </div>
                <span className="text-sm text-slate-400 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-slate-600">
          <span>MIT Pune</span>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <span>Admin Access Only</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-[400px]">
          {/* Back to student login */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-10 text-sm transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Student Login
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Waves size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Swish</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-xs font-bold text-brand-700 dark:text-brand-400 mb-6">
            <Shield size={12} />
            Admin Portal
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            Admin Sign In
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
            Enter your admin credentials to access the control panel.
          </p>

          {/* Error banner */}
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium animate-fade-in flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@swish.com"
                  className="input-field pl-11"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter admin password"
                  className="input-field pl-11 pr-12"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base mt-4 justify-center"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying credentials...
                </>
              ) : (
                <>
                  Access Admin Panel <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Credentials hint (prototype only) */}
          <div className="mt-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
              <Shield size={12} />
              Demo Credentials
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 font-mono">
              Email: admin@swish.com<br />
              Password: Admin@123
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            Not an admin?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 transition-colors">
              Student / Faculty Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
