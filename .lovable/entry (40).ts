import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }
    const allTools = await base44.asServiceRole.entities.Tool.list('-created_date', 2000);
    const active = allTools.filter(t => !t.is_deleted);

    // Group by name + manufacturer + model_number
    const grouped = {};
    active.forEach(t => {
      const key = `${t.name}|${t.manufacturer || ''}|${t.model_number || ''}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    // Find duplicates (groups with >1 item), keep newest, delete others
    const toDelete = [];
    Object.entries(grouped).forEach(([key, tools]) => {
      if (tools.length > 1) {
        // Sort by created_date, keep the newest (last one)
        const sorted = tools.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        // Delete all except the first (newest)
        for (let i = 1; i < sorted.length; i++) {
          toDelete.push(sorted[i].id);
        }
      }
    });

    // Soft-delete duplicates
    let count = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.Tool.update(id, {
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });
      count++;
      if (count % 10 === 0) await new Promise(r => setTimeout(r, 50));
    }

    return Response.json({ 
      duplicates_found: Object.values(grouped).filter(g => g.length > 1).length,
      deleted: count,
      remaining: active.length - count
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});