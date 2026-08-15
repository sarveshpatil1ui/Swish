import React from 'react';
import Card from './Card';
import './StatCard.css';

const StatCard = ({ title, value, change, icon, color, trend }) => {
  const isPositive = change >= 0;
  
  return (
    <Card className="stat-card" padding="large">
      <div className="stat-card__header">
        <div className="stat-card__icon" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
        {change !== undefined && (
          <div 
            className="stat-card__change" 
            style={{ color: isPositive ? '#10b981' : '#ef4444' }}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__title">{title}</div>
      {trend && (
        <div className="stat-card__trend">
          <span className="stat-card__trend-label">Trend:</span>
          <span className="stat-card__trend-value">{trend}</span>
        </div>
      )}
    </Card>
  );
};

export default StatCard;