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

const headerStyle = (color) => `
  background: ${color};
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

const commentBoxStyle = `
  background: #f0f4ff;
  border-left: 4px solid #4a6cf7;
  border-radius: 4px;
  padding: 14px 18px;
  margin: 20px 0;
  font-size: 14px;
  color: #333;
  font-style: italic;
`;

const buttonStyle = `
  display: inline-block;
  background: #8B1E1E;
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

function buildApproverEmail({ approver_name, tool_names, requester_name, assigned_to_name, destination, return_date, comment, origin }) {
  const toolList = tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
  const commentSection = comment
    ? `<div style="${commentBoxStyle}"><strong>Kommentar:</strong> ${comment}</div>`
    : '';

  return `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#8B1E1E')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">🔧 Ny låneförfrågan</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${approver_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">En ny förfrågan om lån av maskiner har inkommit och väntar på ditt godkännande.</p>
      
      <p style="font-size:13px; font-weight:700; color:#8B1E1E; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Begärd av</td>
          <td style="${valueCellStyle}">${requester_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Ska lånas av</td>
          <td style="${valueCellStyle}">${assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${destination}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Återlämning</td>
          <td style="${valueCellStyle}">${new Date(return_date).toLocaleDateString('sv-SE')}</td>
        </tr>
      </table>

      ${commentSection}

      <div style="text-align: center; margin-top: 24px;">
        <a href="${origin}/Transfers" style="${buttonStyle}">Öppna ToolTrack</a>
      </div>
      <p style="font-size:13px; color:#888; text-align:center; margin-top:16px;">Eller logga in för att godkänna eller neka förfrågan.</p>
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;
}

function buildDestManagerEmail({ manager_name, tool_names, assigned_to_name, return_date, comment, origin }) {
  const toolList = tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
  const commentSection = comment
    ? `<div style="${commentBoxStyle}"><strong>Kommentar:</strong> ${comment}</div>`
    : '';

  return `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#2563eb')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">📦 Maskiner lånade från er plats</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${manager_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Följande maskiner har begärts för lån från er plats.</p>

      <p style="font-size:13px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Lånas av</td>
          <td style="${valueCellStyle}">${assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Återlämning</td>
          <td style="${valueCellStyle}">${new Date(return_date).toLocaleDateString('sv-SE')}</td>
        </tr>
      </table>

      ${commentSection}

      <div style="text-align: center; margin-top: 24px;">
        <a href="${origin}/Transfers" style="${buttonStyle}">Öppna ToolTrack</a>
      </div>
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/+$/, '') || '';
    const {
      tool_ids, tool_names, tool_details,
      assigned_to_email, assigned_to_name,
      destination_location_id, destination_location_name,
      default_return_date, requester_comment,
      approver_email, approver_name,
      destination_location_manager_email, destination_location_manager_name
    } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.create({
      tool_ids, tool_names, tool_details,
      requested_by_email: user.email,
      requested_by_name: user.full_name,
      assigned_to_email, assigned_to_name,
      destination_location_id, destination_location_name,
      default_return_date,
      requester_comment: requester_comment || '',
      approver_email: approver_email || user.email,
      approver_name: approver_name || user.full_name,
      destination_location_manager_email,
      destination_location_manager_name,
      status: 'pending'
    });

    // Fetch TeamMember data to check subscriptions
    const teamMembers = await base44.entities.TeamMember.list();
    const getSubscriptionStatus = (email) => {
      const member = teamMembers.find(m => m.email === email);
      return member?.subscribed_to_emails !== false;
    };

    if (approver_email && getSubscriptionStatus(approver_email)) {
      await base44.integrations.Core.SendEmail({
        to: approver_email,
        subject: `Ny låneförfrågan från ${user.full_name}: ${tool_names.join(', ')}`,
        body: buildApproverEmail({
          approver_name,
          tool_names,
          requester_name: user.full_name,
          assigned_to_name,
          destination: destination_location_name,
          return_date: default_return_date,
          comment: requester_comment,
          origin
        })
      });
    }

    if (destination_location_manager_email && destination_location_manager_email !== approver_email && getSubscriptionStatus(destination_location_manager_email)) {
      await base44.integrations.Core.SendEmail({
        to: destination_location_manager_email,
        subject: `Maskiner begärda för lån: ${tool_names.join(', ')}`,
        body: buildDestManagerEmail({
          manager_name: destination_location_manager_name,
          tool_names,
          assigned_to_name,
          return_date: default_return_date,
          comment: requester_comment,
          origin
        })
      });
    }

    // Bekräftelsemail till beställaren - alltid skicka denna
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `Låneförfrågan skapad: ${tool_names.join(', ')}`,
      body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#555')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">📋 Låneförfrågan registrerad</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${user.full_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Din låneförfrågan har registrerats och skickats för godkännande till <strong>${approver_name || '—'}</strong>.</p>
      <p style="font-size:13px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('')}
      </ul>
      <table style="${tableStyle}">
        <tr><td style="${labelCellStyle}">Destination</td><td style="${valueCellStyle}">${destination_location_name}</td></tr>
        <tr><td style="${labelCellStyle}">Återlämning</td><td style="${valueCellStyle}">${new Date(default_return_date).toLocaleDateString('sv-SE')}</td></tr>
        <tr><td style="${labelCellStyle}">Godkänns av</td><td style="${valueCellStyle}">${approver_name || '—'}</td></tr>
      </table>
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
    });

    return Response.json({ success: true, loanRequest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});