import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { orgAPI, getApiErrorMessage } from '../services/api';
import { getUserDisplayName } from '../utils/userDisplay';
import { Button, Input, Alert, Card } from '../components/ui';
import '../styles/dashboard.css';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Set browser tab title
  useEffect(() => {
    document.title = 'Dashboard — Zenith';
    return () => { document.title = 'Zenith Tickets'; };
  }, []);

  const loadOrganizations = useCallback(async () => {
    setOrganizations([]);
    setError('');
    setLoading(true);
    try {
      const response = await orgAPI.getAll();
      setOrganizations(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load organizations'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadOrganizations();
  }, [user?.id, loadOrganizations]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreateSuccess('');

    if (!newOrgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setCreating(true);
    try {
      await orgAPI.create(newOrgName);
      setNewOrgName('');
      setCreateSuccess(`Organization "${newOrgName}" created!`);
      setTimeout(() => setCreateSuccess(''), 3000);
      await loadOrganizations();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to create organization'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout
        key={user?.id}
        title={`Welcome, ${getUserDisplayName(user)}`}
        subtitle={`Signed in as ${user?.email ?? ''}`}
      >
        <div className="loading-state"><div className="spinner" /><p>Loading your organizations...</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      key={user?.id}
      title={`Welcome, ${getUserDisplayName(user)}`}
      subtitle={`Signed in as ${user?.email ?? ''}`}
    >
      <Card className="create-org-section">
        <h2 className="section-title">Create Organization</h2>
        <p className="section-desc">Organizations help you manage tickets with your team.</p>
        <form onSubmit={handleCreateOrg} className="create-org-form">
          <Input
            type="text"
            placeholder="e.g. Acme Corp, My Team..."
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            disabled={creating}
          />
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </form>
        {error && <Alert>{error}</Alert>}
        {createSuccess && <Alert variant="success">{createSuccess}</Alert>}
      </Card>

      <section className="orgs-section">
        <h2 className="section-title">Your Organizations</h2>
        {organizations.length === 0 ? (
          <Card className="empty-state">
            <span className="empty-state-icon">🏢</span>
            <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text)', marginBottom: 8 }}>No organizations yet</p>
            <p>Create one above to start managing tickets with your team.</p>
          </Card>
        ) : (
          <div className="orgs-grid">
            {organizations.map((org) => (
              <Card key={org.id} className="org-card" hoverable onClick={() => navigate(`/org/${org.id}/tickets`)}>
                <div className="org-icon">🏢</div>
                <div className="org-info">
                  <h3>{org.name}</h3>
                  <p className="org-slug">@{org.slug}</p>
                </div>
                <div className="org-meta">
                  <span className={`role-badge role-${org.role}`}>{org.role}</span>
                  <span className="org-arrow">→</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default DashboardPage;
