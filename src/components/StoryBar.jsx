import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { mockStories } from '../data/mockData';
import { useApp } from '../context/AppContext';
import StoryViewer from './StoryViewer';

export default function StoryBar() {
  const { me } = useApp();
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // index into mockStories
  const [viewedStories, setViewedStories] = useState(new Set());

  const openStory = (index) => {
    setActiveStoryGroup(index);
  };

  const closeStory = () => {
    if (activeStoryGroup !== null) {
      setViewedStories(v => new Set([...v, mockStories[activeStoryGroup].id]));
    }
    setActiveStoryGroup(null);
  };

  const goNext = () => {
    if (activeStoryGroup !== null && activeStoryGroup < mockStories.length - 1) {
      setViewedStories(v => new Set([...v, mockStories[activeStoryGroup].id]));
      setActiveStoryGroup(i => i + 1);
    } else {
      closeStory();
    }
  };

  const goPrev = () => {
    if (activeStoryGroup !== null && activeStoryGroup > 0) {
      setActiveStoryGroup(i => i - 1);
    }
  };

  return (
    <>
      <div className="card sm:rounded-2xl border-x-0 sm:border-x border-y sm:border-y border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        <div className="flex items-center gap-4 px-4 py-4 overflow-x-auto scrollbar-none snap-x snap-mandatory">
          {/* Add your story */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group snap-start pl-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-[2px] bg-slate-200 dark:bg-slate-800 transition-transform duration-300 group-hover:scale-105">
                <div className="w-full h-full rounded-full border-[3px] border-white dark:border-slate-900 overflow-hidden">
                  <img
                    src={me.avatar}
                    alt="Your story"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md transform transition-transform group-hover:scale-110">
                <Plus size={14} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium text-center leading-tight w-16 truncate">
              Your story
            </span>
          </div>

          {/* Story separator */}
          <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 flex-shrink-0 mx-1" />

          {/* Story groups */}
          {mockStories.map((group, index) => {
            const isViewed = viewedStories.has(group.id);
            return (
              <div
                key={group.id}
                className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group snap-start"
                onClick={() => openStory(index)}
              >
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full p-[2.5px] transition-all duration-300 group-hover:scale-105 ${
                    isViewed 
                      ? 'bg-slate-200 dark:bg-slate-700' 
                      : `bg-gradient-to-tr ${group.gradient}`
                  }`}>
                    <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-white dark:bg-slate-900">
                      <img
                        src={group.user.avatar}
                        alt={group.user.name}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!isViewed ? 'p-0.5 rounded-full' : ''}`}
                      />
                    </div>
                  </div>
                  {/* Live/Unread indicator */}
                  {!isViewed && (
                    <div className="absolute -top-1 right-0 w-4 h-4 bg-brand-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
                  )}
                </div>
                <span className={`text-xs font-semibold text-center leading-tight w-16 truncate ${isViewed ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                  {group.user.name.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story Viewer */}
      {activeStoryGroup !== null && (
        <StoryViewer
          storyGroup={mockStories[activeStoryGroup]}
          groupIndex={activeStoryGroup}
          totalGroups={mockStories.length}
          onClose={closeStory}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
    </>
  );
}
