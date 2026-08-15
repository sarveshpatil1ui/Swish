import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { mockDepartments, mockYears } from '../data/mockData';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    year: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (!formData.email.endsWith('.edu')) {
      newErrors.email = 'Please use your campus email (.edu)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    
    if (!formData.year) {
      newErrors.year = 'Year is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, navigate to home
    navigate('/home');
    
    setIsLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="register">
      <div className="register__container">
        <div className="register__header">
          <h1 className="register__title">Create Account</h1>
          <p className="register__subtitle">Join your campus community on Swish</p>
        </div>

        <Card className="register__card" padding="large">
          <form onSubmit={handleSubmit} className="register__form">
            <Input
              type="text"
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(value) => handleChange('name', value)}
              error={errors.name}
              required
            />

            <Input
              type="email"
              label="Campus Email"
              placeholder="your.email@campus.edu"
              value={formData.email}
              onChange={(value) => handleChange('email', value)}
              error={errors.email}
              required
            />

            <div className="register__form-row">
              <div className="register__form-group">
                <label className="register__label">Department</label>
                <select
                  className={`register__select ${errors.department ? 'register__select--error' : ''}`}
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                >
                  <option value="">Select department</option>
                  {mockDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && <span className="register__error">{errors.department}</span>}
              </div>

              <div className="register__form-group">
                <label className="register__label">Year</label>
                <select
                  className={`register__select ${errors.year ? 'register__select--error' : ''}`}
                  value={formData.year}
                  onChange={(e) => handleChange('year', e.target.value)}
                >
                  <option value="">Select year</option>
                  {mockYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.year && <span className="register__error">{errors.year}</span>}
              </div>
            </div>

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(value) => handleChange('password', value)}
              error={errors.password}
              required
            />

            <Input
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(value) => handleChange('confirmPassword', value)}
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={isLoading}
            >
              Create Account
            </Button>
          </form>

          <div className="register__divider">
            <span>or</span>
          </div>

          <div className="register__login">
            <p>Already have an account?</p>
            <Link to="/login">
              <Button variant="outline" size="large" fullWidth>
                Sign In
              </Button>
            </Link>
          </div>
        </Card>

        <div className="register__footer">
          <Link to="/" className="register__back">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;