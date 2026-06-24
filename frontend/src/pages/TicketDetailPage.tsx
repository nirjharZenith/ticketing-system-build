import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ImageUploader, { ImagePreview } from '../components/ImageUploader';
import { ticketAPI, getApiErrorMessage } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Badge, Button, Textarea } from '../components/ui';
import '../styles/ticket-detail.css';
import '../styles/image-uploader.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  creator_id: string;
  github_issue_number?: number;
  github_issue_url?: string;
  github_repo_owner?: string;
  github_repo_name?: string;
  github_status?: string;
}

interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  name: string;
  email: string;
}

interface Activity {
  id: string;
  action: string;
  new_value: string;
  created_at: string;
  name: string;
  email: string;
}

interface Attachment {
  id: string;
  filename: string;
  file_url: string;
  created_at: string;
}



const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const statusClass = (status: string) =>
  `status-${status.toLowerCase().replace(/\s+/g, '-')}`;

const priorityClass = (priority: string) => `priority-${priority.toLowerCase()}`;

const TicketDetailPage: React.FC = () => {
  const { org_id, ticket_id } = useParams<{ org_id: string; ticket_id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadImages, setUploadImages] = useState<ImagePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Priority inline edit
  const [editingPriority, setEditingPriority] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('');
  const [updatingPriority, setUpdatingPriority] = useState(false);

  // Comment & Description states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [updatingDescription, setUpdatingDescription] = useState(false);

  const { socket, joinOrg, leaveOrg } = useSocket();

  const loadTicketDetails = useCallback(async () => {
    if (!org_id || !ticket_id) return;
    try {
      const [ticketResponse, activityResponse, attachmentsResponse, commentsResponse] = await Promise.all([
        ticketAPI.getById(org_id, ticket_id),
        ticketAPI.getActivity(org_id, ticket_id),
        ticketAPI.getAttachments(org_id, ticket_id),
        ticketAPI.getComments(org_id, ticket_id),
      ]);
      setTicket(ticketResponse.data);
      setNewDescription(ticketResponse.data.description || '');
      setActivity(activityResponse.data);
      setAttachments(attachmentsResponse.data);
      setComments(commentsResponse.data);
      setError('');
    } catch (err) {
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [org_id, ticket_id]);

  useEffect(() => {
    loadTicketDetails();
  }, [loadTicketDetails]);

  // Browser tab title
  useEffect(() => {
    if (ticket) {
      document.title = `${ticket.title} — Zenith`;
    } else {
      document.title = 'Ticket — Zenith';
    }
    return () => { document.title = 'Zenith Tickets'; };
  }, [ticket?.title]);

  useEffect(() => {
    if (org_id) {
      joinOrg(org_id);
      return () => leaveOrg(org_id);
    }
  }, [org_id, joinOrg, leaveOrg]);

  useEffect(() => {
    if (!socket || !ticket_id) return;

    const handleUpdate = (updatedTicket: any) => {
      if (updatedTicket.id === ticket_id) {
        loadTicketDetails();
      }
    };

    const handleComment = (data: any) => {
      if (data.ticket_id === ticket_id) {
        loadTicketDetails();
      }
    };

    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket:commented', handleComment);

    return () => {
      socket.off('ticket:updated', handleUpdate);
      socket.off('ticket:commented', handleComment);
    };
  }, [socket, ticket_id, loadTicketDetails]);

  // ---- Priority inline update ----
  const startEditPriority = () => {
    setSelectedPriority(ticket?.priority || 'medium');
    setEditingPriority(true);
    setSuccess('');
    setError('');
  };

  const handlePriorityUpdate = async () => {
    if (!selectedPriority || selectedPriority === ticket?.priority) {
      setEditingPriority(false);
      return;
    }
    setUpdatingPriority(true);
    setError('');
    setSuccess('');
    try {
      await ticketAPI.update(org_id!, ticket_id!, { priority: selectedPriority });
      setEditingPriority(false);
      setSuccess(`Priority updated to "${selectedPriority}"`);
      setTimeout(() => setSuccess(''), 3000);
      await loadTicketDetails();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to update priority'));
    } finally {
      setUpdatingPriority(false);
    }
  };

  // ---- Comment ----
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !org_id || !ticket_id) return;

    setSubmittingComment(true);
    setError('');
    setSuccess('');

    try {
      await ticketAPI.addComment(org_id, ticket_id, newCommentText.trim());
      setNewCommentText('');
      setSuccess('Comment added');
      setTimeout(() => setSuccess(''), 2000);
      await loadTicketDetails();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to post comment'));
    } finally {
      setSubmittingComment(false);
    }
  };

  // ---- Description edit ----
  const handleDescriptionUpdate = async () => {
    if (!ticket || newDescription.trim() === (ticket.description || '').trim()) {
      setEditingDescription(false);
      return;
    }

    setUpdatingDescription(true);
    setError('');
    setSuccess('');

    try {
      await ticketAPI.update(org_id!, ticket_id!, { description: newDescription.trim() });
      setEditingDescription(false);
      setSuccess('Description updated');
      setTimeout(() => setSuccess(''), 2000);
      await loadTicketDetails();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to update description'));
    } finally {
      setUpdatingDescription(false);
    }
  };

  // ---- Upload ----
  const handleUpload = async () => {
    if (uploadImages.length === 0) return;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await ticketAPI.uploadImages(org_id!, ticket_id!, uploadImages.map((img) => img.file));
      uploadImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setUploadImages([]);
      setSuccess('Images uploaded');
      setTimeout(() => setSuccess(''), 2000);
      await loadTicketDetails();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to upload images'));
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (attachment: Attachment) =>
    ticketAPI.getAttachmentUrl(org_id!, ticket_id!, attachment.filename, attachment.file_url);

  if (loading) {
    return (
      <AppLayout title="Ticket Details">
        <div className="loading-state"><div className="spinner" /><p>Loading ticket...</p></div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout title="Not Found" backTo={`/org/${org_id}/tickets`} backLabel="Tickets">
        <div className="empty-state card"><p>Ticket not found</p></div>
      </AppLayout>
    );
  }

  const remainingSlots = 4 - attachments.length;

  return (
    <AppLayout
      title={ticket.title}
      subtitle={`Created ${new Date(ticket.created_at).toLocaleString()}`}
      backTo={`/org/${org_id}/tickets`}
      backLabel="Tickets"
    >
      {/* Global status/error banners */}
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="ticket-detail-content">
        <div className="ticket-main card">

          {/* Info row */}
          <div className="ticket-info">

            {/* Priority */}
            <div className="info-group">
              <span className="info-label">Priority</span>
              <div className="info-value">
                {editingPriority ? (
                  <div className="inline-edit-row">
                    <select
                      className="form-select status-select"
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      disabled={updatingPriority}
                      autoFocus
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handlePriorityUpdate} disabled={updatingPriority}>
                      {updatingPriority ? '...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingPriority(false)} disabled={updatingPriority}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="inline-edit-row">
                    <Badge variant={priorityClass(ticket.priority)}>{ticket.priority}</Badge>
                    <button className="edit-inline-btn" onClick={startEditPriority} title="Edit priority">✏</button>
                  </div>
                )}
              </div>
            </div>

            {/* Status — read-only, synced from GitHub */}
            <div className="info-group">
              <span className="info-label">
                Status
                {ticket.github_issue_number && (
                  <span className="github-sync-hint"> · synced from GitHub</span>
                )}
              </span>
              <div className="info-value">
                <div className="inline-edit-row">
                  <Badge variant={statusClass(ticket.status)}>{ticket.status}</Badge>
                  {ticket.github_issue_number && (
                    <a
                      href={ticket.github_issue_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="github-issue-link"
                      title="View on GitHub"
                    >
                      <span className="github-issue-link-inner">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                        #{ticket.github_issue_number}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Updated at */}
            <div className="info-group">
              <span className="info-label">Updated</span>
              <div className="info-value">
                <span className="info-value-text">{new Date(ticket.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="ticket-description-section">
            <div className="section-header-row">
              <h3>Description</h3>
              {!editingDescription && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingDescription(true); setNewDescription(ticket.description || ''); }}>Edit</Button>
              )}
            </div>
            {editingDescription ? (
              <div className="description-edit-container">
                <Textarea
                  value={newDescription}
                  onChange={(e: any) => setNewDescription(e.target.value)}
                  placeholder="Enter ticket description..."
                  rows={6}
                  disabled={updatingDescription}
                  className="form-textarea description-edit-textarea"
                />
                <div className="description-edit-actions">
                  <Button type="button" size="sm" onClick={handleDescriptionUpdate} disabled={updatingDescription}>
                    {updatingDescription ? 'Saving...' : 'Save'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingDescription(false)} disabled={updatingDescription}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="ticket-description-text">{ticket.description || 'No description provided'}</p>
            )}
          </div>

          {/* Attachments */}
          <div className="attachments-section">
            <h3>Attachments ({attachments.length}/4)</h3>
            {attachments.length > 0 ? (
              <div className="attachments-gallery">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="attachment-card">
                    <img
                      src={`${getImageUrl(attachment)}?inline=true`}
                      alt={attachment.filename}
                      className="attachment-thumb"
                      onClick={() => setLightboxUrl(`${getImageUrl(attachment)}?inline=true`)}
                    />
                    <span className="attachment-name">{attachment.filename}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-attachments">No images attached</p>
            )}

            {remainingSlots > 0 && (
              <div className="upload-section">
                <ImageUploader
                  images={uploadImages}
                  onChange={setUploadImages}
                  maxImages={remainingSlots}
                  disabled={uploading}
                />
                {uploadImages.length > 0 && (
                  <button type="button" onClick={handleUpload} disabled={uploading} className="btn btn-primary upload-btn">
                    {uploading ? 'Uploading...' : `Upload ${uploadImages.length} image(s)`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="comments-section">
            <h3>Comments ({comments.length})</h3>

            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="no-comments">No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="comment-card">
                    <div className="comment-header">
                      <div className="comment-author">
                        <span className="comment-author-name">{c.name}</span>
                        <span className="comment-author-email">{c.email}</span>
                      </div>
                      <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="comment-body">{c.comment}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="comment-form">
              <div className="form-group comment-form-group">
                <Textarea
                  value={newCommentText}
                  onChange={(e: any) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  disabled={submittingComment}
                  required
                />
              </div>
              <Button type="submit" disabled={submittingComment || !newCommentText.trim()}>
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </form>
          </div>
        </div>

        <aside className="ticket-sidebar">
          <section className="activity-section card">
            <h3>Activity</h3>
            {activity.length === 0 ? (
              <p className="no-activity">No activity yet</p>
            ) : (
              <div className="activity-list">
                {activity.map((item) => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-header">
                      <span className="activity-user">{item.name || 'System'}</span>
                      <span className="activity-action">{item.action.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="activity-details">
                      <p>{item.new_value}</p>
                      <span className="activity-time">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)} role="presentation">
          <img src={lightboxUrl} alt="Attachment preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </AppLayout>
  );
};

export default TicketDetailPage;
