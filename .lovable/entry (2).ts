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

const commentBoxStyle = (color) => `
  background: ${color}18;
  border-left: 4px solid ${color};
  border-radius: 4px;
  padding: 14px 18px;
  margin: 20px 0;
  font-size: 14px;
  color: #333;
  font-style: italic;
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

    const { loan_request_id, approved, approver_comment, adjusted_return_date, approved_tool_ids } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.get(loan_request_id);

    // Rollkontroll: godkännaren, admin eller ägare
    const isApprover = user.email === loanRequest.approver_email;
    const isPrivileged = ['admin', 'ägare'].includes(user.role);
    if (!isApprover && !isPrivileged) {
      return Response.json({ error: 'Forbidden: Endast godkännaren, admin eller ägare kan utföra denna åtgärd' }, { status: 403 });
    }
    if (!loanRequest) {
      return Response.json({ error: 'Loan request not found' }, { status: 404 });
    }

    const status = approved ? 'approved' : 'rejected';

    // Handle partial approval: filter tool_ids and tool_names
    let updateData = {
      status,
      approval_date: new Date().toISOString(),
      approver_comment: approver_comment || '',
    };

    if (approved && adjusted_return_date) {
      updateData.default_return_date = adjusted_return_date;
      // Also update all tool_details return dates
      if (loanRequest.tool_details) {
        updateData.tool_details = loanRequest.tool_details.map(t => ({ ...t, return_date: adjusted_return_date }));
      }
    }

    if (approved && approved_tool_ids && approved_tool_ids.length < loanRequest.tool_ids.length) {
      // Partial approval: only keep approved tools
      const approvedSet = new Set(approved_tool_ids);
      updateData.tool_ids = loanRequest.tool_ids.filter(id => approvedSet.has(id));
      updateData.tool_names = loanRequest.tool_details
        ? loanRequest.tool_details.filter(t => approvedSet.has(t.tool_id)).map(t => t.tool_name)
        : loanRequest.tool_names.filter((_, i) => approvedSet.has(loanRequest.tool_ids[i]));
      updateData.tool_details = loanRequest.tool_details
        ? loanRequest.tool_details.filter(t => approvedSet.has(t.tool_id))
        : loanRequest.tool_details;
    }

    const updated = await base44.entities.LoanRequest.update(loan_request_id, updateData);

    // Fetch TeamMember data to check subscriptions
    const teamMembers = await base44.entities.TeamMember.list();
    const getSubscriptionStatus = (email) => {
      const member = teamMembers.find(m => m.email === email);
      return member?.subscribed_to_emails !== false;
    };

    const toolList = loanRequest.tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
    const commentSection = approver_comment
      ? `<div style="${commentBoxStyle(approved ? '#16a34a' : '#dc2626')}"><strong>Kommentar från godkännaren:</strong> ${approver_comment}</div>`
      : '';

    if (approved) {
      // --- GODKÄND MAIL till sökanden ---
      if (getSubscriptionStatus(loanRequest.requested_by_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.requested_by_email,
        subject: `✅ Låneförfrågan godkänd: ${loanRequest.tool_names.join(', ')}`,
        body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#16a34a')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">✅ Låneförfrågan godkänd</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${loanRequest.requested_by_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Din förfrågan om lån av maskiner har <strong style="color:#16a34a;">godkänts</strong> av ${loanRequest.approver_name}.</p>

      <p style="font-size:13px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Godkända maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Godkänd av</td>
          <td style="${valueCellStyle}">${loanRequest.approver_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Låntagare</td>
          <td style="${valueCellStyle}">${loanRequest.assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${loanRequest.destination_location_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Återlämning</td>
          <td style="${valueCellStyle}">${new Date(loanRequest.default_return_date).toLocaleDateString('sv-SE')}</td>
        </tr>
      </table>
      ${commentSection}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
      });
      }

      // --- GODKÄND: notis till destinationsplatsens ansvarig ---
      if (loanRequest.destination_location_manager_email && loanRequest.destination_location_manager_email !== user.email && getSubscriptionStatus(loanRequest.destination_location_manager_email)) {
        await base44.integrations.Core.SendEmail({
          to: loanRequest.destination_location_manager_email,
          subject: `Maskiner på väg till er: ${loanRequest.tool_names.join(', ')}`,
          body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#2563eb')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">📦 Maskiner godkända för lån till er</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${loanRequest.destination_location_manager_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Följande maskiner har godkänts och är på väg till er plats.</p>

      <p style="font-size:13px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Lånas av</td>
          <td style="${valueCellStyle}">${loanRequest.assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Återlämning</td>
          <td style="${valueCellStyle}">${new Date(loanRequest.default_return_date).toLocaleDateString('sv-SE')}</td>
        </tr>
      </table>
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
        });
      }

      // --- GODKÄND: bekräftelse till godkännaren själv ---
      if (getSubscriptionStatus(user.email)) {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Du godkände låneförfrågan: ${loanRequest.tool_names.join(', ')}`,
        body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#16a34a')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">✅ Du godkände en låneförfrågan</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${loanRequest.approver_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Du har godkänt följande låneförfrågan från <strong>${loanRequest.requested_by_name}</strong>.</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">${toolList}</ul>
      <table style="${tableStyle}">
        <tr><td style="${labelCellStyle}">Begärd av</td><td style="${valueCellStyle}">${loanRequest.requested_by_name}</td></tr>
        <tr><td style="${labelCellStyle}">Destination</td><td style="${valueCellStyle}">${loanRequest.destination_location_name}</td></tr>
        <tr><td style="${labelCellStyle}">Återlämning</td><td style="${valueCellStyle}">${new Date(loanRequest.default_return_date).toLocaleDateString('sv-SE')}</td></tr>
      </table>
      ${commentSection}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
      });
      }

    } else {
      // --- NEKAD MAIL ---
      if (getSubscriptionStatus(loanRequest.requested_by_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.requested_by_email,
        subject: `❌ Låneförfrågan nekad: ${loanRequest.tool_names.join(', ')}`,
        body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#dc2626')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">❌ Låneförfrågan nekad</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${loanRequest.requested_by_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Din förfrågan om lån av maskiner har tyvärr <strong style="color:#dc2626;">nekats</strong> av ${loanRequest.approver_name}.</p>

      <p style="font-size:13px; font-weight:700; color:#dc2626; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Berörda maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Nekad av</td>
          <td style="${valueCellStyle}">${loanRequest.approver_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${loanRequest.destination_location_name}</td>
        </tr>
      </table>
      ${commentSection}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
      });
      }

      // --- NEKAD: bekräftelse till godkännaren själv ---
      if (getSubscriptionStatus(user.email)) {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Du nekade låneförfrågan: ${loanRequest.tool_names.join(', ')}`,
        body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle('#dc2626')}">
      <h2 style="margin:0; color:#fff; font-size:20px;">❌ Du nekade en låneförfrågan</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${loanRequest.approver_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Du har nekat följande låneförfrågan från <strong>${loanRequest.requested_by_name}</strong>.</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">${toolList}</ul>
      ${commentSection}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
      });
      }
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});