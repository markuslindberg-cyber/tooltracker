import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    const { uttaqId } = await req.json();
    
    if (!uttaqId) {
      return Response.json({ error: 'Missing uttaqId in request payload' }, { status: 400 });
    }
    
    // Verifiera att det finns
    let found = null;
    try {
      found = await base44.asServiceRole.entities.Uttag.get(uttaqId);
    } catch (e) {
      return Response.json({ error: 'get failed: ' + e.message });
    }

    // Försök radera
    try {
      const result = await base44.asServiceRole.entities.Uttag.delete(uttaqId);
      return Response.json({ success: true, deleted: uttaqId, result });
    } catch (e) {
      return Response.json({ delete_error: e.message, found_before: !!found });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});