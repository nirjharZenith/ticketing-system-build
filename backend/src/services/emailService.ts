import nodemailer from 'nodemailer';

// Configure the email transporter
// Using Ethereal Email for testing (comment out for production SMTP)
let transporter: any = null;

const initializeTransporter = async () => {
  if (transporter) return transporter;

  // For production, use your SMTP credentials:
  // transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: parseInt(process.env.SMTP_PORT || '587'),
  //   secure: process.env.SMTP_SECURE === 'true',
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASSWORD,
  //   },
  // });

  // For testing, use Ethereal Email
  if (process.env.NODE_ENV === 'development') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // Production SMTP configuration
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      } : undefined,
    });
  }

  return transporter;
};

export const sendTicketCreatedEmail = async (
  recipientEmail: string,
  ticketTitle: string,
  ticketId: string,
  creatorName: string
) => {
  try {
    const transporter = await initializeTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@ticketing.local',
      to: recipientEmail,
      subject: `New Ticket Created: ${ticketTitle}`,
      html: `
        <h2>New Ticket Created</h2>
        <p>A new ticket has been created in your organization:</p>
        <ul>
          <li><strong>Title:</strong> ${ticketTitle}</li>
          <li><strong>Ticket ID:</strong> ${ticketId}</li>
          <li><strong>Created by:</strong> ${creatorName}</li>
          <li><strong>Created at:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p><a href="http://localhost:3000">View ticket</a></p>
      `,
      text: `
New Ticket Created: ${ticketTitle}

Ticket ID: ${ticketId}
Created by: ${creatorName}
Created at: ${new Date().toLocaleString()}

View ticket at: http://localhost:3000
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[v0] Email sent:', info.messageId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[v0] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('[v0] Failed to send email:', error);
    // Don't throw error - email failure shouldn't break ticket creation
    return false;
  }
};

export const sendTicketUpdatedEmail = async (
  recipientEmail: string,
  ticketTitle: string,
  ticketId: string,
  updatedBy: string,
  changes: string
) => {
  try {
    const transporter = await initializeTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@ticketing.local',
      to: recipientEmail,
      subject: `Ticket Updated: ${ticketTitle}`,
      html: `
        <h2>Ticket Updated</h2>
        <p>A ticket has been updated:</p>
        <ul>
          <li><strong>Title:</strong> ${ticketTitle}</li>
          <li><strong>Ticket ID:</strong> ${ticketId}</li>
          <li><strong>Updated by:</strong> ${updatedBy}</li>
          <li><strong>Updated at:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Changes:</strong> ${changes}</li>
        </ul>
        <p><a href="http://localhost:3000">View ticket</a></p>
      `,
      text: `
Ticket Updated: ${ticketTitle}

Ticket ID: ${ticketId}
Updated by: ${updatedBy}
Updated at: ${new Date().toLocaleString()}
Changes: ${changes}

View ticket at: http://localhost:3000
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[v0] Email sent:', info.messageId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[v0] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('[v0] Failed to send email:', error);
    return false;
  }
};

export const sendAssignmentEmail = async (
  recipientEmail: string,
  ticketTitle: string,
  ticketId: string,
  assignedBy: string
) => {
  try {
    const transporter = await initializeTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@ticketing.local',
      to: recipientEmail,
      subject: `Ticket Assigned to You: ${ticketTitle}`,
      html: `
        <h2>Ticket Assigned to You</h2>
        <p>You have been assigned to a ticket:</p>
        <ul>
          <li><strong>Title:</strong> ${ticketTitle}</li>
          <li><strong>Ticket ID:</strong> ${ticketId}</li>
          <li><strong>Assigned by:</strong> ${assignedBy}</li>
          <li><strong>Assigned at:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p><a href="http://localhost:3000">View and manage ticket</a></p>
      `,
      text: `
Ticket Assigned to You: ${ticketTitle}

Ticket ID: ${ticketId}
Assigned by: ${assignedBy}
Assigned at: ${new Date().toLocaleString()}

View and manage ticket at: http://localhost:3000
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[v0] Email sent:', info.messageId);

    if (process.env.NODE_ENV === 'development') {
      console.log('[v0] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('[v0] Failed to send email:', error);
    return false;
  }
};
