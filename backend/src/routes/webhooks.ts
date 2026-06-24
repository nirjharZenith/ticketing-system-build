import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../db';
import * as ticketService from '../services/ticketService';
import { emitToOrg } from '../services/socketService';

const router: express.Router = express.Router();

const verifyGitHubWebhook = (req: Request, res: Response, next: express.NextFunction) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip verification (dev only)
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    return res.status(401).json({ error: 'No signature provided' });
  }

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', secret);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
};

router.post('/github', verifyGitHubWebhook, async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'ping') {
    return res.status(200).send('pong');
  }

  try {
    if (event === 'projects_v2_item' && payload.action === 'edited') {
      const item = payload.projects_v2_item;
      const changes = payload.changes;

      if (changes?.field_value?.field_name === 'Status') {
        const newStatusStr = changes.field_value.to;

        if (newStatusStr && item?.content_node_id) {
          const contentNodeId = item.content_node_id;

          const result = await query(
            'UPDATE tickets SET status = $1, updated_at = NOW() WHERE github_issue_node_id = $2 RETURNING *',
            [newStatusStr, contentNodeId]
          );

          if (result.rows.length > 0) {
            const updatedTicket = result.rows[0];
            console.log(`[webhook] Updated ticket ${updatedTicket.id} status to ${newStatusStr}`);

            await ticketService.logTicketActivity(
              updatedTicket.id,
              null,
              'status_changed',
              `GitHub Project status updated to ${newStatusStr}`,
              `System automatically synced status to ${newStatusStr}`
            );

            // Emit socket event so connected clients refresh
            emitToOrg(updatedTicket.organisation_id, 'ticket:updated', updatedTicket);
          }
        }
      }
    } else if (event === 'issues') {
      const issue = payload.issue;
      const action = payload.action;

      if (action === 'closed' || action === 'reopened') {
        const mappedStatus = action === 'closed' ? 'Done' : 'To triage';
        const issueNodeId = issue.node_id;

        const result = await query(
          'UPDATE tickets SET status = $1, updated_at = NOW() WHERE github_issue_node_id = $2 RETURNING *',
          [mappedStatus, issueNodeId]
        );

        if (result.rows.length > 0) {
          const updatedTicket = result.rows[0];
          console.log(`[webhook] Updated ticket ${updatedTicket.id} status to ${mappedStatus} from issue ${action}`);

          await ticketService.logTicketActivity(
            updatedTicket.id,
            null,
            'status_changed',
            `GitHub Issue ${action}`,
            `System automatically synced status to ${mappedStatus}`
          );

          emitToOrg(updatedTicket.organisation_id, 'ticket:updated', updatedTicket);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing github webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
