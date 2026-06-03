/**
 * Beräknar totalt lagervärde för lokalvårdsartiklar baserat på inköp − uttag.
 * Samma logik som LokalvardLager-sidan.
 */
export function calculateLokalvardLagerValue(artiklar, uttag, inkop) {
  // Gruppera artiklar per streckkod
  const grouped = {};
  artiklar.forEach(artikel => {
    const streckkod = artikel.streckkod;
    if (!streckkod) return;

    if (!grouped[streckkod]) {
      grouped[streckkod] = {
        benamning: artikel.benamning,
        streckkod: artikel.streckkod,
        old_streckkod: artikel.old_streckkod,
        pris: artikel.pris,
        inkopsdatum: artikel.inkopsdatum,
        total_antal_inkopta: 0,
        all_artikel_ids: [],
      };
    }

    const g = grouped[streckkod];
    if (new Date(artikel.inkopsdatum) > new Date(g.inkopsdatum)) {
      g.pris = artikel.pris;
      g.inkopsdatum = artikel.inkopsdatum;
      g.benamning = artikel.benamning;
      if (artikel.old_streckkod) g.old_streckkod = artikel.old_streckkod;
    } else if (!g.old_streckkod && artikel.old_streckkod) {
      g.old_streckkod = artikel.old_streckkod;
    }
    g.total_antal_inkopta += artikel.antal_inkopta;
    g.all_artikel_ids.push(artikel.id);
  });

  const groups = Object.values(grouped);

  let totalValue = 0;
  for (const g of groups) {
    // Beräkna inköpt
    const matchingInkop = inkop.filter(i => g.all_artikel_ids.includes(i.artikel_id));
    const totalInkopt = matchingInkop.reduce((sum, i) => sum + i.antal, 0);
    const inkoptToUse = totalInkopt > 0 ? totalInkopt : g.total_antal_inkopta;

    // Beräkna uttag
    const totalUttag = uttag.reduce((sum, u) => {
      const items = u.artiklar?.filter(item => {
        if (item.benamning && item.benamning.toLowerCase() === g.benamning.toLowerCase()) return true;
        if (item.benamning === g.streckkod || item.benamning === g.old_streckkod) return true;
        if (g.all_artikel_ids.includes(item.artikel_id)) return true;
        if (item.artikel_id === g.streckkod || item.artikel_id === g.old_streckkod) return true;
        return false;
      }) || [];
      return sum + items.reduce((s, i) => s + (i.antal || 0), 0);
    }, 0);

    const saldo = Math.max(0, inkoptToUse - totalUttag);
    totalValue += saldo * (g.pris || 0);
  }

  return totalValue;
}