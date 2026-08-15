import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import StatCard from '../components/common/StatCard';
import { mockAdminStats, mockReportedPosts, mockUsers } from '../data/mockData';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import './Admin.css';

const Admin = () => {
  const [stats, setStats] = useState(mockAdminStats);
  const [reportedPosts, setReportedPosts] = useState(mockReportedPosts);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'overview' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' }
  ];

  const getTabIcon = (iconName) => {
    const icons = {
      overview: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
      users: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      reports: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      analytics: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      )
    };
    return icons[iconName] || null;
  };

  const handleRemovePost = (reportId) => {
    setReportedPosts(reportedPosts.map(report =>
      report.id === reportId ? { ...report, status: 'resolved' } : report
    ));
  };

  const handleDismissReport = (reportId) => {
    setReportedPosts(reportedPosts.filter(report => report.id !== reportId));
  };

  return (
    <div className="admin">
      <div className="admin__container">
        <div className="admin__header">
          <h1 className="admin__title">Admin Dashboard</h1>
          <div className="admin__header-actions">
            <Button variant="outline" size="small">Export Data</Button>
            <Button variant="primary" size="small">Settings</Button>
          </div>
        </div>

        <div className="admin__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`admin__tab ${selectedTab === tab.id ? 'admin__tab--active' : ''}`}
              onClick={() => setSelectedTab(tab.id)}
            >
              <span className="admin__tab-icon">{getTabIcon(tab.icon)}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="admin__content">
          {selectedTab === 'overview' && (
            <div className="admin__overview">
              <div className="admin__stats-grid">
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  change={12}
                  color="#6366f1"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                  }
                />
                <StatCard
                  title="Total Posts"
                  value={stats.totalPosts.toLocaleString()}
                  change={8}
                  color="#10b981"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  }
                />
                <StatCard
                  title="Active Users"
                  value={stats.activeUsers.toLocaleString()}
                  change={15}
                  color="#f59e0b"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  }
                />
                <StatCard
                  title="Reported Posts"
                  value={stats.reportedPosts}
                  change={-5}
                  color="#ef4444"
                  icon={
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  }
                />
              </div>

              <Card className="admin__recent-activity" padding="large">
                <h3 className="admin__section-title">Recent Activity</h3>
                <div className="admin__activity-list">
                  {[
                    { action: 'New user registration', user: 'John Doe', time: '2 minutes ago' },
                    { action: 'Post reported', user: 'Jane Smith', time: '15 minutes ago' },
                    { action: 'Account verified', user: 'Bob Johnson', time: '1 hour ago' },
                    { action: 'Post removed', user: 'Admin', time: '2 hours ago' }
                  ].map((activity, index) => (
                    <div key={index} className="admin__activity-item">
                      <div className="admin__activity-info">
                        <div className="admin__activity-action">{activity.action}</div>
                        <div className="admin__activity-user">{activity.user}</div>
                      </div>
                      <div className="admin__activity-time">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {selectedTab === 'users' && (
            <Card className="admin__users-table" padding="large">
              <h3 className="admin__section-title">User Management</h3>
              <div className="admin__table-container">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Department</th>
                      <th>Posts</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockUsers.slice(0, 5).map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="admin__table-user">
                            <Avatar src={user.avatar} username={user.name} size="small" />
                            <div>
                              <div className="admin__table-name">{user.name}</div>
                              <div className="admin__table-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{user.department}</td>
                        <td>{user.postsCount}</td>
                        <td>
                          <span className="admin__status admin__status--active">Active</span>
                        </td>
                        <td>
                          <div className="admin__table-actions">
                            <Button variant="ghost" size="small">Edit</Button>
                            <Button variant="danger" size="small">Ban</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {selectedTab === 'reports' && (
            <div className="admin__reports">
              <h3 className="admin__section-title">Report Management</h3>
              {reportedPosts.length === 0 ? (
                <EmptyState
                  icon={
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  }
                  title="No pending reports"
                  description="All reports have been resolved"
                />
              ) : (
                <div className="admin__reports-list">
                  {reportedPosts.map(report => (
                    <Card key={report.id} className="admin__report-card" padding="medium">
                      <div className="admin__report-header">
                        <div className="admin__report-info">
                          <span className="admin__report-reason">{report.reason}</span>
                          <span className="admin__report-time">{report.timestamp}</span>
                        </div>
                        <span className={`admin__report-status admin__report-status--${report.status}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="admin__report-content">
                        <div className="admin__report-post">
                          <img src={report.post.image} alt="Reported post" />
                        </div>
                        <div className="admin__report-details">
                          <div className="admin__report-reported-by">
                            Reported by: {report.reportedBy.name}
                          </div>
                          <div className="admin__report-post-caption">
                            {report.post.caption}
                          </div>
                        </div>
                      </div>
                      {report.status === 'pending' && (
                        <div className="admin__report-actions">
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleRemovePost(report.id)}
                          >
                            Remove Post
                          </Button>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleDismissReport(report.id)}
                          >
                            Dismiss Report
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="admin__analytics">
              <Card className="admin__analytics-card" padding="large">
                <h3 className="admin__section-title">Platform Analytics</h3>
                <EmptyState
                  icon={
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  }
                  title="Analytics Dashboard"
                  description="Detailed analytics and insights will be available here"
                />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;