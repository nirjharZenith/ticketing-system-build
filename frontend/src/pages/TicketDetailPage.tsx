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

const formatMetaLabel = (value: string) => value.replace(/_/g, ' ');

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

  // Comment & Description States
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
      console.error('Failed to load ticket:', err);
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [org_id, ticket_id]);

  useEffect(() => {
    loadTicketDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id, ticket_id]);

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

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !org_id || !ticket_id) return;

    setSubmittingComment(true);
    setError('');
    setSuccess('');

    try {
      await ticketAPI.addComment(org_id, ticket_id, newCommentText.trim());
      setNewCommentText('');
      setSuccess('Comment added successfully');
      await loadTicketDetails();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to post comment'));
    } finally {
      setSubmittingComment(false);
    }
  };

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
      setSuccess('Description updated successfully');
      await loadTicketDetails();
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to update description'));
    } finally {
      setUpdatingDescription(false);
    }
  };

  const handleUpload = async () => {
    if (uploadImages.length === 0) return;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await ticketAPI.uploadImages(org_id!, ticket_id!, uploadImages.map((img) => img.file));
      uploadImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setUploadImages([]);
      setSuccess('Images uploaded successfully');
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
      <div className="ticket-detail-content">
        <div className="ticket-main card">
          <div className="ticket-info">
            <div className="info-group">
              <span className="info-label">Priority</span>
              <div className="info-value">
                <Badge variant={`priority-${ticket.priority}`}>{formatMetaLabel(ticket.priority)}</Badge>
              </div>
            </div>

            <div className="info-group">
              <span className="info-label">Status</span>
              <div className="info-value status-display">
                <Badge variant={`status-${ticket.status.toLowerCase().replace(/\s+/g, '-')}`}>{ticket.status}</Badge>
                {ticket.github_issue_number && (
                  <a
                    href={ticket.github_issue_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="github-badge-link"
                    title="View GitHub Issue"
                    style={{ textDecoration: 'none' }}
                  >
                    <Badge variant={ticket.github_status === 'closed' ? 'priority-low' : 'status-in_verification'}>
                      GitHub #{ticket.github_issue_number} ({ticket.github_status || 'open'})
                    </Badge>
                  </a>
                )}
              </div>
            </div>

            <div className="info-group">
              <span className="info-label">Updated</span>
              <div className="info-value">
                <span className="info-value-text">{new Date(ticket.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="ticket-description-section">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Description</h3>
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
                <div className="description-edit-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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

          <div className="attachments-section">
            <h3>Attachments ({attachments.length}/4)</h3>
            {attachments.length > 0 ? (
              <div className="attachments-gallery">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="attachment-card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <img
                      src={`${getImageUrl(attachment)}?inline=true`}
                      alt={attachment.filename}
                      style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain', marginBottom: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                      onClick={() => setLightboxUrl(`${getImageUrl(attachment)}?inline=true`)}
                    />
                    <span style={{ fontSize: '12px', wordBreak: 'break-all', textAlign: 'center', marginBottom: '8px', color: 'var(--color-text)' }}>{attachment.filename}</span>
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
                  <button type="button" onClick={handleUpload} disabled={uploading} className="btn btn-primary" style={{ marginTop: 12 }}>
                    {uploading ? 'Uploading...' : `Upload ${uploadImages.length} image(s)`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="comments-section" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Comments ({comments.length})</h3>

            <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {comments.length === 0 ? (
                <p className="no-comments" style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((c) => (
                    <div
                      key={c.id}
                      className="comment-card"
                      style={{
                        padding: 16,
                        background: 'var(--color-surface-muted)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        position: 'relative'
                      }}
                    >
                      <div className="comment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <div className="comment-author" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="comment-author-name" style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                          <span className="comment-author-email" style={{ color: 'var(--color-text-light)', fontSize: 11 }}>{c.email}</span>
                        </div>
                        <span className="comment-time" style={{ color: 'var(--color-text-light)', fontSize: 11 }}>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <div className="comment-body" style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {c.comment}
                      </div>
                    </div>
                  ))

              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="comment-form" style={{ marginTop: 16 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
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

          {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginTop: 16 }}>{success}</div>}
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
                      <span className="activity-user">{item.name}</span>
                      <span className="activity-action">{item.action.replace('_', ' ')}</span>
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
