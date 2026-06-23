import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverable = false }) => {
  const classes = ['card', hoverable ? 'card-hoverable' : '', className].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <div className={classes} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
        {children}
      </div>
    );
  }

  return <div className={classes}>{children}</div>;
};

export default Card;
