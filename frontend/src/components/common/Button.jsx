import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const buttonClasses = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth && 'button--full-width',
    loading && 'button--loading',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && <span className="button__spinner" />}
      {Icon && iconPosition === 'left' && !loading && (
        <span className="button__icon button__icon--left">
          <Icon />
        </span>
      )}
      <span className="button__content">{children}</span>
      {Icon && iconPosition === 'right' && !loading && (
        <span className="button__icon button__icon--right">
          <Icon />
        </span>
      )}
    </button>
  );
};

export default Button;