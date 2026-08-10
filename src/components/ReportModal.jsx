import React, { useState } from 'react';
import { X, Flag, ChevronRight, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const reasons = [
  { id: 'spam', label: 'Spam', desc: 'Unwanted commercial content or mass messaging' },
  { id: 'inappropriate', label: 'Inappropriate content', desc: 'Offensive, harmful, or explicit material' },
  { id: 'harassment', label: 'Harassment or bullying', desc: 'Targeted harassment or intimidation' },
  { id: 'misinformation', label: 'Misinformation', desc: 'False or misleading information' },
  { id: 'copyright', label: 'Copyright violation', desc: 'Unauthorized use of copyrighted content' },
  { id: 'other', label: 'Something else', desc: 'Other community guideline violations' },
];

export default function ReportModal({ post, onClose }) {
  const { addReport } = useApp();
  const { showToast } = useToast();
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    addReport({
      reported: post.author,
      post,
      reason: reasons.find(r => r.id === selected)?.label || selected,
    });
    setLoading(false);
    setSubmitted(true);
    setTimeout(() => {
      showToast('Report submitted. Our team will review it.', 'success');
      onClose();
    }, 1500);
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
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-red-500" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Report Post</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-full">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center animate-scale-in">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Report submitted</p>
              <p className="text-sm text-slate-400">Thank you for keeping Swish safe</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 pt-4 pb-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Why are you reporting this post by <strong className="text-slate-700 dark:text-slate-300">{post.author.name}</strong>?
              </p>
            </div>

            <div className="px-3 pb-4 space-y-1">
              {reasons.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                    selected === r.id
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${selected === r.id ? 'text-red-700 dark:text-red-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {r.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selected === r.id ? 'border-red-500 bg-red-500' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {selected === r.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button onClick={onClose} className="flex-1 btn-secondary py-2.5">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selected || loading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
