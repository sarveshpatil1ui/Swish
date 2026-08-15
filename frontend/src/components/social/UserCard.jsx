import React from 'react';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import './UserCard.css';

const UserCard = ({ user, onFollow, onUnfollow, onViewProfile }) => {
  const handleFollowClick = () => {
    if (user.isFollowing) {
      if (onUnfollow) onUnfollow(user.id);
    } else {
      if (onFollow) onFollow(user.id);
    }
  };

  return (
    <Card className="user-card" padding="medium" hover>
      <div className="user-card__content">
        <Avatar
          src={user.avatar}
          username={user.name}
          size="large"
          onClick={() => onViewProfile && onViewProfile(user)}
        />
        <div className="user-card__info">
          <div className="user-card__name">
            {user.name}
            {user.isVerified && (
              <span className="user-card__verified">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </span>
            )}
          </div>
          <div className="user-card__username">@{user.username}</div>
          <div className="user-card__meta">
            {user.department} • {user.year}
          </div>
          <div className="user-card__stats">
            <span><strong>{user.followers}</strong> followers</span>
            <span><strong>{user.following}</strong> following</span>
          </div>
        </div>
      </div>
      <Button
        variant={user.isFollowing ? 'outline' : 'primary'}
        size="small"
        onClick={handleFollowClick}
        fullWidth
      >
        {user.isFollowing ? 'Following' : 'Follow'}
      </Button>
    </Card>
  );
};

export default UserCard;