import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all active tools
    const allTools = await base44.entities.Tool.list('-created_date', 2000);
    const activeTools = allTools.filter(t => !t.is_deleted);

    // Group by (name, manufacturer, model_number)
    const grouped = {};
    activeTools.forEach(tool => {
      const key = `${tool.name}|${tool.manufacturer}|${tool.model_number}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tool);
    });

    // Find and delete older duplicates
    const toDelete = [];
    Object.entries(grouped).forEach(([key, tools]) => {
      if (tools.length > 1) {
        // Sort by created_date descending (newest first)
        const sorted = tools.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        // Mark all but the newest as deleted
        sorted.slice(1).forEach(tool => {
          toDelete.push(tool.id);
        });
      }
    });

    // Soft-delete all duplicates
    let deletedCount = 0;
    for (const id of toDelete) {
      await base44.entities.Tool.update(id, {
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });
      deletedCount++;
    }

    return Response.json({ 
      message: `Removed ${deletedCount} duplicate tools, keeping newest versions`,
      deleted_count: deletedCount 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});