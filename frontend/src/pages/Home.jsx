import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Welcome to Swish</h1>
        <p>Your private social sharing platform for campus communities</p>
        <p className="subtitle">Connect, share, and engage with your campus community</p>
      </div>
      
      <div className="features">
        <div className="feature-card">
          <h3>🎓 Campus-Only</h3>
          <p>Exclusive access for verified campus members</p>
        </div>
        <div className="feature-card">
          <h3>🔒 Private & Secure</h3>
          <p>Your content stays within your community</p>
        </div>
        <div className="feature-card">
          <h3>💬 Real-time Updates</h3>
          <p>Stay connected with instant notifications</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
