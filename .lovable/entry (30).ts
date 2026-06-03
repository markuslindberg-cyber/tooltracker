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

    const { artikelId } = await req.json();
    
    const allInkop = await base44.entities.LokalvardInköp.list(null, 10000);
    const filtered = allInkop.filter(i => i.artikel_id === artikelId);

    return Response.json({
      total: filtered.length,
      items: filtered.map(i => ({
        id: i.id,
        artikel_id: i.artikel_id,
        datum: i.datum,
        antal: i.antal,
        pris: i.pris,
        created_date: i.created_date,
        updated_date: i.updated_date
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});