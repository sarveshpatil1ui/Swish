import React, { useState, useRef } from 'react';
import { formatDistanceToNow } from '../utils/helpers';
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  MapPin, Tag, Send, BookmarkCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { mockComments } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import ShareModal from './ShareModal';
import ReportModal from './ReportModal';
import ConfirmModal from './ConfirmModal';

export default function PostCard({ post }) {
  const { toggleLike, toggleBookmark, addComment, deletePost, me } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState(
    mockComments.filter(c => c.postId === post.id)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [doubleTapping, setDoubleTapping] = useState(false);
  const menuRef = useRef(null);
  
  const isOwn = post.author.id === me.id;

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newC = {
      id: `c${Date.now()}`,
      postId: post.id,
      author: me,
      text: commentText,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    setLocalComments(cs => [newC, ...cs]);
    addComment(post.id, commentText);
    setCommentText('');
    showToast('Comment added!', 'success');
  };

  const handleLike = () => {
    toggleLike(post.id);
    if (!post.isLiked) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 600);
    }
  };

  const handleDoubleTap = () => {
    if (!post.isLiked) {
      toggleLike(post.id);
    }
    setDoubleTapping(true);
    setTimeout(() => setDoubleTapping(false), 1000);
  };

  const handleBookmark = () => {
    toggleBookmark(post.id);
    showToast(post.isBookmarked ? 'Removed from saved' : 'Post saved!', 'info');
  };

  const handleShare = () => {
    setMenuOpen(false);
    setShowShare(true);
  };

  const handleReport = () => {
    setMenuOpen(false);
    setShowReport(true);
  };

  const handleDeleteConfirm = async () => {
    deletePost(post.id);
    showToast('Post deleted', 'success');
    setShowDeleteConfirm(false);
  };

  const menuItems = isOwn
    ? [
        { label: 'Share post', action: handleShare },
        { label: 'Copy link', action: () => { navigator.clipboard.writeText(`https://swish.app/post/${post.id}`); showToast('Link copied!', 'success'); setMenuOpen(false); } },
        { label: 'Delete post', action: () => { setMenuOpen(false); setShowDeleteConfirm(true); }, danger: true },
      ]
    : [
        { label: 'Share post', action: handleShare },
        { label: 'Copy link', action: () => { navigator.clipboard.writeText(`https://swish.app/post/${post.id}`); showToast('Link copied!', 'success'); setMenuOpen(false); } },
        { label: 'Report post', action: handleReport, danger: true },
      ];

  return (
    <>
      <article className="card sm:rounded-2xl border-x-0 sm:border-x border-y sm:border-y border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 mb-4 sm:mb-6 shadow-sm">
        {/* Header */}
        <div className="p-3 sm:p-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate(`/user/${post.author.id}`)}
          >
            <div className="relative">
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-brand-400 transition-colors"
              />
              {post.author.isVerified && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                  <span className="text-white text-[8px] font-bold">✓</span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white group-hover:underline text-sm leading-tight">
                  {post.author.name}
                </span>
                <span className="text-slate-500 text-xs font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                  {post.author.department}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-medium">
                <span>@{post.author.username}</span>
                <span>·</span>
                <span>{formatDistanceToNow(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal size={20} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-premium border border-slate-200 dark:border-slate-800 z-20 py-1.5 animate-scale-in">
                  {menuItems.map(item => (
                    <button
                      key={item.label}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        item.danger
                          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={item.action}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content (Text) */}
        <div className="px-3 sm:px-4 pb-3">
          <p className="text-[15px] text-slate-900 dark:text-slate-100 leading-normal whitespace-pre-line">
            {post.content}
          </p>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="px-3 sm:px-4 pb-4 flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Image */}
        {post.image && (
          <div 
            className="w-full relative bg-slate-100 dark:bg-slate-950 sm:px-4 sm:pb-2 cursor-pointer group"
            onDoubleClick={handleDoubleTap}
          >
            {!imageLoaded && <div className="w-full h-80 sm:h-96 skeleton sm:rounded-xl" />}
            <div className="overflow-hidden sm:rounded-xl border-y sm:border border-slate-200/50 dark:border-slate-800/50">
              <img
                src={post.image}
                alt="Post media"
                className={`w-full object-cover max-h-[500px] sm:max-h-[600px] ${imageLoaded ? 'block' : 'hidden'}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
            
            {/* Double Tap Heart Overlay */}
            {doubleTapping && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <Heart size={100} className="text-white fill-white drop-shadow-2xl animate-bounce-subtle opacity-90" />
              </div>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Like */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={handleLike}>
              <div className={`p-2 rounded-full transition-colors group-hover:bg-red-50 dark:group-hover:bg-red-500/10 ${post.isLiked ? 'text-red-500' : 'text-slate-500'}`}>
                <Heart
                  size={24}
                  className={`transition-all duration-300 ${post.isLiked ? 'fill-current text-red-500' : 'group-hover:text-red-500'} ${heartAnim ? 'animate-bounce-subtle' : ''}`}
                />
              </div>
              <span className={`text-sm font-bold ${post.isLiked ? 'text-red-500' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'} transition-colors`}>{post.likes}</span>
            </div>

            {/* Comment */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setShowComments(s => !s)}>
              <div className="p-2 rounded-full text-slate-500 transition-colors group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                <MessageCircle size={24} className="group-hover:scale-105 transition-transform" />
              </div>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{post.comments}</span>
            </div>

            {/* Share */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setShowShare(true)}>
              <div className="p-2 rounded-full text-slate-500 transition-colors group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <Share2 size={24} className="group-hover:scale-105 transition-transform" />
              </div>
            </div>
          </div>

          {/* Bookmark */}
          <div className="group cursor-pointer p-2 -mr-2 rounded-full transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={handleBookmark}>
            {post.isBookmarked
              ? <BookmarkCheck size={24} className="text-amber-500 fill-amber-500" />
              : <Bookmark size={24} className="text-slate-500 group-hover:text-amber-500 group-hover:scale-105 transition-all" />
            }
          </div>
        </div>

        {/* Location/College context */}
        <div className="px-3 sm:px-4 pb-3 flex items-center gap-1 text-xs font-medium text-slate-500">
          <MapPin size={12} />
          <span>Shared with {post.visibility === 'campus' ? post.author.college : 'Everyone'}</span>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
            {/* Comment Form */}
            <form onSubmit={handleComment} className="px-3 sm:px-4 py-3 flex items-center gap-3">
              <img src={me.avatar} alt="You" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
              <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
                <button 
                  type="submit" 
                  className={`text-brand-600 dark:text-brand-400 font-bold text-sm ${!commentText.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:text-brand-700 dark:hover:text-brand-300'}`}
                  disabled={!commentText.trim()}
                >
                  Post
                </button>
              </div>
            </form>

            {/* Comment List */}
            <div className="px-3 sm:px-4 pb-4 space-y-4 max-h-72 overflow-y-auto">
              {localComments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4 font-medium">No comments yet. Start the conversation!</p>
              )}
              {localComments.map(c => (
                <div key={c.id} className="flex items-start gap-3 animate-fade-in group">
                  <img src={c.author.avatar} alt={c.author.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer" onClick={() => navigate(`/user/${c.author.id}`)} />
                  <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm inline-block max-w-[95%]">
                      <p className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:underline inline-block mr-2" onClick={() => navigate(`/user/${c.author.id}`)}>{c.author.name}</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 inline">{c.text}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1 ml-2">
                      <span className="text-xs font-medium text-slate-400">{formatDistanceToNow(c.createdAt)}</span>
                      <button className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Reply</button>
                    </div>
                  </div>
                  <button className="p-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                    <Heart size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Modals */}
      {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
      {showReport && <ReportModal post={post} onClose={() => setShowReport(false)} />}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
