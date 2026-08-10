import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Waves, Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, User, GraduationCap, Building, Calendar, Sparkles } from 'lucide-react';

const departments = [
  'Computer Science', 'Electronics & Telecom', 'Mechanical Engineering',
  'Civil Engineering', 'MBA Finance', 'MBA Marketing', 'Information Technology',
  'Chemical Engineering', 'Electrical Engineering', 'Biotechnology',
];

const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG - 1st Year', 'PG - 2nd Year'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    username: '', dept: '', year: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleNext = () => {
    if (step === 1) {
      if (!form.name || !form.email || !form.password) { setError('Fill all fields'); return; }
      if (!form.email.includes('@')) { setError('Use your college email'); return; }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    }
    setError('');
    setStep(2);
  };

  const handleRegister = async () => {
    if (!form.username || !form.dept || !form.year) { setError('Fill all fields'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    navigate('/feed');
  };

  const pwStrength = () => {
    const pw = form.password;
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Weak', color: 'red', width: '25%' };
    if (pw.length < 8) return { label: 'Fair', color: 'amber', width: '50%' };
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: 'Good', color: 'brand', width: '75%' };
    return { label: 'Strong', color: 'emerald', width: '100%' };
  };

  const strength = pwStrength();

  return (
    <div className="min-h-screen flex selection:bg-brand-500/30">
      {/* Left Panel - Premium Abstract Brand Experience */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#09090b] flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-600/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 backdrop-blur-md">
            <Waves size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Swish</span>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-6 border border-white/10 backdrop-blur-sm">
            <Sparkles size={14} className="text-brand-400" />
            <span>Join 4,800+ Students</span>
          </div>
          <h2 className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            The private network for your campus.
          </h2>
          <div className="space-y-4 text-slate-400 font-medium">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <span className="text-brand-400 text-xs">✓</span>
              </div>
              Verified students only
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <span className="text-brand-400 text-xs">✓</span>
              </div>
              No public profiles
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                <span className="text-brand-400 text-xs">✓</span>
              </div>
              Campus-wide updates
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-slate-500">
          <span>MIT Pune</span>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <span>Exclusively for Students</span>
        </div>
      </div>

      {/* Right Panel - Clean Minimal Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-[420px]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-10 text-sm transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Waves size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Swish</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            {step === 1 ? 'Create your account' : 'Complete profile'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
            {step === 1 ? 'Start by verifying your college identity.' : 'Just a few more details to get you set up.'}
          </p>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium animate-fade-in flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          <div className="space-y-5">
            {step === 1 ? (
              <div className="animate-fade-in space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={form.name} onChange={update('name')} placeholder="First Last" className="input-field pl-11" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">College Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={form.email} onChange={update('email')} placeholder="you@mitpune.edu.in" className="input-field pl-11" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder="Min. 8 characters" className="input-field pl-11 pr-12" />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {strength && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full rounded-full transition-all duration-300 ${
                          strength.color === 'red' ? 'bg-red-500' :
                          strength.color === 'amber' ? 'bg-amber-500' :
                          strength.color === 'brand' ? 'bg-brand-500' : 'bg-emerald-500'
                        }`} style={{ width: strength.width }} />
                      </div>
                      <p className={`text-xs mt-1.5 font-medium ${
                        strength.color === 'red' ? 'text-red-500' :
                        strength.color === 'amber' ? 'text-amber-500' :
                        strength.color === 'brand' ? 'text-brand-500' : 'text-emerald-500'
                      }`}>{strength.label}</p>
                    </div>
                  )}
                </div>

                <button onClick={handleNext} className="w-full btn-primary py-3.5 text-base mt-2 justify-center">
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="animate-fade-in space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">@</span>
                    <input type="text" value={form.username} onChange={update('username')} placeholder="username" className="input-field pl-9" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Department</label>
                  <div className="relative">
                    <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select value={form.dept} onChange={update('dept')} className="input-field pl-11 appearance-none bg-no-repeat" style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 1rem center', backgroundSize: '0.65em auto' }}>
                      <option value="" disabled>Select department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Year of Study</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select value={form.year} onChange={update('year')} className="input-field pl-11 appearance-none bg-no-repeat" style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 1rem center', backgroundSize: '0.65em auto' }}>
                      <option value="" disabled>Select year</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="btn-secondary py-3.5 px-6">
                    Back
                  </button>
                  <button onClick={handleRegister} disabled={loading} className="flex-1 btn-primary py-3.5 justify-center">
                    {loading ? (
                      <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-bold hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
