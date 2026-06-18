import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orgAPI } from '../services/api';
import '../styles/admin.css';

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
}

const AdminMembersPage: React.FC = () => {
  const { org_id } = useParams<{ org_id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [org_id]);

  const loadMembers = async () => {
    if (!org_id) return;

    try {
      const response = await orgAPI.getMembers(org_id);
      setMembers(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('[v0] Failed to load members:', err);
      setError(err.response?.data?.error || 'Failed to load members');
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inviteEmail.trim()) {
      setError('Email required');
      return;
    }

    setInviting(true);

    try {
      await orgAPI.addMember(org_id!, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteForm(false);
      await loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await orgAPI.removeMember(org_id!, memberId);
      await loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleBack = () => {
    navigate(`/org/${org_id}/tickets`);
  };

  if (loading) {
    return <div className="admin-container"><p>Loading...</p></div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <button onClick={handleBack} className="back-btn">← Back to Tickets</button>
        <h1>Organization Members</h1>
        <button onClick={() => setShowInviteForm(!showInviteForm)} className="invite-btn">
          {showInviteForm ? 'Cancel' : '+ Invite Member'}
        </button>
      </div>

      {showInviteForm && (
        <form onSubmit={handleInviteMember} className="invite-form">
          <div className="form-group">
            <label htmlFor="invite-email">Email</label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@example.com"
              disabled={inviting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={inviting}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={inviting} className="submit-btn">
            {inviting ? 'Inviting...' : 'Invite Member'}
          </button>
        </form>
      )}

      <div className="members-section">
        {members.length === 0 ? (
          <p className="no-members">No members yet</p>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>
                    <span className={`role-badge role-${member.role}`}>
                      {member.role}
                    </span>
                  </td>
                  <td>
                    {member.id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                    )}
                    {member.id === user?.id && (
                      <span className="you-badge">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default AdminMembersPage;
