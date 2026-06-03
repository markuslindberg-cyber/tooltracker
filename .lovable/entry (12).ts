import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }
    
    // Get all active tools
    const allTools = await base44.asServiceRole.entities.Tool.list('-created_date', 2000);
    const activeTools = allTools.filter(t => !t.is_deleted);

    // Separate by import date (looking at created_date timestamps)
    const jan2026 = activeTools.filter(t => {
      const date = new Date(t.created_date);
      return date.getFullYear() === 2026 && date.getMonth() === 0; // January
    });

    const apr2026 = activeTools.filter(t => {
      const date = new Date(t.created_date);
      return date.getFullYear() === 2026 && date.getMonth() === 3; // April
    });

    // Find duplicates: same name + manufacturer + model_number
    const toDelete = [];
    
    jan2026.forEach(janTool => {
      const hasMatch = apr2026.some(aprTool =>
        janTool.name === aprTool.name &&
        janTool.manufacturer === aprTool.manufacturer &&
        janTool.model_number === aprTool.model_number
      );
      if (hasMatch) {
        toDelete.push(janTool.id);
      }
    });

    // Also soft-delete all with status = 'sålda' or 'retired' (should be in trash already but just in case)
    const soldRetired = activeTools.filter(t => 
      t.status === 'sålda' || t.status === 'retired' || t.status === 'missing'
    );
    soldRetired.forEach(t => toDelete.push(t.id));

    // Remove duplicates from array
    const uniqueToDelete = [...new Set(toDelete)];

    // Soft-delete all marked items
    let deletedCount = 0;
    for (const id of uniqueToDelete) {
      await base44.asServiceRole.entities.Tool.update(id, {
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });
      deletedCount++;
    }

    return Response.json({ 
      message: `Removed ${deletedCount} items`,
      jan_duplicates: toDelete.filter(id => jan2026.find(t => t.id === id)).length,
      sold_retired_missing: soldRetired.length,
      total_active_remaining: activeTools.length - uniqueToDelete.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});