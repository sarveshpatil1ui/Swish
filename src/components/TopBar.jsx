import React from 'react';
import { Waves, PlusSquare, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function TopBar({ onCreatePost }) {
  const navigate = useNavigate();
  const { me } = useApp();

  return (
    <div className="lg:hidden sticky top-0 left-0 right-0 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/60 z-40 flex items-center justify-between px-4">
      {/* Brand */}
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/feed')}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-brand-500/20">
          <Waves size={18} className="text-white" />
        </div>
        <span className="text-xl font-bold gradient-text pb-0.5">Swish</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onCreatePost}
          className="text-slate-900 dark:text-white hover:text-brand-600 transition-colors"
        >
          <PlusSquare size={24} strokeWidth={2.5} />
        </button>
        
        {/* User avatar / settings */}
        <div 
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <img src={me.avatar} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
