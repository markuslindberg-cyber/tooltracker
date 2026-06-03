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

    const allInkop = await base44.entities.LokalvardInköp.list(null, 10000);
    
    // Hitta två inköp med samma datum, antal men möjligt olika pris
    const grouped = {};
    allInkop.forEach(inkop => {
      const key = `${inkop.artikel_id}|${inkop.datum}|${inkop.antal}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(inkop);
    });

    // Hitta grupper med flera items
    const duplicates = Object.entries(grouped).filter(([key, items]) => items.length > 1);

    return Response.json({
      totalInkop: allInkop.length,
      groupsWithDuplicates: duplicates.length,
      samples: duplicates.slice(0, 5).map(([key, items]) => ({
        key,
        count: items.length,
        items: items.map(i => ({
          id: i.id,
          artikel_id: i.artikel_id,
          datum: i.datum,
          antal: i.antal,
          pris: i.pris,
          prisType: typeof i.pris
        }))
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});