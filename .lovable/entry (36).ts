import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin_lokalvård', 'admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin lokalvård, admin eller ägare krävs' }, { status: 403 });
    }

    // Hämta alla inköp
    const allInkop = await base44.entities.LokalvardInköp.list(null, 10000);
    
    // Gruppera efter artikel_id + datum + antal + pris
    const grouped = {};
    allInkop.forEach(inkop => {
      const key = `${inkop.artikel_id}|${inkop.datum}|${inkop.antal}|${inkop.pris}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(inkop);
    });

    // Hitta och ta bort dubletter
    const duplicates = [];
    const toDelete = [];

    for (const [key, items] of Object.entries(grouped)) {
      if (items.length > 1) {
        // Behåll den första, ta bort resten
        const [kept, ...extras] = items.sort((a, b) => 
          new Date(a.created_date) - new Date(b.created_date)
        );
        
        duplicates.push({
          key,
          kept: kept.id,
          deleted: extras.map(e => e.id),
          count: items.length
        });

        for (const extra of extras) {
          await base44.entities.LokalvardInköp.delete(extra.id);
          toDelete.push(extra.id);
        }
      }
    }

    return Response.json({
      success: true,
      totalInkop: allInkop.length,
      duplicateGroups: duplicates.length,
      deletedRecords: toDelete.length,
      details: duplicates
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});