import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const emailStyle = `
  font-family: Arial, sans-serif;
  background: #f5f5f5;
  padding: 40px 20px;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 8px;
  max-width: 560px;
  margin: 0 auto;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
`;

const headerStyle = `
  background: #2563eb;
  padding: 28px 32px;
  text-align: center;
`;

const bodyStyle = `
  padding: 32px;
  color: #333;
`;

const tableStyle = `
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
`;

const labelCellStyle = `
  padding: 10px 14px;
  background: #f9f9f9;
  font-size: 13px;
  color: #777;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 42%;
  border-bottom: 1px solid #eee;
`;

const valueCellStyle = `
  padding: 10px 14px;
  font-size: 14px;
  color: #222;
  border-bottom: 1px solid #eee;
`;

const buttonStyle = `
  display: inline-block;
  background: #2563eb;
  color: #fff;
  padding: 12px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  margin: 20px 0;
`;

const footerStyle = `
  text-align: center;
  padding: 20px 32px;
  font-size: 12px;
  color: #aaa;
  border-top: 1px solid #f0f0f0;
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/+$/, '') || '';
    const payload = await req.json();

    // Generate sequential request number
    const existingRequests = await base44.asServiceRole.entities.WorkwearRequest.list('-request_number', 1);
    const nextNumber = existingRequests.length > 0 && existingRequests[0].request_number
      ? existingRequests[0].request_number + 1
      : 1;
    payload.request_number = nextNumber;

    const request = await base44.entities.WorkwearRequest.create(payload);

    // Find all admin_lokalvård users to notify
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();
    const admins = teamMembers.filter(m =>
      m.is_active &&
      m.email &&
      (m.role === 'admin lokalvård' || m.role === 'admin_lokalvård' || m.role === 'ägare')
    );

    const itemList = (payload.requested_items || [])
      .map(i => `<li style="margin:4px 0;">${i.name}${i.subcategory ? ` (${i.subcategory})` : ''} — ${i.quantity} st</li>`)
      .join('');

    for (const admin of admins) {
      const emailBody = `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      <h2 style="margin:0; color:#fff; font-size:20px;">👔 Ny begäran – Arbetskläder</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${admin.name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">En ny begäran om arbetskläder/skyddsutrustning har inkommit och väntar på godkännande.</p>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Begärd av</td>
          <td style="${valueCellStyle}">${payload.requested_by_name || user.full_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Mottagare</td>
          <td style="${valueCellStyle}">${payload.customer_name || '—'}</td>
        </tr>
      </table>

      <p style="font-size:13px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Artiklar</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${itemList}
      </ul>

      ${payload.notes ? `<div style="background:#f0f4ff; border-left:4px solid #4a6cf7; border-radius:4px; padding:14px 18px; margin:20px 0; font-size:14px; color:#333; font-style:italic;"><strong>Anteckning:</strong> ${payload.notes}</div>` : ''}

      <div style="text-align: center; margin-top: 24px;">
        <a href="${origin}/Arbetsklader/Forfragan" style="${buttonStyle}">Öppna ToolTrack</a>
      </div>
    </div>

  </div>
</div>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Ny begäran om arbetskläder från ${payload.requested_by_name || user.full_name}`,
        body: emailBody,
      });
    }

    return Response.json({ success: true, request });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});