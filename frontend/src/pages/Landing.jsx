import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing__navbar">
        <div className="landing__navbar-container">
          <div className="landing__navbar-brand">
            <span className="landing__navbar-logo">Swish</span>
          </div>
          <div className="landing__navbar-links">
            <Link to="/login" className="landing__navbar-link">Sign In</Link>
            <Link to="/register">
              <Button variant="primary" size="small">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing__hero">
        <div className="landing__hero-bg">
          <div className="landing__hero-gradient"></div>
          <div className="landing__hero-particles"></div>
          <div className="landing__hero-grid"></div>
          <div className="landing__hero-orb landing__hero-orb--1"></div>
          <div className="landing__hero-orb landing__hero-orb--2"></div>
          <div className="landing__hero-orb landing__hero-orb--3"></div>
          <div className="landing__hero-lines"></div>
          <div className="landing__hero-noise"></div>
          <div className="landing__hero-glow"></div>
        </div>
        
        <div className="landing__hero-container">
          <div className="landing__hero-content">
            <h1 className="landing__hero-title">
              Your Campus.
              <br />
              <span className="landing__hero-highlight">Your Community.</span>
            </h1>
            <p className="landing__hero-subtitle">
              Connect with students, discover events, and build your campus life — all in one place.
            </p>
            <div className="landing__hero-cta">
              <Link to="/register">
                <Button variant="primary" size="large">
                  Get Started
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="glass" size="large">
                  Explore Swish
                </Button>
              </Link>
            </div>
          </div>

          <div className="landing__hero-visual">
            {/* Floating UI Cards */}
            <div className="landing__floating-card landing__floating-card--like">
              <div className="landing__card-avatar">
                <img src="https://i.pravatar.cc/150?img=1" alt="User" />
              </div>
              <div className="landing__card-content">
                <span className="landing__card-name">Priya liked your post</span>
                <span className="landing__card-time">2m ago</span>
              </div>
              <div className="landing__card-icon">❤️</div>
            </div>

            <div className="landing__floating-card landing__floating-card--follow">
              <div className="landing__card-avatar">
                <img src="https://i.pravatar.cc/150?img=2" alt="User" />
              </div>
              <div className="landing__card-content">
                <span className="landing__card-name">Rahul started following you</span>
                <span className="landing__card-time">5m ago</span>
              </div>
              <div className="landing__card-icon">👤</div>
            </div>

            <div className="landing__floating-card landing__floating-card--event">
              <div className="landing__event-date">
                <span className="landing__event-month">SEP</span>
                <span className="landing__event-day">15</span>
              </div>
              <div className="landing__card-content">
                <span className="landing__card-name">Campus Tech Fest</span>
                <span className="landing__card-time">Main Auditorium</span>
              </div>
              <div className="landing__card-icon">�</div>
            </div>

            <div className="landing__floating-card landing__floating-card--profile">
              <div className="landing__card-avatar">
                <img src="https://i.pravatar.cc/150?img=3" alt="User" />
              </div>
              <div className="landing__card-content">
                <span className="landing__card-name">Ananya Patel</span>
                <span className="landing__card-time">CS • 3rd Year</span>
              </div>
              <div className="landing__card-icon">✓</div>
            </div>

            {/* Main Campus Visual */}
            <div className="landing__campus-visual">
              <div className="landing__campus-image">
                <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800" alt="Campus" />
              </div>
              <div className="landing__campus-overlay"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="landing__stats">
        <div className="landing__stats-container">
          <div className="landing__stat-card">
            <div className="landing__stat-number">10K+</div>
            <div className="landing__stat-label">Campus Students</div>
            <div className="landing__stat-icon">👥</div>
          </div>
          <div className="landing__stat-card">
            <div className="landing__stat-number">200+</div>
            <div className="landing__stat-label">Campus Clubs</div>
            <div className="landing__stat-icon">🏫</div>
          </div>
          <div className="landing__stat-card">
            <div className="landing__stat-number">50+</div>
            <div className="landing__stat-label">Events</div>
            <div className="landing__stat-icon">📅</div>
          </div>
          <div className="landing__stat-card">
            <div className="landing__stat-number">25+</div>
            <div className="landing__stat-label">Communities</div>
            <div className="landing__stat-icon">🌟</div>
          </div>
        </div>
      </section>

      {/* Why Swish */}
      <section className="landing__why">
        <div className="landing__why-container">
          <div className="landing__section-header">
            <h2 className="landing__section-title">Why Swish?</h2>
            <p className="landing__section-subtitle">Built exclusively for campus communities</p>
          </div>
          <div className="landing__why-grid">
            <div className="landing__why-card">
              <div className="landing__why-icon">🎓</div>
              <h3 className="landing__why-title">Campus Only</h3>
              <p className="landing__why-desc">Verified students only. Your community, your rules.</p>
            </div>
            <div className="landing__why-card">
              <div className="landing__why-icon">🔒</div>
              <h3 className="landing__why-title">Private & Secure</h3>
              <p className="landing__why-desc">Your data stays within your campus network.</p>
            </div>
            <div className="landing__why-card">
              <div className="landing__why-icon">🎉</div>
              <h3 className="landing__why-title">Discover Events</h3>
              <p className="landing__why-desc">Never miss campus activities and gatherings.</p>
            </div>
            <div className="landing__why-card">
              <div className="landing__why-icon">👥</div>
              <h3 className="landing__why-title">Find Your People</h3>
              <p className="landing__why-desc">Connect with students who share your interests.</p>
            </div>
            <div className="landing__why-card">
              <div className="landing__why-icon">📱</div>
              <h3 className="landing__why-title">Campus Life</h3>
              <p className="landing__why-desc">Share moments, achievements, and memories.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing__how">
        <div className="landing__how-container">
          <div className="landing__section-header">
            <h2 className="landing__section-title">How Swish Works</h2>
            <p className="landing__section-subtitle">Start connecting in 3 simple steps</p>
          </div>
          <div className="landing__how-steps">
            <div className="landing__how-step">
              <div className="landing__step-number">01</div>
              <h3 className="landing__step-title">Join Your Campus</h3>
              <p className="landing__step-desc">Sign up with your campus email to get verified</p>
            </div>
            <div className="landing__how-connector"></div>
            <div className="landing__how-step">
              <div className="landing__step-number">02</div>
              <h3 className="landing__step-title">Share & Connect</h3>
              <p className="landing__step-desc">Post updates, join groups, and follow classmates</p>
            </div>
            <div className="landing__how-connector"></div>
            <div className="landing__how-step">
              <div className="landing__step-number">03</div>
              <h3 className="landing__step-title">Discover & Engage</h3>
              <p className="landing__step-desc">Find events, make friends, and build your network</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Preview */}
      <section className="landing__preview">
        <div className="landing__preview-container">
          <div className="landing__preview-content">
            <h2 className="landing__preview-title">See Swish in Action</h2>
            <p className="landing__preview-subtitle">A glimpse of your campus social experience</p>
          </div>
          <div className="landing__social-card">
            <div className="landing__social-header">
              <div className="landing__social-avatar">
                <img src="https://i.pravatar.cc/150?img=4" alt="User" />
              </div>
              <div className="landing__social-info">
                <span className="landing__social-name">Campus Events</span>
                <span className="landing__social-time">2 hours ago</span>
              </div>
            </div>
            <div className="landing__social-image">
              <img src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600" alt="Event" />
            </div>
            <div className="landing__social-caption">
              🎉 Tech Fest 2024 was incredible! Thanks to everyone who participated. See you next year! #CampusLife #TechFest
            </div>
            <div className="landing__social-actions">
              <div className="landing__social-action">
                <span>❤️</span>
                <span>234</span>
              </div>
              <div className="landing__social-action">
                <span>💬</span>
                <span>45</span>
              </div>
              <div className="landing__social-action">
                <span>📤</span>
                <span>12</span>
              </div>
              <div className="landing__social-action">
                <span>🔖</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing__cta">
        <div className="landing__cta-container">
          <h2 className="landing__cta-title">Ready to Join Your Campus?</h2>
          <p className="landing__cta-subtitle">Join 10,000+ students already connecting on Swish</p>
          <Link to="/register">
            <Button variant="primary" size="large">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <div className="landing__footer-container">
          <div className="landing__footer-brand">
            <span className="landing__footer-logo">Swish</span>
            <p>Your private campus social network</p>
          </div>
          <div className="landing__footer-links">
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
          <p className="landing__footer-copy">&copy; 2024 Swish. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;