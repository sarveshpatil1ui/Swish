import React from 'react';
import './Input.css';

const Input = ({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  disabled = false,
  error = '',
  label = '',
  required = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const inputClasses = [
    'input',
    error && 'input--error',
    Icon && 'input--with-icon',
    className
  ].filter(Boolean).join(' ');

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-label--required">*</span>}
        </label>
      )}
      <div className="input-container">
        {Icon && (
          <span className="input-icon">
            <Icon />
          </span>
        )}
        <input
          type={type}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};

export default Input;