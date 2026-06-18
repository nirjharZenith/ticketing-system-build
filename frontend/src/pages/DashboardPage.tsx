import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orgAPI } from '../services/api';
import '../styles/dashboard.css';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const response = await orgAPI.getAll();
      setOrganizations(response.data);
    } catch (err) {
      console.error('[v0] Failed to load organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newOrgName.trim()) {
      setError('Organization name required');
      return;
    }

    setCreating(true);

    try {
      await orgAPI.create(newOrgName);
      setNewOrgName('');
      await loadOrganizations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleOrgClick = (orgId: string) => {
    navigate(`/org/${orgId}/tickets`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="dashboard-container"><p>Loading...</p></div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Ticketing System</h1>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="create-org-section">
          <h2>Create Organization</h2>
          <form onSubmit={handleCreateOrg} className="create-org-form">
            <input
              type="text"
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              disabled={creating}
            />
            <button type="submit" disabled={creating} className="create-btn">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </section>

        <section className="orgs-section">
          <h2>Your Organizations</h2>
          {organizations.length === 0 ? (
            <p className="no-orgs">No organizations yet. Create one to get started!</p>
          ) : (
            <div className="orgs-grid">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="org-card"
                  onClick={() => handleOrgClick(org.id)}
                >
                  <h3>{org.name}</h3>
                  <p className="org-role">Role: {org.role}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
