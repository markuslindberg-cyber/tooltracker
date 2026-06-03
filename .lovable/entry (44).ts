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

    let deletedCount = 0;
    const details = [];

    // För varje grupp, behåll den första och ta bort resten
    for (const [key, items] of Object.entries(grouped)) {
      if (items.length > 1) {
        // Sortera efter created_date och behåll den äldsta
        items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        // Ta bort alla utom den första
        for (let i = 1; i < items.length; i++) {
          await base44.entities.LokalvardInköp.delete(items[i].id);
          deletedCount++;
          details.push({
            kept: items[0].id,
            deleted: items[i].id,
            artikelId: items[0].artikel_id,
            datum: items[0].datum,
            antal: items[0].antal,
            pris: items[0].pris
          });
        }
      }
    }

    return Response.json({
      success: true,
      totalInkop: allInkop.length,
      deletedDuplicates: deletedCount,
      details
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});