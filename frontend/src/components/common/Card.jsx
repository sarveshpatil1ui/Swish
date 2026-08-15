import React from 'react';
import './Card.css';

const Card = ({
  children,
  className = '',
  padding = 'medium',
  shadow = 'md',
  rounded = 'lg',
  hover = false,
  onClick,
  ...props
}) => {
  const cardClasses = [
    'card',
    `card--padding-${padding}`,
    `card--shadow-${shadow}`,
    `card--rounded-${rounded}`,
    hover && 'card--hover',
    onClick && 'card--clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;