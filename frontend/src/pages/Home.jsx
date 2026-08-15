import React, { useState } from 'react';
import PostCard from '../components/social/PostCard';
import CreatePost from '../components/social/CreatePost';
import EventCard from '../components/common/EventCard';
import { mockPosts, mockCurrentUser, mockEvents } from '../data/mockData';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import './Home.css';

const Home = () => {
  const [posts, setPosts] = useState(mockPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const handleNewPost = (postData) => {
    const newPost = {
      id: posts.length + 1,
      user: mockCurrentUser,
      image: postData.image,
      caption: postData.content,
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isSaved: false,
      timestamp: 'Just now',
      location: null
    };
    setPosts([newPost, ...posts]);
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

  const handleJoinEvent = (eventId) => {
    console.log('Join event:', eventId);
  };

  const handleInterestedEvent = (eventId) => {
    console.log('Interested in event:', eventId);
  };

  const loadMorePosts = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPage(page + 1);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="home">
      <div className="home__container">
        <div className="home__content">
          <div className="home__main">
            <CreatePost currentUser={mockCurrentUser} onPost={handleNewPost} />
            
            {/* Campus Events Section */}
            <div className="home__section">
              <div className="home__section-header">
                <h2 className="home__section-title">Campus Events</h2>
                <button className="home__section-link">View All</button>
              </div>
              <div className="home__events">
                {mockEvents.slice(0, 3).map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onJoin={handleJoinEvent}
                    onInterested={handleInterestedEvent}
                  />
                ))}
              </div>
            </div>

            {/* Feed Section */}
            <div className="home__section">
              <div className="home__section-header">
                <h2 className="home__section-title">Your Feed</h2>
                <div className="home__feed-tabs">
                  <button className="home__feed-tab home__feed-tab--active">Recent</button>
                  <button className="home__feed-tab">Popular</button>
                  <button className="home__feed-tab">Following</button>
                </div>
              </div>
              
              {posts.length === 0 ? (
                <EmptyState
                  icon={
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  }
                  title="No posts yet"
                  description="Be the first to share something with your campus community!"
                />
              ) : (
                <>
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
                  
                  {isLoading && (
                    <div className="home__loading">
                      <LoadingSkeleton variant="card" height={400} />
                    </div>
                  )}
                  
                  {!isLoading && (
                    <button 
                      className="home__load-more"
                      onClick={loadMorePosts}
                    >
                      Load More Posts
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <aside className="home__sidebar">
            <div className="home__sidebar-section">
              <h3 className="home__sidebar-title">Suggested for you</h3>
              <div className="home__suggestions">
                {[
                  { name: 'Campus Events', username: 'campus_events', avatar: 'https://i.pravatar.cc/150?img=10' },
                  { name: 'Study Group', username: 'study_group', avatar: 'https://i.pravatar.cc/150?img=11' },
                  { name: 'Sports Club', username: 'sports_club', avatar: 'https://i.pravatar.cc/150?img=12' }
                ].map((suggestion, index) => (
                  <div key={index} className="home__suggestion">
                    <div className="home__suggestion-avatar">
                      <img src={suggestion.avatar} alt={suggestion.name} />
                    </div>
                    <div className="home__suggestion-info">
                      <div className="home__suggestion-name">{suggestion.name}</div>
                      <div className="home__suggestion-username">@{suggestion.username}</div>
                    </div>
                    <button className="home__suggestion-follow">Follow</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="home__sidebar-section">
              <h3 className="home__sidebar-title">Trending Topics</h3>
              <div className="home__trending">
                {[
                  { tag: '#CampusLife', posts: '2.3k posts' },
                  { tag: '#Hackathon2024', posts: '1.8k posts' },
                  { tag: '#FinalsWeek', posts: '1.2k posts' },
                  { tag: '#SportsDay', posts: '956 posts' }
                ].map((trend, index) => (
                  <div key={index} className="home__trend">
                    <div className="home__trend-tag">{trend.tag}</div>
                    <div className="home__trend-posts">{trend.posts}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Home;