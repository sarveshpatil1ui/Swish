import React, { useState } from 'react';
import { X, Link2, Check, MessageCircle, Users, Globe } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const shareOptions = [
  { id: 'copy', label: 'Copy Link', icon: Link2, color: 'slate' },
  { id: 'dm',   label: 'Send as Message', icon: MessageCircle, color: 'brand' },
  { id: 'campus', label: 'Share to Campus', icon: Users, color: 'violet' },
];

export default function ShareModal({ post, onClose }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://swish.app/post/${post.id}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Link copied to clipboard!', 'success');
  };

  const handleShare = (option) => {
    if (option.id === 'copy') {
      handleCopy();
      return;
    }
    showToast(`Shared via ${option.label}`, 'success');
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up-sheet sm:animate-scale-in overflow-hidden">
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Share Post</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* Post preview */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{post.author.name}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{post.content}</p>
            </div>
            {post.image && <img src={post.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
          </div>
        </div>

        {/* Share options */}
        <div className="p-4 space-y-2">
          {shareOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleShare(opt)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${opt.color === 'slate' ? 'slate' : opt.color}-100 dark:bg-${opt.color}-900/30 group-hover:scale-105 transition-transform`}>
                {opt.id === 'copy' && copied
                  ? <Check size={18} className="text-emerald-600" />
                  : <opt.icon size={18} className={`text-${opt.color === 'slate' ? 'slate-600 dark:text-slate-400' : `${opt.color}-600 dark:text-${opt.color}-400`}`} />
                }
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {opt.id === 'copy' && copied ? 'Copied!' : opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Link preview */}
        <div className="px-5 pb-5">
          <div
            className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={handleCopy}
          >
            <Link2 size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-400 truncate flex-1">swish.app/post/{post.id}</span>
            <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold flex-shrink-0">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
