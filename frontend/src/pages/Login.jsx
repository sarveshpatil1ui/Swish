import React from 'react';
import './Login.css';

function Login() {
  return (
    <div className="login">
      <div className="login-container">
        <h1>Login to Swish</h1>
        <p>Access your campus community</p>
        
        <form className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="your.email@campus.edu"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
        
        <p className="login-note">
          Authentication will be implemented in future modules
        </p>
      </div>
    </div>
  );
}

export default Login;
