import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PostCard from '../components/social/PostCard';
import { mockCurrentUser, mockPosts } from '../data/mockData';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import './Profile.css';

const Profile = ({ userId }) => {
  const [user, setUser] = useState(mockCurrentUser);
  const [posts, setPosts] = useState(mockPosts.filter(post => post.user.id === user.id));
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'posts', label: 'Posts', count: user.postsCount },
    { id: 'photos', label: 'Photos', count: Math.floor(user.postsCount * 0.8) },
    { id: 'likes', label: 'Likes', count: Math.floor(user.postsCount * 1.5) }
  ];

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    setUser(prev => ({
      ...prev,
      followers: isFollowing ? prev.followers - 1 : prev.followers + 1
    }));
  };

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const handleComment = (postId) => {
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId) => {
    console.log('Share post:', postId);
  };

  const handleSave = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isSaved: !post.isSaved }
        : post
    ));
  };

  return (
    <div className="profile">
      <div className="profile__container">
        {/* Profile Header */}
        <div className="profile__cover">
          <div className="profile__cover-image" />
          <div className="profile__avatar-section">
            <Avatar
              src={user.avatar}
              username={user.name}
              size="xxlarge"
              showStatus
              status="online"
            />
          </div>
        </div>

        <Card className="profile__header" padding="large">
          <div className="profile__header-content">
            <div className="profile__info">
              <div className="profile__name-row">
                <h1 className="profile__name">
                  {user.name}
                  {user.isVerified && (
                    <span className="profile__verified">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </span>
                  )}
                </h1>
                <div className="profile__actions">
                  <Link to="/edit-profile">
                    <Button variant="outline" size="small">
                      Edit Profile
                    </Button>
                  </Link>
                  <Button
                    variant={isFollowing ? 'outline' : 'primary'}
                    size="small"
                    onClick={handleFollow}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              </div>

              <div className="profile__username">@{user.username}</div>

              <p className="profile__bio">{user.bio}</p>

              <div className="profile__meta">
                <span className="profile__meta-item">
                  <strong>{user.department}</strong>
                </span>
                <span className="profile__meta-separator">•</span>
                <span className="profile__meta-item">{user.year}</span>
                <span className="profile__meta-separator">•</span>
                <span className="profile__meta-item">Joined {user.joinedDate}</span>
              </div>

              <div className="profile__stats">
                <div className="profile__stat">
                  <span className="profile__stat-value">{user.postsCount}</span>
                  <span className="profile__stat-label">posts</span>
                </div>
                <div className="profile__stat">
                  <span className="profile__stat-value">{user.followers}</span>
                  <span className="profile__stat-label">followers</span>
                </div>
                <div className="profile__stat">
                  <span className="profile__stat-value">{user.following}</span>
                  <span className="profile__stat-label">following</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Tabs */}
        <div className="profile__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`profile__tab ${activeTab === tab.id ? 'profile__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className="profile__tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Profile Content */}
        <div className="profile__content">
          {activeTab === 'posts' && (
            <div className="profile__posts">
              {isLoading ? (
                <div className="profile__loading">
                  <LoadingSkeleton variant="card" height={400} count={3} />
                </div>
              ) : posts.length === 0 ? (
                <EmptyState
                  icon={
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  }
                  title="No posts yet"
                  description="When you post, they'll appear here"
                />
              ) : (
                <div className="profile__posts-list">
                  {posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={handleLike}
                      onComment={handleComment}
                      onShare={handleShare}
                      onSave={handleSave}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="profile__photos-grid">
              {posts.map(post => (
                <div key={post.id} className="profile__photo-item">
                  <img src={post.image} alt={post.caption} />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'likes' && (
            <div className="profile__likes">
              <EmptyState
                icon={
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                }
                title="Liked posts"
                description="Posts you've liked will appear here"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;