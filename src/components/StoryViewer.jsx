import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Heart, MoreHorizontal, Volume2, VolumeX } from 'lucide-react';

export default function StoryViewer({ storyGroup, groupIndex, totalGroups, onClose, onNext, onPrev }) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [liked, setLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);

  const stories = storyGroup.stories;
  const currentStory = stories[currentStoryIndex];
  const DURATION = currentStory?.duration || 5000;

  const advanceStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(i => i + 1);
      setProgress(0);
      elapsedRef.current = 0;
    } else {
      onNext();
    }
  }, [currentStoryIndex, stories.length, onNext]);

  // Timer management
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    startTimeRef.current = Date.now();

    if (!paused) {
      intervalRef.current = setInterval(() => {
        const elapsed = elapsedRef.current + (Date.now() - startTimeRef.current);
        const pct = Math.min((elapsed / DURATION) * 100, 100);
        setProgress(pct);
        if (pct >= 100) {
          clearInterval(intervalRef.current);
          advanceStory();
        }
      }, 16); // ~60fps for smoother progress bar
    }

    return () => clearInterval(intervalRef.current);
  }, [currentStoryIndex, storyGroup.id, paused]);

  const handlePause = (isPaused) => {
    if (isPaused) {
      elapsedRef.current += Date.now() - startTimeRef.current;
      clearInterval(intervalRef.current);
    } else {
      startTimeRef.current = Date.now();
    }
    setPaused(isPaused);
  };

  const goToStory = (index) => {
    setCurrentStoryIndex(index);
    setProgress(0);
    elapsedRef.current = 0;
  };

  const handleLeftClick = () => {
    if (currentStoryIndex > 0) {
      goToStory(currentStoryIndex - 1);
    } else {
      onPrev();
    }
  };

  const handleRightClick = () => {
    if (currentStoryIndex < stories.length - 1) {
      goToStory(currentStoryIndex + 1);
    } else {
      onNext();
    }
  };

  const handleDoubleTap = () => {
    setLiked(true);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  };

  const handleReply = (e) => {
    e.preventDefault();
    if (reply.trim()) setReply('');
  };

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') handleRightClick();
      if (e.key === 'ArrowLeft') handleLeftClick();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentStoryIndex]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#09090b] animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#09090b]/95 backdrop-blur-xl" onClick={onClose} />

      {/* Prev group button */}
      {groupIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 lg:left-8 z-20 hidden lg:flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors text-white shadow-xl"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Story Container */}
      <div
        className="relative w-full max-w-[420px] h-full lg:h-[92vh] lg:rounded-[2.5rem] overflow-hidden bg-black shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)]"
        style={{ maxHeight: '900px' }}
        onMouseDown={() => handlePause(true)}
        onMouseUp={() => handlePause(false)}
        onTouchStart={() => handlePause(true)}
        onTouchEnd={() => handlePause(false)}
        onDoubleClick={handleDoubleTap}
      >
        {/* Background Image with slight scale animation for active story */}
        <img
          key={currentStory?.image}
          src={currentStory?.image}
          alt="story"
          className="absolute inset-0 w-full h-full object-cover animate-image-pan"
        />

        {/* Gradient overlays for readability */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10 pt-safe">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden shadow-sm">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < currentStoryIndex ? '100%'
                    : i === currentStoryIndex ? `${progress}%`
                    : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 pt-safe">
          <div className="flex items-center gap-3">
            <div className={`p-[2px] rounded-full bg-gradient-to-tr ${storyGroup.gradient}`}>
              <div className="bg-black p-[2px] rounded-full">
                <img
                  src={storyGroup.user.avatar}
                  alt={storyGroup.user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 drop-shadow-md">
              <p className="text-white text-[15px] font-bold leading-tight">{storyGroup.user.name}</p>
              <p className="text-white/80 text-xs font-medium">
                {storyGroup.label} · {currentStoryIndex + 1}/{stories.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-white/80 hover:text-white transition-colors p-2 drop-shadow-md">
              <MoreHorizontal size={20} />
            </button>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full transition-colors p-2 drop-shadow-md">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation tap zones */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer outline-none"
          onClick={handleLeftClick}
        />
        <button
          className="absolute right-0 top-0 w-2/3 h-full z-10 cursor-pointer outline-none"
          onClick={handleRightClick}
        />

        {/* Double-tap heart animation */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <Heart size={100} className="text-white fill-white animate-bounce-subtle drop-shadow-2xl opacity-95" />
          </div>
        )}

        {/* Caption */}
        {currentStory?.caption && (
          <div className="absolute bottom-[92px] left-5 right-5 z-10 pointer-events-none">
            <p className="text-white text-[15px] font-medium leading-relaxed drop-shadow-xl text-center bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Reply bar */}
        <div className="absolute bottom-6 left-4 right-4 z-10 flex items-center gap-3 pb-safe">
          <form onSubmit={handleReply} className="flex-1 flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/30 rounded-full px-5 py-3 transition-colors focus-within:bg-black/60 focus-within:border-white/60">
            <input
              type="text"
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder={`Reply to ${storyGroup.user.name.split(' ')[0]}...`}
              className="flex-1 bg-transparent text-white placeholder-white/70 text-[15px] outline-none font-medium"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            />
            {reply.trim() && (
              <button type="submit" className="text-white font-bold text-sm bg-brand-600 px-3 py-1 rounded-full">
                Send
              </button>
            )}
          </form>
          <button
            onClick={(e) => { e.stopPropagation(); setLiked(l => !l); }}
            className={`p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/30 transition-colors ${liked ? 'text-red-500 border-red-500/50' : 'text-white'}`}
          >
            <Heart size={24} className={liked ? 'fill-current' : ''} />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/30 transition-colors text-white"
          >
            <Send size={24} className="-ml-0.5" />
          </button>
        </div>
      </div>

      {/* Next group button */}
      {groupIndex < totalGroups - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 lg:right-8 z-20 hidden lg:flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors text-white shadow-xl"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}
