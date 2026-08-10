import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Tag, Globe, Users, Lock, ChevronDown, Hash, Smile, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';

const visibilityOptions = [
  { value: 'campus', label: 'Campus', icon: Users, desc: 'Visible to MIT Pune students' },
  { value: 'public', label: 'Public', icon: Globe, desc: 'Visible to everyone' },
  { value: 'friends', label: 'Friends only', icon: Lock, desc: 'Only your followers' },
];

const tagSuggestions = ['CampusLife', 'TechFest', 'Hackathon', 'Sports', 'Events', 'Study', 'Food', 'Photography'];
const emojiSuggestions = ['😊', '🚀', '🎓', '💪', '🔥', '👏', '✨', '🎉', '📚', '☕'];

export default function CreatePostModal({ onClose }) {
  const { addPost, me } = useApp();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [tags, setTags] = useState([]);
  const [visibility, setVisibility] = useState('campus');
  const [showVisibility, setShowVisibility] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const textareaRef = useRef(null);

  const selectedVis = visibilityOptions.find(v => v.value === visibility);

  const addTag = (t) => {
    const clean = t.replace(/^#/, '').trim();
    if (clean && !tags.includes(clean)) setTags(ts => [...ts, clean]);
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await new Promise(r => setTimeout(r, 800)); // simulate network delay
    addPost({ content, image: imageUrl, tags, visibility });
    setPosting(false);
    onClose();
  };

  const appendEmoji = (e) => {
    setContent(c => c + e);
    textareaRef.current?.focus();
    setShowEmojis(false);
  };

  const charLimit = 500;
  const charLeft = charLimit - content.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#09090b]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-slide-up-sheet sm:animate-scale-in flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {/* Mobile drag indicator */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-900 dark:text-white text-lg">Create Post</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Author & Visibility */}
          <div className="flex items-center gap-3 mb-5">
            <img src={me.avatar} alt={me.name} className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" />
            <div>
              <p className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">{me.name}</p>
              
              {/* Visibility selector */}
              <div className="relative mt-1">
                <button
                  onClick={() => setShowVisibility(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 px-2.5 py-1 rounded-md transition-colors"
                >
                  <selectedVis.icon size={12} />
                  {selectedVis.label}
                  <ChevronDown size={12} />
                </button>
                
                {showVisibility && (
                  <div className="absolute left-0 top-8 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-100 dark:border-slate-700 z-10 py-1.5 animate-scale-in">
                    {visibilityOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setVisibility(opt.value); setShowVisibility(false); }}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                          visibility === opt.value ? 'bg-brand-50/50 dark:bg-brand-900/20' : ''
                        }`}
                      >
                        <div className={`mt-0.5 p-1.5 rounded-full ${visibility === opt.value ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                          <opt.icon size={16} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${visibility === opt.value ? 'text-brand-700 dark:text-brand-400' : 'text-slate-900 dark:text-white'}`}>{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value.slice(0, charLimit))}
            placeholder="What's happening on campus? Share your thoughts, events, or achievements..."
            rows={5}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-[17px] leading-relaxed resize-none outline-none mb-2"
          />

          {/* Image input & Preview */}
          {showImageInput && (
            <div className="mb-4 animate-slide-down relative group">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Paste image URL (e.g. from Unsplash)"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all mb-3"
              />
              {imageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                  <img src={imageUrl} alt="preview" className="w-full object-cover max-h-64" onError={e => e.target.style.display='none'} />
                  <button
                    onClick={() => { setImageUrl(''); setShowImageInput(false); }}
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full p-2 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tags Display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-sm font-semibold px-3 py-1.5 rounded-full group transition-colors">
                  #{t}
                  <button onClick={() => setTags(ts => ts.filter(x => x !== t))} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 rounded-b-3xl shrink-0">
          
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-medium ${charLeft < 50 ? 'text-amber-500' : charLeft < 20 ? 'text-red-500' : 'text-slate-400'}`}>
              {charLeft} characters left
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowImageInput(i => !i)}
                className={`p-2.5 rounded-full transition-colors ${showImageInput ? 'text-brand-600 bg-brand-50 dark:bg-brand-500/10' : 'text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10'}`}
                title="Add image"
              >
                <ImageIcon size={20} />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowEmojis(e => !e)}
                  className="p-2.5 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
                {showEmojis && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-premium border border-slate-100 dark:border-slate-700 p-3 z-10 animate-scale-in">
                    <p className="text-xs font-semibold text-slate-400 mb-2 px-1">Suggested Emojis</p>
                    <div className="flex flex-wrap gap-2">
                      {emojiSuggestions.map(e => (
                         <button
                           key={e}
                           onClick={() => appendEmoji(e)}
                           className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                         >
                           {e}
                         </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group">
                <button
                  className="p-2.5 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                  title="Add tag"
                >
                  <Tag size={20} />
                </button>
                {/* Tag Dropdown on hover */}
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-premium border border-slate-100 dark:border-slate-700 p-3 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <p className="text-xs font-semibold text-slate-400 mb-2 px-1">Popular Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagSuggestions.filter(t => !tags.includes(t)).slice(0, 6).map(t => (
                      <button
                        key={t}
                        onClick={() => addTag(t)}
                        className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button className="p-2.5 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
                <MapPin size={20} />
              </button>
            </div>

            <button
              onClick={handlePost}
              disabled={!content.trim() || posting}
              className={`px-8 py-2.5 rounded-full font-bold text-[15px] shadow-sm transition-all duration-200 ${
                !content.trim() || posting 
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md text-white'
              }`}
            >
              {posting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Posting
                </span>
              ) : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
