import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { mockCurrentUser, mockDepartments, mockYears } from '../data/mockData';
import './EditProfile.css';

const EditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: mockCurrentUser.name,
    username: mockCurrentUser.username,
    email: mockCurrentUser.email,
    bio: mockCurrentUser.bio,
    department: mockCurrentUser.department,
    year: mockCurrentUser.year,
    avatar: mockCurrentUser.avatar
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
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
    
    // Navigate back to profile
    navigate('/profile');
    
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  return (
    <div className="edit-profile">
      <div className="edit-profile__container">
        <div className="edit-profile__header">
          <h1 className="edit-profile__title">Edit Profile</h1>
          <p className="edit-profile__subtitle">Update your profile information</p>
        </div>

        <Card className="edit-profile__card" padding="large">
          <form onSubmit={handleSubmit} className="edit-profile__form">
            {/* Avatar Upload */}
            <div className="edit-profile__avatar-section">
              <div className="edit-profile__avatar-upload">
                <Avatar
                  src={previewImage || formData.avatar}
                  username={formData.name}
                  size="xxlarge"
                />
                <label className="edit-profile__avatar-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Change Photo
                </label>
              </div>
            </div>

            {/* Basic Information */}
            <div className="edit-profile__section">
              <h3 className="edit-profile__section-title">Basic Information</h3>
              
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
                type="text"
                label="Username"
                placeholder="@johndoe"
                value={formData.username}
                onChange={(value) => handleChange('username', value)}
                error={errors.username}
                required
              />

              <Input
                type="email"
                label="Email"
                placeholder="your.email@campus.edu"
                value={formData.email}
                onChange={(value) => handleChange('email', value)}
                error={errors.email}
                required
              />
            </div>

            {/* Academic Information */}
            <div className="edit-profile__section">
              <h3 className="edit-profile__section-title">Academic Information</h3>
              
              <div className="edit-profile__form-row">
                <div className="edit-profile__form-group">
                  <label className="edit-profile__label">Department</label>
                  <select
                    className={`edit-profile__select ${errors.department ? 'edit-profile__select--error' : ''}`}
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                  >
                    <option value="">Select department</option>
                    {mockDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <span className="edit-profile__error">{errors.department}</span>}
                </div>

                <div className="edit-profile__form-group">
                  <label className="edit-profile__label">Year</label>
                  <select
                    className={`edit-profile__select ${errors.year ? 'edit-profile__select--error' : ''}`}
                    value={formData.year}
                    onChange={(e) => handleChange('year', e.target.value)}
                  >
                    <option value="">Select year</option>
                    {mockYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  {errors.year && <span className="edit-profile__error">{errors.year}</span>}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="edit-profile__section">
              <h3 className="edit-profile__section-title">About</h3>
              
              <div className="edit-profile__form-group">
                <label className="edit-profile__label">Bio</label>
                <textarea
                  className="edit-profile__textarea"
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <div className="edit-profile__char-count">
                  {formData.bio.length}/500
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="edit-profile__actions">
              <Button
                type="button"
                variant="outline"
                size="large"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                loading={isLoading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EditProfile;