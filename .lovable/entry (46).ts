import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    // Bygg artikelMap
    const artiklar = await base44.asServiceRole.entities.LokalvardsArtikel.list(null, 100000);
    const artikelMap = {};
    artiklar.forEach(a => {
      artikelMap[a.id] = a;
      if (a.streckkod) artikelMap[a.streckkod] = a;
      if (a.old_streckkod) artikelMap[a.old_streckkod] = a;
    });

    // Hämta alla uttag
    const uttag = await base44.asServiceRole.entities.Uttag.list(null, 100000);

    // Hitta omatchade
    const toDelete = [];
    for (const u of uttag) {
      const artiklarList = u.artiklar || [];
      if (artiklarList.length === 0) continue;
      const allUnmatched = artiklarList.every(a => {
        const found = (a.artikel_id && artikelMap[a.artikel_id]) || (a.benamning && artikelMap[a.benamning]);
        return !found;
      });
      if (allUnmatched) toDelete.push(u.id);
    }

    let deleted = 0;
    const errors = [];

    for (const id of toDelete) {
      try {
        await base44.asServiceRole.entities.Uttag.delete(id);
        deleted++;
      } catch (e) {
        errors.push({ id, error: e.message });
      }
    }

    return Response.json({
      total_uttag: uttag.length,
      identified: toDelete.length,
      deleted,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});