import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const emailStyle = `font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px 20px;`;
const cardStyle = `background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);`;
const bodyStyle = `padding: 32px; color: #333;`;
const tableStyle = `width: 100%; border-collapse: collapse; margin: 20px 0;`;
const labelCellStyle = `padding: 10px 14px; background: #f9f9f9; font-size: 13px; color: #777; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 42%; border-bottom: 1px solid #eee;`;
const valueCellStyle = `padding: 10px 14px; font-size: 14px; color: #222; border-bottom: 1px solid #eee;`;
const footerStyle = `text-align: center; padding: 20px 32px; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0;`;

function buildCancelEmail({ recipient_name, tool_names, requester_name, destination, return_date, cancelled_by, comment }) {
  const toolList = tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
  const commentSection = comment
    ? `<div style="background:#fef9c3;border-left:4px solid #ca8a04;border-radius:4px;padding:14px 18px;margin:20px 0;font-size:14px;color:#333;font-style:italic;"><strong>Kommentar:</strong> ${comment}</div>`
    : '';

  return `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="background: #dc2626; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">❌ Låneförfrågan avbruten</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${recipient_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">En låneförfrågan har avbrutits av <strong>${cancelled_by}</strong>.</p>

      <p style="font-size:13px; font-weight:700; color:#dc2626; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Begärd av</td>
          <td style="${valueCellStyle}">${requester_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${destination}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Återlämning (planerad)</td>
          <td style="${valueCellStyle}">${new Date(return_date).toLocaleDateString('sv-SE')}</td>
        </tr>
      </table>

      ${commentSection}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { loan_request_id, comment } = await req.json();
    if (!loan_request_id) return Response.json({ error: 'loan_request_id krävs' }, { status: 400 });

    const loan = await base44.entities.LoanRequest.get(loan_request_id);
    if (!loan) return Response.json({ error: 'Låneförfrågan hittades inte' }, { status: 404 });

    // Rollkontroll: beställaren, godkännaren, admin eller ägare
    const isInvolved = [loan.requested_by_email, loan.approver_email, loan.assigned_to_email].includes(user.email);
    if (!isInvolved && !['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Ingen behörighet att avbryta denna förfrågan' }, { status: 403 });
    }

    // Mark as rejected (cancelled)
    await base44.entities.LoanRequest.update(loan_request_id, {
      status: 'rejected',
      approver_comment: comment || loan.approver_comment || '',
    });

    const emailData = {
      tool_names: loan.tool_names || [],
      requester_name: loan.requested_by_name || '—',
      destination: loan.destination_location_name || '—',
      return_date: loan.default_return_date,
      cancelled_by: user.full_name,
      comment: comment || ''
    };

    // Collect unique recipients (requester, approver, assigned person)
    const recipientMap = {};
    if (loan.requested_by_email) recipientMap[loan.requested_by_email] = loan.requested_by_name || loan.requested_by_email;
    if (loan.approver_email && loan.approver_email !== user.email) recipientMap[loan.approver_email] = loan.approver_name || loan.approver_email;
    if (loan.assigned_to_email) recipientMap[loan.assigned_to_email] = loan.assigned_to_name || loan.assigned_to_email;
    // Don't send to the person doing the cancellation
    delete recipientMap[user.email];

    for (const [email, name] of Object.entries(recipientMap)) {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `Låneförfrågan avbruten: ${(loan.tool_names || []).join(', ')}`,
        body: buildCancelEmail({ ...emailData, recipient_name: name })
      });
    }

    return Response.json({ success: true, sent_to: Object.keys(recipientMap) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});