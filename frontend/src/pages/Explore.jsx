import React, { useState } from 'react';
import SearchBar from '../components/common/SearchBar';
import Card from '../components/common/Card';
import UserCard from '../components/social/UserCard';
import PostCard from '../components/social/PostCard';
import { mockPosts, mockUsers, mockCategories } from '../data/mockData';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import './Explore.css';

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'posts', label: 'Posts' },
    { id: 'people', label: 'People' },
    { id: 'categories', label: 'Categories' }
  ];

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 500);
  };

  const filteredPosts = selectedCategory 
    ? mockPosts.filter(post => post.caption.toLowerCase().includes(selectedCategory.toLowerCase()))
    : mockPosts;

  const filteredUsers = searchQuery
    ? mockUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockUsers.slice(0, 5);

  return (
    <div className="explore">
      <div className="explore__container">
        <div className="explore__search">
          <SearchBar
            placeholder="Search posts, people, departments..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            autoFocus
          />
        </div>

        <div className="explore__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`explore__tab ${activeTab === tab.id ? 'explore__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'all' || activeTab === 'categories' ? (
          <div className="explore__categories">
            <h2 className="explore__section-title">Browse Categories</h2>
            <div className="explore__categories-grid">
              {mockCategories.map(category => (
                <Card
                  key={category.id}
                  className="explore__category-card"
                  padding="medium"
                  hover
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <div className="explore__category-icon">{category.icon}</div>
                  <div className="explore__category-name">{category.name}</div>
                  <div className="explore__category-count">{category.postCount} posts</div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'all' || activeTab === 'posts' ? (
          <div className="explore__posts">
            <div className="explore__section-header">
              <h2 className="explore__section-title">
                {selectedCategory ? `${selectedCategory} Posts` : 'Trending Posts'}
              </h2>
              {selectedCategory && (
                <button 
                  className="explore__clear-filter"
                  onClick={() => setSelectedCategory(null)}
                >
                  Clear filter
                </button>
              )}
            </div>
            
            {isLoading ? (
              <div className="explore__loading">
                <LoadingSkeleton variant="card" height={400} count={3} />
              </div>
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                }
                title="No posts found"
                description="Try adjusting your search or filter criteria"
              />
            ) : (
              <div className="explore__posts-grid">
                {filteredPosts.map(post => (
                  <div key={post.id} className="explore__post-item">
                    <PostCard post={post} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'all' || activeTab === 'people' ? (
          <div className="explore__people">
            <h2 className="explore__section-title">Popular People</h2>
            
            {isLoading ? (
              <div className="explore__loading">
                <LoadingSkeleton variant="card" height={200} count={3} />
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                }
                title="No people found"
                description="Try a different search term"
              />
            ) : (
              <div className="explore__people-grid">
                {filteredUsers.map(user => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onViewProfile={(user) => console.log('View profile:', user)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Explore;