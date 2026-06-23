import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'error' | 'success' | 'info';
  className?: string;
}

const Alert: React.FC<AlertProps> = ({ children, variant = 'error', className = '' }) => (
  <div className={`alert alert-${variant} ${className}`.trim()} role="alert">
    {children}
  </div>
);

export default Alert;
