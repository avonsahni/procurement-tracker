import { Resend } from 'resend';

const FROM  = 'ProcureTrack <no-reply@procuretrack.in>';
const ADMIN = 'admin@procuretrack.in';

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from:    FROM,
    to:      ADMIN,
    replyTo: data.email,
    subject: `New enquiry from ${data.name}${data.company ? ` — ${data.company}` : ''}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#2563eb;padding:24px 32px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">ProcureTrack · New Contact Enquiry</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:32px">
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr><td style="padding:10px 14px;background:#f8fafc;border-radius:4px;font-size:12px;font-weight:600;color:#64748b;width:100px;text-transform:uppercase">Name</td><td style="padding:10px 14px;font-size:15px">${data.name}</td></tr>
            <tr><td style="padding:10px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase">Email</td><td style="padding:10px 14px;font-size:15px"><a href="mailto:${data.email}" style="color:#2563eb">${data.email}</a></td></tr>
            ${data.phone ? `<tr><td style="padding:10px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase">Phone</td><td style="padding:10px 14px;font-size:15px">${data.phone}</td></tr>` : ''}
            ${data.company ? `<tr><td style="padding:10px 14px;background:#f8fafc;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase">Company</td><td style="padding:10px 14px;font-size:15px">${data.company}</td></tr>` : ''}
          </table>
          <div style="background:#f8fafc;border-left:3px solid #2563eb;padding:16px 20px;border-radius:0 4px 4px 0">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase">Message</p>
            <p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap">${data.message}</p>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">Reply directly to this email to respond to ${data.name}.</p>
        </div>
      </div>
    `,
  });
}
