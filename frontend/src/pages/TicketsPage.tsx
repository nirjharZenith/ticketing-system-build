import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ImageUploader, { ImagePreview } from '../components/ImageUploader';
import { Button, Input, Select, Textarea, Alert, Card, Badge } from '../components/ui';
import { useSocket } from '../context/SocketContext';
import { ticketAPI, getApiErrorMessage } from '../services/api';
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { socket, joinOrg, leaveOrg } = useSocket();

  const loadTickets = useCallback(async () => {
    if (!org_id) return;
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      const response = await ticketAPI.getAll(org_id, Object.keys(filters).length ? filters : undefined);
      setTickets(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to load tickets:', err);
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [org_id, statusFilter, priorityFilter]);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id, statusFilter, priorityFilter]);

  useEffect(() => {
    if (org_id) {
      joinOrg(org_id);
      return () => leaveOrg(org_id);
    }
  }, [org_id, joinOrg, leaveOrg]);

  useEffect(() => {
    if (!socket) return;
    
    const handleEvent = () => {
      loadTickets();
    };

    socket.on('ticket:created', handleEvent);
    socket.on('ticket:updated', handleEvent);
    socket.on('ticket:deleted', handleEvent);

    return () => {
      socket.off('ticket:created', handleEvent);
      socket.off('ticket:updated', handleEvent);
      socket.off('ticket:deleted', handleEvent);
    };
  }, [socket, org_id, loadTickets]); // re-run if socket changes

  const clearImages = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setCreating(true);

    try {
      const response = await ticketAPI.create(org_id!, title, description, priority);
      const ticketId = response.data.ticket?.id || response.data.id;

      if (images.length > 0 && ticketId) {
        await ticketAPI.uploadImages(org_id!, ticketId, images.map((img) => img.file));
      }

      setTitle('');
      setDescription('');
      setPriority('medium');
      clearImages();
      setShowCreateForm(false);
      await loadTickets();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to create ticket'));
    } finally {
      setCreating(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ticket.title.toLowerCase().includes(q) ||
      ticket.description?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    urgent: tickets.filter((t) => t.priority === 'urgent').length,
  };

  if (loading && tickets.length === 0) {
    return (
      <AppLayout title="Tickets">
        <div className="loading-state"><div className="spinner" /><p>Loading tickets...</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Tickets"
      subtitle="Manage and track support requests"
      backTo="/dashboard"
      backLabel="Organizations"
      actions={
        <>
          <Button variant="secondary" onClick={() => navigate(`/org/${org_id}/members`)}>
            Team
          </Button>
          <Button onClick={() => { setShowCreateForm(!showCreateForm); setError(''); }}>
            {showCreateForm ? 'Cancel' : '+ New Ticket'}
          </Button>
        </>
      }
    >
      <div className="stats-row">
        <Card className="stat-card"><span className="stat-value">{stats.total}</span><span className="stat-label">Total</span></Card>
        <Card className="stat-card"><span className="stat-value">{stats.open}</span><span className="stat-label">Open</span></Card>
        <Card className="stat-card"><span className="stat-value">{stats.urgent}</span><span className="stat-label">Urgent</span></Card>
      </div>

      {showCreateForm && (
        <Card className="create-ticket-form">
          <h2 className="section-title">New Ticket</h2>
          <form onSubmit={handleCreateTicket}>
            <Input id="title" label="Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief summary of the issue" disabled={creating} />
            <Textarea id="description" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide details..." disabled={creating} rows={4} />
            <Select id="priority" label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={creating} options={[
              { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
            ]} />
            <ImageUploader images={images} onChange={setImages} disabled={creating} />
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Ticket'}</Button>
          </form>
        </Card>
      )}

      <Card className="filters-bar">
        <input
          type="search"
          className="form-input search-input"
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select aria-label="Filter tickets by status" className="form-select filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="in_verification">In Verification</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select aria-label="Filter tickets by priority" className="form-select filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </Card>

      {error && !showCreateForm && <Alert>{error}</Alert>}

      <div className="tickets-list">
        {filteredTickets.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">🎫</div>
            <p>{searchQuery ? 'No tickets match your search' : 'No tickets yet. Create your first one!'}</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="ticket-card" hoverable onClick={() => navigate(`/org/${org_id}/tickets/${ticket.id}`)}>
              <div className="ticket-header">
                <h3>{ticket.title}</h3>
                <Badge variant={`priority-${ticket.priority}`}>{ticket.priority}</Badge>
              </div>
              <p className="ticket-description">{ticket.description || 'No description'}</p>
              <div className="ticket-footer">
                <Badge variant={`status-${ticket.status}`}>{ticket.status.replace('_', ' ')}</Badge>
                <span className="ticket-date">{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default TicketsPage;
