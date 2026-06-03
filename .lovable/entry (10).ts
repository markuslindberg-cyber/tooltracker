import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }
    
    const allTools = await base44.asServiceRole.entities.Tool.list('-updated_date', 1000);
    
    const oldCategories = ['0', 'ah', 'safety', 'Power_tools', 'Hand_tools'];
    const toolsWithOldCats = allTools.filter(tool => oldCategories.includes(tool.category));
    
    const uniqueCategories = [...new Set(allTools.map(t => t.category).filter(Boolean))];

    return Response.json({
      totalTools: allTools.length,
      toolsWithOldCategories: toolsWithOldCats.length,
      toolsWithOldCategoryDetails: toolsWithOldCats.map(t => ({ id: t.id, name: t.name, category: t.category })),
      allCategories: uniqueCategories
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});