import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Ansvarig bekräftar att de tagit emot den returnerade utrustningen

const emailStyle = `font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px 20px;`;
const cardStyle = `background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);`;
const bodyStyle = `padding: 32px; color: #333;`;
const tableStyle = `width: 100%; border-collapse: collapse; margin: 20px 0;`;
const labelCellStyle = `padding: 10px 14px; background: #f9f9f9; font-size: 13px; color: #777; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 42%; border-bottom: 1px solid #eee;`;
const valueCellStyle = `padding: 10px 14px; font-size: 14px; color: #222; border-bottom: 1px solid #eee;`;
const footerStyle = `text-align: center; padding: 20px 32px; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0;`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loan_request_id, comment } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.get(loan_request_id);
    if (!loanRequest) {
      return Response.json({ error: 'Loan request not found' }, { status: 404 });
    }

    // Rollkontroll: godkännaren, admin eller ägare
    const isApprover = user.email === loanRequest.approver_email;
    if (!isApprover && !['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Endast godkännaren, admin eller ägare kan bekräfta mottagning' }, { status: 403 });
    }

    if (loanRequest.status !== 'pending_return') {
      return Response.json({ error: 'Loan is not pending return confirmation' }, { status: 400 });
    }

    const dateStr = new Date().toLocaleDateString('sv-SE');

    const updated = await base44.entities.LoanRequest.update(loan_request_id, {
      status: 'returned',
      return_confirmed_by_name: user.full_name,
      return_confirmed_date: new Date().toISOString(),
      approver_comment: comment || loanRequest.approver_comment || ''
    });

    // Logga returnering och uppdatera anteckningar på varje verktyg
    const now = new Date().toISOString();
    const toolIds = loanRequest.tool_ids || [];
    await Promise.all(toolIds.map(async (toolId) => {
      await base44.asServiceRole.entities.ToolLog.create({
        tool_id: toolId,
        changed_by_email: user.email,
        changed_by_name: user.full_name,
        change_date: now,
        change_type: 'updated',
        field_name: 'status',
        old_value: 'in_use',
        new_value: 'returned',
        comment: comment || ''
      });

      if (comment) {
        const tool = await base44.asServiceRole.entities.Tool.get(toolId);
        const existingNotes = tool?.notes || '';
        const newNote = `[${dateStr} – Återlämnad av ${loanRequest.assigned_to_name}, bekräftad av ${user.full_name}]: ${comment}`;
        const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
        await base44.asServiceRole.entities.Tool.update(toolId, { notes: updatedNotes });
      }
    }));

    const toolList = loanRequest.tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
    const commentSection = comment
      ? `<div style="background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #333; font-style: italic;"><strong>Kommentar från mottagaren:</strong> ${comment}</div>`
      : '';

    // Mail till låntagaren
    await base44.integrations.Core.SendEmail({
      to: loanRequest.assigned_to_email,
      subject: `✅ Återlämning bekräftad: ${loanRequest.tool_names.join(', ')}`,
      body: `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="background: #16a34a; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">✅ Återlämning bekräftad</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${loanRequest.assigned_to_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;"><strong>${user.full_name}</strong> har bekräftat mottagningen av maskinerna. Lånet är nu avslutat.</p>

      <p style="font-size:13px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Återlämnade maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Bekräftad av</td>
          <td style="${valueCellStyle}">${user.full_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Bekräftelsedatum</td>
          <td style="${valueCellStyle}">${dateStr}</td>
        </tr>
      </table>

      ${commentSection}

      <p style="font-size:14px; color:#555; margin-top:16px;">Tack för att du tog hand om utrustningen! 🙏</p>
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
    });

    // Fetch TeamMember data to check subscriptions
    const teamMembers = await base44.entities.TeamMember.list();
    const getSubscriptionStatus = (email) => {
      const member = teamMembers.find(m => m.email === email);
      return member?.subscribed_to_emails !== false;
    };

    const buildConfirmReturnEmail = (recipientName) => `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="background: #16a34a; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">✅ Återlämning bekräftad</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${recipientName}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Utrustning som lånades till <strong>${loanRequest.destination_location_name}</strong> har nu returnerats och bekräftats mottagen av ${user.full_name}. Lånet är nu avslutat.</p>

      <p style="font-size:13px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Återlämnade maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Låntagare</td>
          <td style="${valueCellStyle}">${loanRequest.assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Bekräftad av</td>
          <td style="${valueCellStyle}">${user.full_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Datum</td>
          <td style="${valueCellStyle}">${dateStr}</td>
        </tr>
      </table>

      ${commentSection}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;

    // Collect unique recipients to avoid duplicate emails
    const sentTo = new Set();

    // 1. Mail till destinationsplatsens ansvarige
    if (loanRequest.destination_location_manager_email && getSubscriptionStatus(loanRequest.destination_location_manager_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.destination_location_manager_email,
        subject: `✅ Återlämning bekräftad: ${loanRequest.tool_names.join(', ')}`,
        body: buildConfirmReturnEmail(loanRequest.destination_location_manager_name || '')
      });
      sentTo.add(loanRequest.destination_location_manager_email);
    }

    // 2. Mail till godkännaren (ansvarig för ursprungsplatsen) om det inte är samma person som bekräftar
    if (loanRequest.approver_email && !sentTo.has(loanRequest.approver_email) && loanRequest.approver_email !== user.email && getSubscriptionStatus(loanRequest.approver_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.approver_email,
        subject: `✅ Återlämning bekräftad: ${loanRequest.tool_names.join(', ')}`,
        body: buildConfirmReturnEmail(loanRequest.approver_name || '')
      });
      sentTo.add(loanRequest.approver_email);
    }

    // 3. Mail till beställaren (om inte redan fått mail)
    if (loanRequest.requested_by_email && !sentTo.has(loanRequest.requested_by_email) && loanRequest.requested_by_email !== loanRequest.assigned_to_email && getSubscriptionStatus(loanRequest.requested_by_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.requested_by_email,
        subject: `✅ Återlämning bekräftad: ${loanRequest.tool_names.join(', ')}`,
        body: buildConfirmReturnEmail(loanRequest.requested_by_name || '')
      });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});