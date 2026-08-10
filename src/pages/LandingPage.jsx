import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Waves, ArrowRight, Users, Shield, Zap, Star,
  GraduationCap, MessageCircle, Heart, Bookmark,
  CheckCircle, Lock, Bell, TrendingUp, Camera,
  ChevronRight, Mail, MapPin, Globe, AtSign, Link2,
  Sparkles,
} from 'lucide-react';

const features = [
  { icon: Shield, title: 'Campus-Verified Only', desc: 'Every account is verified through your college email and student ID. No outsiders, no bots.', color: 'emerald' },
  { icon: Users, title: 'Connect & Collaborate', desc: 'Find batchmates, seniors, and clubs. Build your campus network effortlessly.', color: 'brand' },
  { icon: Zap, title: 'Real-Time Updates', desc: 'Never miss campus events, deadlines, or announcements. Stay in the loop.', color: 'amber' },
  { icon: TrendingUp, title: 'Trending on Campus', desc: "Discover what's buzzing — hackathons, placement tips, sports, and fests.", color: 'violet' },
  { icon: Camera, title: 'Share Your Moments', desc: 'Post photos, stories, and updates with your campus community.', color: 'rose' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Stay updated on what matters — likes, comments, and mentions.', color: 'cyan' },
];

const steps = [
  { num: '01', title: 'Verify your identity', desc: 'Sign up with your college email to join your exclusive campus community.' },
  { num: '02', title: 'Build your profile', desc: 'Add your department, year, and interests to connect with the right people.' },
  { num: '03', title: 'Start sharing', desc: 'Post updates, follow classmates, join clubs, and be part of the conversation.' },
];

const testimonials = [
  { avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=t1&backgroundColor=b6e3f4', name: 'Ananya R.', dept: 'CS, 3rd Year', text: 'Swish helped me find my project team in hours. Best campus app ever — feels like Instagram but just for us!' },
  { avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=t2&backgroundColor=ffdfbf', name: 'Dev K.', dept: 'MBA, 1st Year', text: "I got my internship lead through Swish. The alumni network is incredible. Couldn't imagine college without it." },
  { avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=t3&backgroundColor=c0aede', name: 'Meera S.', dept: 'Civil, 2nd Year', text: 'Finally a social app that feels safe and exclusively for students. The privacy is what sold me on it.' },
];

const mockups = [
  { type: 'post', user: 'Rahul Sharma', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=r1&backgroundColor=b6e3f4', time: '2h ago', content: 'Just wrapped up the first day of the annual Hackathon! 🚀 Incredible energy from all the teams.', likes: 124, comments: 18 },
  { type: 'event', user: 'Tech Club', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=c1&backgroundColor=ffdfbf', time: '5h ago', content: 'Don\'t miss our AI/ML workshop tomorrow at 5 PM in Auditorium 2. Limited seats!', likes: 89, comments: 5 },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] selection:bg-brand-500/30">
      {/* Premium Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Waves size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Swish</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Features</a>
            <a href="#how" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">How it works</a>
            <a href="#privacy" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Privacy</a>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors hidden sm:block">Log in</button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm shadow-premium">
              Join Campus
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean, High Contrast */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden flex flex-col items-center text-center">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none dark:bg-brand-500/5" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 text-xs font-semibold mb-8 animate-fade-in border border-brand-200 dark:border-brand-500/20">
          <Sparkles size={14} />
          <span>Now exclusively live at MIT Pune</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 leading-[1.1] animate-slide-up max-w-4xl tracking-tight">
          The social network for<br />
          <span className="text-brand-600 dark:text-brand-500">your college life.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mb-10 animate-slide-up leading-relaxed">
          Connect with batchmates, share moments, and never miss a campus update. 
          A private, premium space built just for verified students.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-slide-up mb-16 w-full max-w-md mx-auto sm:max-w-none sm:w-auto">
          <button onClick={() => navigate('/register')} className="w-full sm:w-auto btn-primary text-base px-8 py-3.5 shadow-premium-hover">
            Get Started Free
          </button>
          <button onClick={() => navigate('/feed')} className="w-full sm:w-auto btn-secondary text-base px-8 py-3.5">
            View Live Demo
          </button>
        </div>

        {/* Floating App UI Mockup (Abstracted for clean look) */}
        <div className="relative w-full max-w-5xl mx-auto animate-slide-up mt-8">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-[#09090b] to-transparent z-10 h-32 bottom-0 top-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
            {mockups.map((mock, idx) => (
              <div key={idx} className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-premium text-left transform transition-transform hover:-translate-y-2 duration-300 ${idx === 1 ? 'md:translate-y-12' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <img src={mock.avatar} alt="avatar" className="w-10 h-10 rounded-full bg-slate-100" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{mock.user}</p>
                    <p className="text-xs text-slate-500">{mock.time}</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">{mock.content}</p>
                <div className="flex items-center gap-6 text-slate-500 text-sm font-medium">
                  <div className="flex items-center gap-1.5"><Heart size={16} /> {mock.likes}</div>
                  <div className="flex items-center gap-1.5"><MessageCircle size={16} /> {mock.comments}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-10 border-y border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-8 md:gap-16">
          {[
            { val: '4,800+', label: 'Verified Students' },
            { val: '18K+', label: 'Posts & Updates' },
            { val: '92%', label: 'Daily Active Users' },
            { val: '50+', label: 'Clubs & Societies' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.val}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features - Premium Grid */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Everything your campus needs.
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Designed from the ground up to replace scattered WhatsApp groups and public social networks with one beautiful, private platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="card p-8 group hover:border-brand-500/30 transition-colors">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm
                  ${feature.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  feature.color === 'brand' ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' :
                  feature.color === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                  feature.color === 'violet' ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400' :
                  feature.color === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                  'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400'}`}
                >
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - Minimalist Steps */}
      <section id="how" className="py-32 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Join your campus in minutes.
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">
                No complex onboarding. Just verify your identity and instantly connect with your batch.
              </p>
              
              <div className="space-y-8">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{step.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Visual representation of signup */}
            <div className="bg-slate-50 dark:bg-[#09090b] rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-violet-500" />
              <div className="card p-6 shadow-premium max-w-sm mx-auto relative z-10 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 mb-6 justify-center">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <Waves size={14} className="text-white" />
                  </div>
                  <span className="text-lg font-bold">Swish</span>
                </div>
                <div className="space-y-4">
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center px-4 border border-slate-200 dark:border-slate-700">
                    <Mail size={16} className="text-slate-400 mr-2" />
                    <span className="text-sm text-slate-400">you@mitpune.edu.in</span>
                  </div>
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center px-4 border border-slate-200 dark:border-slate-700">
                    <Lock size={16} className="text-slate-400 mr-2" />
                    <span className="text-sm text-slate-400">••••••••••</span>
                  </div>
                  <div className="h-10 bg-brand-600 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">Join Campus</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-16 text-center">
            Loved by students.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="card p-8 flex flex-col justify-between hover-lift">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => <Star key={j} size={16} className="fill-brand-500 text-brand-500" />)}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-8 text-base leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.dept}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto bg-brand-600 rounded-[2.5rem] p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">
              Ready to dive in?
            </h2>
            <p className="text-brand-100 text-lg max-w-2xl mx-auto mb-10">
              Join thousands of students already on Swish. Free forever. Exclusively for MIT Pune.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/register')} className="bg-white text-brand-600 hover:bg-slate-50 font-bold px-8 py-4 rounded-full transition-colors shadow-lg">
                Create Free Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/60 py-12 px-6 bg-white dark:bg-[#09090b]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Waves size={12} className="text-white dark:text-slate-900" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Swish</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <p>© 2026 Swish. All rights reserved.</p>
            <button onClick={() => navigate('/admin/login')} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Admin Login</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
