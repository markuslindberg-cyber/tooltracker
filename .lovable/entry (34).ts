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

    // Hämta alla artiklar
    const allArtiklar = await base44.entities.LokalvardsArtikel.list(null, 10000);
    
    // Gruppera efter streckkod
    const grouped = {};
    allArtiklar.forEach(a => {
      if (!a.streckkod) return;
      if (!grouped[a.streckkod]) grouped[a.streckkod] = [];
      grouped[a.streckkod].push(a);
    });

    let mergedCount = 0;
    const results = [];

    // Processa varje grupp med duplikat
    for (const [streckkod, artiklar] of Object.entries(grouped)) {
      if (artiklar.length <= 1) continue; // Hoppa över grupper utan duplikat

      // Sortera efter inköpsdatum, senaste sist
      const sorted = artiklar.sort((a, b) => 
        new Date(a.inkopsdatum).getTime() - new Date(b.inkopsdatum).getTime()
      );

      const latest = sorted[sorted.length - 1];
      const older = sorted.slice(0, -1);

      // Summera alla antal_inkopta
      const totalAntal = artiklar.reduce((sum, a) => sum + (a.antal_inkopta || 0), 0);

      // Uppdatera senaste artikel med sammanslaget antal
      await base44.entities.LokalvardsArtikel.update(latest.id, {
        antal_inkopta: totalAntal
      });

      // Spara äldre inköp som inköpshistorik
      const inkopHistorik = older.map(a => ({
        artikel_id: latest.id,
        datum: a.inkopsdatum,
        antal: a.antal_inkopta,
        pris: a.pris
      }));

      // Skapa inköpshistorik-poster
      if (inkopHistorik.length > 0) {
        await base44.entities.LokalvardInköp.bulkCreate(inkopHistorik);
      }

      // Radera de äldre artiklarna
      for (const oldArtikel of older) {
        await base44.entities.LokalvardsArtikel.delete(oldArtikel.id);
      }

      mergedCount++;
      results.push({
        streckkod,
        merged: older.length,
        keptArticleId: latest.id,
        totalAntal,
        oldArticleIds: older.map(a => a.id)
      });
    }

    return Response.json({
      success: true,
      mergedGroups: mergedCount,
      details: results,
      message: `Merged ${mergedCount} article groups`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});