import React, { useState } from 'react';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import './PostCard.css';

const PostCard = ({ post, onLike, onComment, onShare, onSave }) => {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [likeCount, setLikeCount] = useState(post.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    if (onLike) onLike(post.id);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    if (onSave) onSave(post.id);
  };

  const handleComment = () => {
    if (onComment) onComment(post.id);
  };

  const handleShare = () => {
    if (onShare) onShare(post.id);
  };

  return (
    <Card className="post-card" padding="none">
      {/* Post Header */}
      <div className="post-card__header">
        <div className="post-card__user">
          <Avatar
            src={post.user.avatar}
            username={post.user.name}
            size="medium"
          />
          <div className="post-card__user-info">
            <div className="post-card__username">
              {post.user.name}
              {post.user.isVerified && (
                <span className="post-card__verified">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </span>
              )}
            </div>
            <div className="post-card__meta">
              {post.user.department} • {post.user.year}
            </div>
          </div>
        </div>
        <button className="post-card__more" aria-label="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>

      {/* Post Image */}
      {post.image && (
        <div className="post-card__image">
          <img src={post.image} alt={post.caption} loading="lazy" />
        </div>
      )}

      {/* Post Actions */}
      <div className="post-card__actions">
        <div className="post-card__actions-left">
          <button
            className={`post-card__action ${isLiked ? 'post-card__action--liked' : ''}`}
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button
            className="post-card__action"
            onClick={handleComment}
            aria-label="Comment"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </button>
          <button
            className="post-card__action"
            onClick={handleShare}
            aria-label="Share"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <button
          className={`post-card__action ${isSaved ? 'post-card__action--saved' : ''}`}
          onClick={handleSave}
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      {/* Post Stats */}
      <div className="post-card__stats">
        <span className="post-card__likes">{likeCount} likes</span>
        <span className="post-card__time">{post.timestamp}</span>
      </div>

      {/* Post Caption */}
      {post.caption && (
        <div className="post-card__caption">
          <span className="post-card__caption-username">{post.user.username}</span>
          <span className="post-card__caption-text">{post.caption}</span>
        </div>
      )}

      {/* Post Location */}
      {post.location && (
        <div className="post-card__location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {post.location}
        </div>
      )}
    </Card>
  );
};

export default PostCard;