import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    const { deactivated_user_id, replacement_user_id } = await req.json();

    if (!deactivated_user_id) {
      return Response.json({ error: 'deactivated_user_id is required' }, { status: 400 });
    }

    // Get deactivated user info
    const deactivatedUsers = await base44.asServiceRole.entities.User.filter({ id: deactivated_user_id });
    if (!deactivatedUsers || deactivatedUsers.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const deactivatedUser = deactivatedUsers[0];

    // Get replacement user info if provided
    let replacementUser = null;
    if (replacement_user_id) {
      const replacementUsers = await base44.asServiceRole.entities.User.filter({ id: replacement_user_id });
      if (replacementUsers && replacementUsers.length > 0) {
        replacementUser = replacementUsers[0];
      }
    }

    // 1. Mark the user as inactive
    await base44.asServiceRole.entities.User.update(deactivated_user_id, {
      is_active: false
    });

    // 2. If replacement user provided, transfer active data
    if (replacementUser) {
      // Inactivate TeamMember
      const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ 
        email: deactivatedUser.email 
      });
      if (teamMembers && teamMembers.length > 0) {
        await base44.asServiceRole.entities.TeamMember.update(teamMembers[0].id, {
          is_active: false
        });
      }

      // Transfer Location responsibilities and team membership
      const locations = await base44.asServiceRole.entities.Location.list();
      for (const location of locations) {
        let updated = false;
        const updates = {};

        // Transfer responsible person
        if (location.responsible_person_email === deactivatedUser.email) {
          updates.responsible_person_id = replacement_user_id;
          updates.responsible_person_name = replacementUser.full_name;
          updates.responsible_person_email = replacementUser.email;
          updated = true;
        }

        // Remove from team_member_ids and add replacement if not already there
        if (location.team_member_ids && location.team_member_ids.includes(deactivated_user_id)) {
          const newIds = location.team_member_ids.filter(id => id !== deactivated_user_id);
          if (!newIds.includes(replacement_user_id)) {
            newIds.push(replacement_user_id);
          }
          updates.team_member_ids = newIds;

          const newNames = location.team_member_names ? 
            location.team_member_names.filter(name => name !== deactivatedUser.full_name) : [];
          if (!newNames.includes(replacementUser.full_name)) {
            newNames.push(replacementUser.full_name);
          }
          updates.team_member_names = newNames;
          updated = true;
        }

        if (updated) {
          await base44.asServiceRole.entities.Location.update(location.id, updates);
        }
      }

      // Transfer Tool assignments
      const tools = await base44.asServiceRole.entities.Tool.list();
      for (const tool of tools) {
        if (tool.assigned_to_email === deactivatedUser.email) {
          await base44.asServiceRole.entities.Tool.update(tool.id, {
            assigned_to_email: replacementUser.email,
            assigned_to_name: replacementUser.full_name
          });
        }
      }

      // Transfer HandTool assignments
      const handTools = await base44.asServiceRole.entities.HandTool.list();
      for (const tool of handTools) {
        if (tool.assigned_to_email === deactivatedUser.email) {
          await base44.asServiceRole.entities.HandTool.update(tool.id, {
            assigned_to_email: replacementUser.email,
            assigned_to_name: replacementUser.full_name
          });
        }
      }

      // Transfer LoanRequest assignments
      const loanRequests = await base44.asServiceRole.entities.LoanRequest.list();
      for (const request of loanRequests) {
        let updated = false;
        const updates = {};

        if (request.assigned_to_email === deactivatedUser.email) {
          updates.assigned_to_email = replacementUser.email;
          updates.assigned_to_name = replacementUser.full_name;
          updated = true;
        }

        if (request.destination_location_manager_email === deactivatedUser.email) {
          updates.destination_location_manager_email = replacementUser.email;
          updates.destination_location_manager_name = replacementUser.full_name;
          updated = true;
        }

        if (request.approver_email === deactivatedUser.email && !request.approval_date) {
          updates.approver_email = replacementUser.email;
          updates.approver_name = replacementUser.full_name;
          updated = true;
        }

        if (updated) {
          await base44.asServiceRole.entities.LoanRequest.update(request.id, updates);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: 'User deactivated and data transferred successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});