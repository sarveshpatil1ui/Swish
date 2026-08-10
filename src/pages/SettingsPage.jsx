import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User, Bell, Lock, Shield, Palette, Globe, Smartphone,
  ChevronRight, Moon, Sun, Save, LogOut, Trash2, HelpCircle, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
  { id: 'about', label: 'About Swish', icon: Info },
];

export default function SettingsPage() {
  const { darkMode, toggleDarkMode, me, logoutUser } = useApp();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account');
  const [toggles, setToggles] = useState({
    private: false, show_email: false, activity: true, tagged: true,
    likes: true, comments: true, follows: true, mentions: true, events: false,
    '2fa': false,
  });
  const [form, setForm] = useState({
    name: me?.name || 'Kedar Bhanage',
    username: me?.username || 'kedar.b',
    bio: me?.bio || 'CS Senior @ MIT Pune 🎓 | Full-stack dev | Building Swish 🌊',
    email: 'kedar.b@mitpune.edu.in',
  });
  const [saved, setSaved] = useState(false);

  const toggleSetting = (id) => setToggles(t => ({ ...t, [id]: !t[id] }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="font-bold text-slate-900 dark:text-white text-xl hidden sm:block">Account Profile</h2>
            <div className="flex items-center gap-4 mb-6">
              <img src={me?.avatar} alt={form.name} className="w-20 h-20 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold rounded-full transition-colors">
                Change Photo
              </button>
            </div>
            {['name', 'username', 'email'].map(field => (
              <div key={field} className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">{
                  field === 'name' ? 'Display Name' : field
                }</label>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[15px] text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-[15px] text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
              />
            </div>
            <div className="pt-4">
              <button onClick={handleSave} className={`w-full sm:w-auto px-8 py-3 rounded-full font-bold text-[15px] transition-all flex items-center justify-center gap-2 ${saved ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'btn-primary'}`}>
                <Save size={18} />
                {saved ? 'Saved Successfully!' : 'Save Changes'}
              </button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h2 className="font-bold text-slate-900 dark:text-white text-xl hidden sm:block">Theme & Display</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Light Mode', icon: Sun, value: false },
                { label: 'Dark Mode', icon: Moon, value: true },
              ].map(({ label, icon: Icon, value }) => (
                <button
                  key={label}
                  onClick={() => { if (darkMode !== value) toggleDarkMode(); }}
                  className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
                    darkMode === value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                  }`}
                >
                  <Icon size={36} className={darkMode === value ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} strokeWidth={1.5} />
                  <span className={`text-[15px] font-bold ${darkMode === value ? 'text-brand-700 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'privacy':
      case 'notifications':
      case 'security':
        const currentGroup = {
          privacy: [
            { id: 'private', label: 'Private Account', desc: 'Only followers can see your posts', type: 'toggle' },
            { id: 'show_email', label: 'Show Email on Profile', type: 'toggle' },
            { id: 'activity', label: 'Show Activity Status', desc: 'Let others see when you\'re online', type: 'toggle' },
            { id: 'tagged', label: 'Allow Tagging', desc: 'Others can tag you in posts', type: 'toggle' },
          ],
          notifications: [
            { id: 'likes', label: 'Likes', desc: 'Notify when someone likes your post', type: 'toggle' },
            { id: 'comments', label: 'Comments', desc: 'Notify when someone comments', type: 'toggle' },
            { id: 'follows', label: 'New Followers', type: 'toggle' },
            { id: 'mentions', label: 'Mentions', type: 'toggle' },
            { id: 'events', label: 'Campus Events', type: 'toggle' },
          ],
          security: [
            { id: '2fa', label: 'Two-Factor Authentication', desc: 'Extra security for your account', type: 'toggle' },
            { id: 'sessions', label: 'Active Sessions', type: 'link' },
            { id: 'password', label: 'Change Password', type: 'link' },
          ]
        }[activeSection];

        return (
          <div className="space-y-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-xl mb-6 hidden sm:block capitalize">{activeSection} Settings</h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentGroup.map(s => (
                <div key={s.id} className="flex items-center justify-between py-4 first:pt-0">
                  <div className="pr-4">
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white">{s.label}</p>
                    {s.desc && <p className="text-[13px] text-slate-500 mt-1">{s.desc}</p>}
                  </div>
                  {s.type === 'toggle' && (
                    <button
                      onClick={() => toggleSetting(s.id)}
                      className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                        toggles[s.id] ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        toggles[s.id] ? 'translate-x-[22px]' : 'translate-x-[2px]'
                      }`} />
                    </button>
                  )}
                  {s.type === 'link' && (
                    <ChevronRight size={20} className="text-slate-400" />
                  )}
                </div>
              ))}
            </div>
            
            {activeSection === 'security' && (
              <div className="mt-10 pt-6 border-t border-red-100 dark:border-red-900/30">
                <h3 className="font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                <div className="space-y-3">
                  <button className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-[15px] font-bold text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:text-amber-600 transition-colors">
                    <LogOut size={18} /> Deactivate Account
                  </button>
                  <button className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-[15px] font-bold text-slate-700 dark:text-slate-300 hover:border-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={18} /> Delete Account Permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'help':
      case 'about':
        return (
          <div className="space-y-6">
            <h2 className="font-bold text-slate-900 dark:text-white text-xl hidden sm:block capitalize">{activeSection === 'help' ? 'Help & Support' : 'About Swish'}</h2>
            <div className="card p-6 bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30">
              <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                Swish is the premium social network for MIT Pune students. 
                Built to connect the campus, share moments, and keep track of events.
              </p>
              <p className="text-[15px] font-semibold text-brand-600 dark:text-brand-400">Version 2.0.0 (Beta)</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto sm:px-4 pt-4 sm:pt-6 pb-24 lg:pb-8 min-h-[calc(100vh-60px)]">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6 px-4 sm:px-0">Settings</h1>

      <div className="flex flex-col md:flex-row gap-0 sm:gap-6 lg:gap-10">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 sm:card sm:border-slate-200/60 dark:sm:border-slate-800/60 sm:p-3 shadow-sm">
            
            {/* Desktop Menu */}
            <div className="hidden sm:flex flex-col space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold transition-all duration-200 ${
                    activeSection === id
                      ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>

            {/* Mobile Scrollable Menu */}
            <div className="flex sm:hidden overflow-x-auto px-4 pb-4 space-x-2 scrollbar-none snap-x border-b border-slate-100 dark:border-slate-800">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap snap-start transition-colors ${
                    activeSection === id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 px-4 sm:px-0 pt-6 sm:pt-0">
          <div className="bg-white dark:bg-slate-900 sm:card sm:border-slate-200/60 dark:sm:border-slate-800/60 sm:p-8 sm:shadow-sm">
            {renderContent()}
          </div>
          
          {/* Mobile Logout Button at bottom of content */}
          <div className="mt-8 mb-4 sm:hidden">
            <button
              onClick={handleLogout}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-red-500 font-bold text-[15px] flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
