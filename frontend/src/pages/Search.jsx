import React, { useState } from 'react';
import SearchBar from '../components/common/SearchBar';
import Card from '../components/common/Card';
import UserCard from '../components/social/UserCard';
import PostCard from '../components/social/PostCard';
import { mockPosts, mockUsers, mockDepartments } from '../data/mockData';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import './Search.css';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState(['hackathon', 'campus events', 'study group']);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'users', label: 'Users' },
    { id: 'posts', label: 'Posts' },
    { id: 'departments', label: 'Departments' }
  ];

  const handleSearch = (query) => {
    setSearchQuery(query);
    setIsLoading(true);
    // Simulate search
    setTimeout(() => setIsLoading(false), 500);
    
    // Add to search history if not empty and not already in history
    if (query && !searchHistory.includes(query)) {
      setSearchHistory([query, ...searchHistory.slice(0, 4)]);
    }
  };

  const filteredUsers = searchQuery
    ? mockUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredPosts = searchQuery
    ? mockPosts.filter(post => 
        post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredDepartments = searchQuery
    ? mockDepartments.filter(dept => 
        dept.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const allResults = [
    ...filteredUsers.map(user => ({ type: 'user', data: user })),
    ...filteredPosts.map(post => ({ type: 'post', data: post })),
    ...filteredDepartments.map(dept => ({ type: 'department', data: dept }))
  ];

  return (
    <div className="search">
      <div className="search__container">
        {/* Search Header */}
        <div className="search__header">
          <h1 className="search__title">Search</h1>
          <SearchBar
            placeholder="Search users, posts, departments..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            autoFocus
          />
        </div>

        {/* Search History */}
        {!searchQuery && searchHistory.length > 0 && (
          <div className="search__history">
            <h3 className="search__history-title">Recent Searches</h3>
            <div className="search__history-list">
              {searchHistory.map((term, index) => (
                <button
                  key={index}
                  className="search__history-item"
                  onClick={() => handleSearch(term)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        {searchQuery && (
          <div className="search__tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`search__tab ${activeTab === tab.id ? 'search__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'all' && <span className="search__tab-count">{allResults.length}</span>}
                {tab.id === 'users' && <span className="search__tab-count">{filteredUsers.length}</span>}
                {tab.id === 'posts' && <span className="search__tab-count">{filteredPosts.length}</span>}
                {tab.id === 'departments' && <span className="search__tab-count">{filteredDepartments.length}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {searchQuery && (
          <div className="search__results">
            {isLoading ? (
              <div className="search__loading">
                <LoadingSkeleton variant="card" height={80} count={5} />
              </div>
            ) : allResults.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                }
                title="No results found"
                description="Try different keywords or check your spelling"
              />
            ) : (
              <>
                {activeTab === 'all' && (
                  <div className="search__all-results">
                    {allResults.map((result, index) => (
                      <div key={index} className="search__result-item">
                        {result.type === 'user' && (
                          <UserCard
                            user={result.data}
                            onViewProfile={(user) => console.log('View profile:', user)}
                          />
                        )}
                        {result.type === 'post' && (
                          <PostCard post={result.data} />
                        )}
                        {result.type === 'department' && (
                          <Card className="search__department-result" padding="medium" hover>
                            <div className="search__department-info">
                              <h3 className="search__department-name">{result.data}</h3>
                              <p className="search__department-count">
                                {mockUsers.filter(u => u.department === result.data).length} students
                              </p>
                            </div>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="search__users-grid">
                    {filteredUsers.length === 0 ? (
                      <EmptyState
                        title="No users found"
                        description="Try a different search term"
                      />
                    ) : (
                      filteredUsers.map(user => (
                        <UserCard
                          key={user.id}
                          user={user}
                          onViewProfile={(user) => console.log('View profile:', user)}
                        />
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div className="search__posts-list">
                    {filteredPosts.length === 0 ? (
                      <EmptyState
                        title="No posts found"
                        description="Try a different search term"
                      />
                    ) : (
                      filteredPosts.map(post => (
                        <div key={post.id} className="search__post-item">
                          <PostCard post={post} />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'departments' && (
                  <div className="search__departments-list">
                    {filteredDepartments.length === 0 ? (
                      <EmptyState
                        title="No departments found"
                        description="Try a different search term"
                      />
                    ) : (
                      filteredDepartments.map(dept => (
                        <Card key={dept} className="search__department-card" padding="medium" hover>
                          <div className="search__department-info">
                            <h3 className="search__department-name">{dept}</h3>
                            <p className="search__department-count">
                              {mockUsers.filter(u => u.department === dept).length} students
                            </p>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && (
          <div className="search__initial">
            <div className="search__suggestions">
              <h3 className="search__suggestions-title">Popular Searches</h3>
              <div className="search__suggestions-list">
                {['Hackathon 2024', 'Campus Events', 'Study Groups', 'Sports', 'Clubs'].map((suggestion, index) => (
                  <button
                    key={index}
                    className="search__suggestion-item"
                    onClick={() => handleSearch(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;