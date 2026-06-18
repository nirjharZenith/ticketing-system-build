import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketAPI } from '../services/api';
import '../styles/tickets.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_to?: string;
}

const TicketsPage: React.FC = () => {
  const { org_id } = useParams<{ org_id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadTickets();
  }, [org_id, statusFilter]);

  const loadTickets = async () => {
    if (!org_id) return;

    try {
      const filters = statusFilter ? { status: statusFilter } : undefined;
      const response = await ticketAPI.getAll(org_id, filters);
      setTickets(response.data);
    } catch (err) {
      console.error('[v0] Failed to load tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title required');
      return;
    }

    setCreating(true);

    try {
      await ticketAPI.create(org_id!, title, description, priority);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setShowCreateForm(false);
      await loadTickets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleViewTicket = (ticketId: string) => {
    navigate(`/org/${org_id}/tickets/${ticketId}`);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleManageMembers = () => {
    navigate(`/org/${org_id}/members`);
  };

  if (loading) {
    return <div className="tickets-container"><p>Loading...</p></div>;
  }

  return (
    <div className="tickets-container">
      <div className="tickets-header">
        <button onClick={handleBack} className="back-btn">← Back</button>
        <h1>Tickets</h1>
        <div className="header-buttons">
          <button onClick={handleManageMembers} className="members-btn">
            👥 Members
          </button>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="create-ticket-btn">
            {showCreateForm ? 'Cancel' : '+ Create Ticket'}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateTicket} className="create-ticket-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ticket title"
              disabled={creating}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ticket description"
              disabled={creating}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={creating}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={creating} className="submit-btn">
            {creating ? 'Creating...' : 'Create Ticket'}
          </button>
        </form>
      )}

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="tickets-list">
        {tickets.length === 0 ? (
          <p className="no-tickets">No tickets found</p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="ticket-card"
              onClick={() => handleViewTicket(ticket.id)}
            >
              <div className="ticket-header">
                <h3>{ticket.title}</h3>
                <span className={`priority-badge priority-${ticket.priority}`}>
                  {ticket.priority}
                </span>
              </div>
              <p className="ticket-description">{ticket.description}</p>
              <div className="ticket-footer">
                <span className={`status-badge status-${ticket.status}`}>
                  {ticket.status}
                </span>
                <span className="ticket-date">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
