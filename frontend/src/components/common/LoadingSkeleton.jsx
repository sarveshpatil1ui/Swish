import React from 'react';
import './LoadingSkeleton.css';

const LoadingSkeleton = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1
}) => {
  const skeletonClasses = [
    'skeleton',
    `skeleton--${variant}`,
    className
  ].filter(Boolean).join(' ');

  const style = {
    width: width || '100%',
    height: height || 'auto'
  };

  const renderSkeleton = () => (
    <div className={skeletonClasses} style={style} />
  );

  if (count > 1) {
    return (
      <div className="skeleton-group">
        {Array.from({ length: count }).map((_, index) => (
          <React.Fragment key={index}>
            {renderSkeleton()}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return renderSkeleton();
};

export default LoadingSkeleton;