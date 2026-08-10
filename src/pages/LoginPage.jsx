import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Waves, Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill all fields'); return; }
    if (!email.includes('@')) { setError('Enter a valid college email'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    loginUser(email);
    setLoading(false);
    navigate('/feed');
  };

  return (
    <div className="min-h-screen flex selection:bg-brand-500/30">
      {/* Left Panel - Premium Abstract Brand Experience */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#09090b] flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
            <Waves size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Swish</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Your campus,<br />unlocked.
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Connect with batchmates, discover events, and share moments. An exclusive space for verified students.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>MIT Pune</span>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <span>Exclusively for Students</span>
        </div>
      </div>

      {/* Right Panel - Clean Minimal Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-[400px]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-10 text-sm transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Waves size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Swish</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Welcome back</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Enter your credentials to access your campus.</p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium animate-fade-in flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                College Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@mitpune.edu.in"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <button type="button" className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-semibold transition-colors">Forgot?</button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-12"
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
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base mt-4 justify-center"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 font-bold hover:text-brand-700 transition-colors">
              Join Campus
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <Link to="/admin/login" className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
