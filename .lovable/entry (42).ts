import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'ägare'].includes(user.role)) {
    return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
  }

  const { categoryId, categoryName, entityType } = await req.json();

  if (!categoryId || !categoryName || !entityType) {
    return Response.json({ error: 'Ogiltiga parametrar' }, { status: 400 });
  }

  // Check if any items still use this category
  const entityMap = {
    Tool: base44.asServiceRole.entities.Tool,
    HandTool: base44.asServiceRole.entities.HandTool,
    'ArbetskläderUtrustning': base44.asServiceRole.entities.ArbetskläderUtrustning,
    LokalvardsArtikel: null,
  };

  const entity = entityMap[entityType];
  if (entity) {
    const items = await entity.list(null, 100000);
    const using = items.filter(item => item.category === categoryName);
    if (using.length > 0) {
      return Response.json({ error: 'ITEMS_EXIST', count: using.length }, { status: 409 });
    }
  }

  await base44.asServiceRole.entities.Category.delete(categoryId);
  return Response.json({ success: true });
});