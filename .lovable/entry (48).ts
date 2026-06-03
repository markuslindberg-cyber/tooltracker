import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const { original_request_id, new_return_date, extension_comment } = await req.json();

    const originalRequest = await base44.entities.LoanRequest.get(original_request_id);
    if (!originalRequest) {
      return Response.json({ error: 'Original loan request not found' }, { status: 404 });
    }

    // Rollkontroll: tilldelad person, admin eller ägare
    const isAssigned = user.email === originalRequest.assigned_to_email;
    const isRequester = user.email === originalRequest.requested_by_email;
    if (!isAssigned && !isRequester && !['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Ingen behörighet att förlänga detta lån' }, { status: 403 });
    }

    const extensionRequest = await base44.entities.LoanRequest.create({
      tool_ids: originalRequest.tool_ids,
      tool_names: originalRequest.tool_names,
      tool_details: originalRequest.tool_details.map(td => ({ ...td, return_date: new_return_date })),
      requested_by_email: user.email,
      requested_by_name: user.full_name,
      assigned_to_email: originalRequest.assigned_to_email,
      assigned_to_name: originalRequest.assigned_to_name,
      destination_location_id: originalRequest.destination_location_id,
      destination_location_name: originalRequest.destination_location_name,
      default_return_date: new_return_date,
      requester_comment: extension_comment || '',
      approver_email: originalRequest.approver_email,
      approver_name: originalRequest.approver_name,
      destination_location_manager_email: originalRequest.destination_location_manager_email,
      destination_location_manager_name: originalRequest.destination_location_manager_name,
      is_extension_request: true,
      original_request_id: original_request_id,
      status: 'pending'
    });

    const toolList = originalRequest.tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
    const commentSection = extension_comment
      ? `<div style="background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #333; font-style: italic;"><strong>Kommentar:</strong> ${extension_comment}</div>`
      : '';
    const oldDate = new Date(originalRequest.default_return_date).toLocaleDateString('sv-SE');
    const newDate = new Date(new_return_date).toLocaleDateString('sv-SE');

    // Fetch TeamMember data to check subscriptions
    const teamMembers = await base44.entities.TeamMember.list();
    const getSubscriptionStatus = (email) => {
      const member = teamMembers.find(m => m.email === email);
      return member?.subscribed_to_emails !== false;
    };

    const buildExtensionEmail = (recipientName, isApprover) => `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="background: #2563eb; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">🔄 Förlängningsbegäran för lån</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${recipientName}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;"><strong>${user.full_name}</strong> har begärt en förlängning av lånet för följande maskiner.</p>

      <p style="font-size:13px; font-weight:700; color:#2563eb; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Begärd av</td>
          <td style="${valueCellStyle}">${user.full_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Nuvarande datum</td>
          <td style="${valueCellStyle}">${oldDate}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Nytt datum</td>
          <td style="${valueCellStyle}"><strong style="color:#2563eb;">${newDate}</strong></td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${originalRequest.destination_location_name}</td>
        </tr>
      </table>

      ${commentSection}

      ${isApprover ? `<p style="font-size:13px; color:#888; margin-top:24px;">Logga in i ToolTrack för att godkänna eller neka förlängningen.</p>` : ''}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;

    // Collect unique recipients
    const sentTo = new Set();

    // 1. Mail till godkännaren (ansvarig för ursprungsplatsen) – med uppmaning att godkänna
    if (originalRequest.approver_email && getSubscriptionStatus(originalRequest.approver_email)) {
      await base44.integrations.Core.SendEmail({
        to: originalRequest.approver_email,
        subject: `🔄 Förlängningsbegäran för lån: ${originalRequest.tool_names.join(', ')}`,
        body: buildExtensionEmail(originalRequest.approver_name, true)
      });
      sentTo.add(originalRequest.approver_email);
    }

    // 2. Kopia till destinationsplatsens ansvarige
    if (originalRequest.destination_location_manager_email && !sentTo.has(originalRequest.destination_location_manager_email) && getSubscriptionStatus(originalRequest.destination_location_manager_email)) {
      await base44.integrations.Core.SendEmail({
        to: originalRequest.destination_location_manager_email,
        subject: `🔄 Förlängningsbegäran för lån: ${originalRequest.tool_names.join(', ')}`,
        body: buildExtensionEmail(originalRequest.destination_location_manager_name || '', false)
      });
      sentTo.add(originalRequest.destination_location_manager_email);
    }

    // 3. Mail till beställaren (om inte samma som den som begär förlängningen)
    if (originalRequest.requested_by_email && !sentTo.has(originalRequest.requested_by_email) && originalRequest.requested_by_email !== user.email && getSubscriptionStatus(originalRequest.requested_by_email)) {
      await base44.integrations.Core.SendEmail({
        to: originalRequest.requested_by_email,
        subject: `🔄 Förlängningsbegäran för lån: ${originalRequest.tool_names.join(', ')}`,
        body: buildExtensionEmail(originalRequest.requested_by_name || '', false)
      });
    }

    return Response.json({ success: true, extensionRequest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});