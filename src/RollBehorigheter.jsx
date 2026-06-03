import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  LayoutDashboard, Package, Users, Wrench, Shovel, Shirt, SprayCan,
  MapPin, Settings, Star, Check, GripVertical, X
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard, Package, Users, Wrench, Shovel, Shirt, SprayCan, MapPin, Settings, Star
};

// roles: undefined = alla, array = specifika roller
const ALL_SHORTCUTS = [
  // Dashboard är fast och visas inte i listan
  { path: '/Inventory', label: 'Maskiner', icon: 'Package', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Huvudmaskiner', label: 'Huvudmaskiner', icon: 'Package', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Inventory/SaldaRedskap', label: 'Sålda & Kasserade', icon: 'Package', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Transfers', label: 'Lån av utrustning', icon: 'Package', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Service', label: 'Service', icon: 'Wrench', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/HandTools', label: 'Handredskap', icon: 'Shovel', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/ArbetskladerUtrustning', label: 'Arbetskläder & Skyddsutrustning', icon: 'Shirt' },
  { path: '/Arbetsklader/CheckoutReports', label: 'Uttagsrapporter (Kläder)', icon: 'Shirt' },
  { path: '/ArbetskläderRequestWorkwear', label: 'Begäran om uttag (Kläder)', icon: 'Shirt' },
  { path: '/Arbetsklader/Forfragan', label: 'Förfrågan (Kläder)', icon: 'Shirt' },
  { path: '/Lokalvard/Lager', label: 'Lokalvård – Lager', icon: 'SprayCan', roles: ['lokalvårdare', 'admin_lokalvård', 'ägare'] },
  { path: '/Lokalvard/Uttag', label: 'Lokalvård – Uttag', icon: 'SprayCan', roles: ['admin_lokalvård', 'ägare'] },
  { path: '/Lokalvard/BegaranAttGodkanna', label: 'Lokalvård – Begäran & uttag', icon: 'SprayCan', roles: ['admin_lokalvård', 'ägare'] },
  { path: '/Lokalvard/KostnadPerKund', label: 'Lokalvård – Kostnad per kund', icon: 'SprayCan', roles: ['admin_lokalvård', 'ägare'] },
  { path: '/Lokalvard/Kunder', label: 'Lokalvård – Kunder', icon: 'SprayCan', roles: ['admin_lokalvård', 'ägare'] },
  { path: '/RequestWorkwear', label: 'Begäran lokalvårdsartiklar', icon: 'SprayCan', roles: ['lokalvårdare', 'admin_lokalvård', 'ägare'] },
  { path: '/InventoryCheck', label: 'Inventering', icon: 'Wrench', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/InventoryReports', label: 'Inventeringsrapporter', icon: 'Wrench', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Locations', label: 'Platser', icon: 'MapPin', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Team', label: 'Personal', icon: 'Users', roles: ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'] },
  { path: '/Administration/Kategorier', label: 'Kategorier', icon: 'Settings', roles: ['admin', 'ägare'] },
];

const MAX = 4;

export default function NavInstellningar() {
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setSelected(u?.bottom_nav_shortcuts || []);
    });
  }, []);

  const isSelected = (path) => selected.some(s => s.path === path);

  const toggle = (shortcut) => {
    if (isSelected(shortcut.path)) {
      setSelected(prev => prev.filter(s => s.path !== shortcut.path));
    } else {
      if (selected.length >= MAX) {
        toast({ title: `Max ${MAX} genvägar`, description: 'Ta bort en genväg för att lägga till en ny.', variant: 'destructive' });
        return;
      }
      setSelected(prev => [...prev, shortcut]);
    }
  };

  const remove = (path) => setSelected(prev => prev.filter(s => s.path !== path));

  const save = async () => {
    setSaving(true);
    await base44.auth.updateMe({ bottom_nav_shortcuts: selected });
    setSaving(false);
    toast({ 
      title: 'Sparat!', 
      description: 'Dina genvägar har uppdaterats.',
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <h1 className="text-2xl font-bold mb-1">Mina genvägar</h1>
      <p className="text-gray-500 text-sm mb-6">Dashboard är alltid fast. Välj upp till {MAX} extra genvägar.</p>

      {/* Fast genväg */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Fast genväg</h2>
        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 rounded-full px-3 py-1.5 text-sm font-medium w-fit">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
          <span className="ml-1 text-xs text-gray-400">(fast)</span>
        </div>
      </div>

      {/* Valda genvägar */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Valda genvägar ({selected.length}/{MAX})</h2>
        {selected.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Inga genvägar valda än.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => {
              const IconComp = ICON_MAP[s.icon] || Star;
              return (
                <div key={s.path} className="flex items-center gap-1.5 bg-[#8B1E1E]/10 text-[#8B1E1E] rounded-full px-3 py-1.5 text-sm font-medium">
                  <IconComp className="w-3.5 h-3.5" />
                  {s.label}
                  <button onClick={() => remove(s.path)} className="ml-1 hover:text-red-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alla tillgängliga sidor */}
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Tillgängliga sidor</h2>
      <div className="space-y-1">
        {ALL_SHORTCUTS.filter(s => !s.roles || s.roles.includes(user?.role)).map((shortcut) => {
          const IconComp = ICON_MAP[shortcut.icon] || Star;
          const sel = isSelected(shortcut.path);
          return (
            <button
              key={shortcut.path}
              onClick={() => toggle(shortcut)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                sel
                  ? 'bg-[#8B1E1E]/10 text-[#8B1E1E]'
                  : 'bg-white border border-gray-100 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sel ? 'bg-[#8B1E1E]/15' : 'bg-gray-100'}`}>
                <IconComp className={`w-4 h-4 ${sel ? 'text-[#8B1E1E]' : 'text-gray-500'}`} />
              </div>
              <span className="flex-1">{shortcut.label}</span>
              {sel && <Check className="w-4 h-4 text-[#8B1E1E]" />}
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200 lg:static lg:border-0 lg:bg-transparent lg:mt-6 lg:px-0">
        <Button onClick={save} disabled={saving} className="w-full bg-[#8B1E1E] hover:bg-[#7a1919]">
          {saving ? 'Sparar...' : 'Spara genvägar'}
        </Button>
      </div>
    </div>
  );
}