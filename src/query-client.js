export const calculateUttagMatching = (allUttag, allArtiklar, targetStreckkod, targetOldStreckkod) => {
  return allUttag.reduce((sum, u) => {
    const matchingWithdrawals = u.artiklar?.filter(item => {
      // Match om benamning är en streckkod som matchar
      if (item.benamning === targetStreckkod || item.benamning === targetOldStreckkod) return true;
      
      // Match om artikel_id är streckkod
      if (item.artikel_id === targetStreckkod || item.artikel_id === targetOldStreckkod) return true;
      
      // Match genom att söka artiklar med samma streckkod
      const matchingArtikel = allArtiklar.find(a => 
        (a.streckkod === targetStreckkod ||
         a.old_streckkod === targetStreckkod ||
         a.streckkod === targetOldStreckkod ||
         a.old_streckkod === targetOldStreckkod) &&
        (a.id === item.artikel_id ||
         a.streckkod === item.artikel_id ||
         a.old_streckkod === item.artikel_id ||
         a.benamning === item.benamning)
      );
      return !!matchingArtikel;
    }) || [];
    return sum + matchingWithdrawals.reduce((s, a) => s + (a.antal || 0), 0);
  }, 0);
};