import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'admin_lokalvård', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const allArtiklar = await base44.entities.LokalvardsArtikel.list(null, 10000);
    
    // Hitta alla artiklar med streckkod eller artikelnummer = 71617
    const matches = allArtiklar.filter(a => 
      a.streckkod === '71617' || 
      a.artikelnummer === '71617' ||
      a.old_streckkod === '71617' ||
      a.id === '71617'
    );

    return Response.json({
      searchTerm: '71617',
      matchCount: matches.length,
      matches: matches.map(a => ({
        id: a.id,
        benamning: a.benamning,
        artikelnummer: a.artikelnummer,
        streckkod: a.streckkod,
        old_streckkod: a.old_streckkod
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});