import React, { useState } from 'react';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import './CreatePost.css';

const CreatePost = ({ onPost, currentUser }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (onPost) {
      onPost({
        content,
        image
      });
    }
    
    setContent('');
    setImage(null);
    setIsSubmitting(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="create-post" padding="medium">
      <form onSubmit={handleSubmit}>
        <div className="create-post__header">
          <Avatar
            src={currentUser?.avatar}
            username={currentUser?.name}
            size="medium"
          />
          <textarea
            className="create-post__input"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
        </div>
        
        {image && (
          <div className="create-post__image-preview">
            <img src={image} alt="Preview" />
            <button
              type="button"
              className="create-post__remove-image"
              onClick={() => setImage(null)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="create-post__actions">
          <div className="create-post__action-buttons">
            <label className="create-post__action-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            size="small"
            disabled={!content.trim() && !image}
            loading={isSubmitting}
          >
            Post
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CreatePost;