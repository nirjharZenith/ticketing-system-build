import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { orgAPI, getApiErrorMessage } from '../services/api';
import { Button, Input, Select, Alert, Card } from '../components/ui';
import '../styles/admin.css';

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface TeamAccess {
  role: string;
  canReadMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
}

const ROLE_OPTIONS = [
  { value: 'user', label: 'Member — can view team and manage tickets' },
  { value: 'admin', label: 'Admin — can invite and remove team members' },
];

const AdminMembersPage: React.FC = () => {
  const { org_id } = useParams<{ org_id: string }>();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [access, setAccess] = useState<TeamAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const canInvite = access?.canInviteMembers ?? false;
  const canRemove = access?.canRemoveMembers ?? false;

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id]);

  const loadMembers = async () => {
    if (!org_id) return;
    try {
      const response = await orgAPI.getMembers(org_id);
      setMembers(response.data.members ?? response.data);
      setAccess(response.data.access ?? null);
      setError('');
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  };

  const resetInviteForm = () => {
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('');
    setInviteRole('user');
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      setError('Name, email, and password are required');
      return;
    }

    setInviting(true);
    try {
      const response = await orgAPI.addMember(org_id!, {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        password: invitePassword,
        role: inviteRole,
      });

      const created = response.data.member?.created;
      setSuccess(
        created
          ? `Account created for ${inviteEmail}. They can sign in with the credentials you set.`
          : `${inviteEmail} was added to the team. They can sign in with their existing password.`
      );

      resetInviteForm();
      setShowInviteForm(false);
      await loadMembers();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to add team member'));
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member from the organization?')) return;
    setError('');
    setSuccess('');
    try {
      await orgAPI.removeMember(org_id!, memberId);
      setSuccess('Member removed successfully');
      await loadMembers();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to remove member'));
    }
  };

  if (loading) {
    return (
      <AppLayout title="Team">
        <div className="loading-state"><div className="spinner" /><p>Loading team...</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Team Members"
      subtitle={
        canInvite
          ? 'Invite teammates and manage who has access to this organization'
          : 'View your teammates. Only admins can invite or remove members.'
      }
      backTo={`/org/${org_id}/tickets`}
      backLabel="Tickets"
      actions={
        canInvite ? (
          <Button onClick={() => { setShowInviteForm(!showInviteForm); setError(''); setSuccess(''); }}>
            {showInviteForm ? 'Cancel' : '+ Add Member'}
          </Button>
        ) : undefined
      }
    >
      {success && <Alert variant="success">{success}</Alert>}

      {!canInvite && (
        <Alert variant="info" className="members-readonly-notice">
          You have read-only access to the team directory. Contact an admin if someone needs to be added or removed.
        </Alert>
      )}

      {showInviteForm && canInvite && (
        <Card className="invite-form">
          <h2 className="section-title">Add Team Member</h2>
          <p className="section-desc">
            Create a login for a new teammate. They&apos;ll sign in with this email and password and immediately see this organization.
          </p>
          <form onSubmit={handleInviteMember}>
            <div className="form-row">
              <Input label="Full name" id="invite-name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" disabled={inviting} required />
              <Input label="Email" id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@company.com" disabled={inviting} required />
            </div>
            <div className="form-row">
              <Input label="Temporary password" id="invite-password" type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Set a login password" disabled={inviting} required hint="Share this password securely with the new member" />
              <Select label="Role" id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} options={ROLE_OPTIONS} disabled={inviting} />
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={inviting}>
              {inviting ? 'Adding member...' : 'Add to team'}
            </Button>
          </form>
        </Card>
      )}

      <Card className="members-section">
        {members.length === 0 ? (
          <div className="empty-state"><p>No members yet</p></div>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                {canRemove && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td><span className={`role-badge role-${member.role === 'member' ? 'user' : member.role}`}>{member.role === 'admin' ? 'Admin' : 'Member'}</span></td>
                  {canRemove && (
                    <td>
                      {member.id !== user?.id && member.role !== 'admin' ? (
                        <Button variant="danger" size="sm" onClick={() => handleRemoveMember(member.id)}>Remove</Button>
                      ) : (
                        <span className="you-badge">{member.id === user?.id ? 'You' : 'Admin'}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {error && !showInviteForm && <Alert className="members-error">{error}</Alert>}
    </AppLayout>
  );
};

export default AdminMembersPage;
