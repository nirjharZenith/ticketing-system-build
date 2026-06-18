import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../services/api';
import '../styles/ticket-detail.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  creator_id: string;
}

interface Activity {
  id: string;
  action: string;
  new_value: string;
  created_at: string;
  name: string;
  email: string;
}

const TicketDetailPage: React.FC = () => {
  const { org_id, ticket_id } = useParams<{ org_id: string; ticket_id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadTicketDetails();
  }, [org_id, ticket_id]);

  const loadTicketDetails = async () => {
    if (!org_id || !ticket_id) return;

    try {
      const ticketResponse = await ticketAPI.getById(org_id, ticket_id);
      setTicket(ticketResponse.data);
      setNewStatus(ticketResponse.data.status);

      const activityResponse = await ticketAPI.getActivity(org_id, ticket_id);
      setActivity(activityResponse.data);
    } catch (err) {
      console.error('[v0] Failed to load ticket:', err);
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!ticket || newStatus === ticket.status) {
      setEditingStatus(false);
      return;
    }

    try {
      await ticketAPI.update(org_id!, ticket_id!, { status: newStatus });
      setTicket({ ...ticket, status: newStatus });
      setEditingStatus(false);
      await loadTicketDetails();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update ticket');
    }
  };

  const handleBack = () => {
    navigate(`/org/${org_id}/tickets`);
  };

  if (loading) {
    return <div className="ticket-detail-container"><p>Loading...</p></div>;
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-container">
        <button onClick={handleBack} className="back-btn">← Back</button>
        <p>Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="ticket-detail-container">
      <button onClick={handleBack} className="back-btn">← Back</button>

      <div className="ticket-detail-content">
        <div className="ticket-main">
          <h1>{ticket.title}</h1>

          <div className="ticket-info">
            <div className="info-group">
              <label>Priority</label>
              <span className={`priority-badge priority-${ticket.priority}`}>
                {ticket.priority}
              </span>
            </div>

            <div className="info-group">
              <label>Status</label>
              {editingStatus ? (
                <div className="status-edit">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={handleStatusUpdate} className="save-btn">Save</button>
                  <button onClick={() => setEditingStatus(false)} className="cancel-btn">Cancel</button>
                </div>
              ) : (
                <div className="status-display">
                  <span className={`status-badge status-${ticket.status}`}>
                    {ticket.status}
                  </span>
                  <button onClick={() => setEditingStatus(true)} className="edit-btn">Edit</button>
                </div>
              )}
            </div>

            <div className="info-group">
              <label>Created</label>
              <span>{new Date(ticket.created_at).toLocaleString()}</span>
            </div>

            <div className="info-group">
              <label>Updated</label>
              <span>{new Date(ticket.updated_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="ticket-description-section">
            <h3>Description</h3>
            <p>{ticket.description || 'No description provided'}</p>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <aside className="ticket-sidebar">
          <section className="activity-section">
            <h3>Activity</h3>
            {activity.length === 0 ? (
              <p className="no-activity">No activity yet</p>
            ) : (
              <div className="activity-list">
                {activity.map((item) => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-header">
                      <span className="activity-user">{item.name}</span>
                      <span className="activity-action">{item.action}</span>
                    </div>
                    <div className="activity-details">
                      <p>{item.new_value}</p>
                      <span className="activity-time">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default TicketDetailPage;
