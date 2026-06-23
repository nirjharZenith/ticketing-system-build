import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = '', className = '' }) => (
  <span className={`badge ${variant} ${className}`.trim()}>{children}</span>
);

export default Badge;
