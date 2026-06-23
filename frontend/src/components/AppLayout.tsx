import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFullDisplayName, getUserInitials } from '../utils/userDisplay';
import { Button } from './ui';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  actions,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = getUserFullDisplayName(user);
  const displayEmail = user?.email || '';
  const initials = getUserInitials(user);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', match: (path: string) => path === '/dashboard' },
    {
      to: location.pathname.includes('/org/') ? location.pathname.split('/tickets')[0] + '/tickets' : '/dashboard',
      label: 'Tickets',
      match: (path: string) => path.includes('/tickets') && !path.includes('/members'),
    },
  ];

  return (
    <div className="page-shell" key={user?.id ?? 'guest'}>
      <header className="app-header">
        <div className="header-left">
          <Link to="/dashboard" className="app-brand">
            <span className="brand-icon">T</span>
            <span>Zenith Tickets</span>
          </Link>

          {user && (
            <nav className="main-nav" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = item.match(location.pathname);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {user && (
          <div className="header-nav" key={user.id}>
            <div className="user-menu">
              <div className="user-badge">
                <span className="user-avatar" aria-hidden="true">{initials}</span>
                <div className="user-info">
                  <span className="user-name">{displayName}</span>
                  <span className="user-email">{displayEmail}</span>
                </div>
              </div>
              <Button variant="ghost" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="page-content">
        {(title || backTo || actions) && (
          <div className="page-header">
            <div className="page-header-text">
              {backTo && (
                <Button
                  variant="ghost"
                  className="back-link"
                  onClick={() => navigate(backTo)}
                >
                  ← {backLabel}
                </Button>
              )}
              {title && <h1>{title}</h1>}
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="page-header-actions">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
