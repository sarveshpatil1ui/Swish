import React from 'react';
import './Avatar.css';

const Avatar = ({
  src,
  alt = 'User avatar',
  size = 'medium',
  username = '',
  showStatus = false,
  status = 'online',
  className = '',
  onClick
}) => {
  const avatarClasses = [
    'avatar',
    `avatar--${size}`,
    showStatus && 'avatar--with-status',
    onClick && 'avatar--clickable',
    className
  ].filter(Boolean).join(' ');

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <div className={avatarClasses} onClick={handleClick}>
      {src ? (
        <img src={src} alt={alt} className="avatar-image" />
      ) : (
        <div className="avatar-fallback">
          {getInitials(username)}
        </div>
      )}
      {showStatus && (
        <span className={`avatar-status avatar-status--${status}`} />
      )}
    </div>
  );
};

export default Avatar;