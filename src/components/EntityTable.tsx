import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search } from "lucide-react";

export type Column = {
  key: string;
  label: string;
  type?: "text" | "badge" | "money" | "date" | "number" | "image" | "count";
};

type Props = {
  title: string;
  description?: string;
  table: string;
  columns: Column[];
  orderBy?: string;
  ascending?: boolean;
  filterDeleted?: boolean;
  limit?: number;
};

const statusLabels: Record<string, string> = {
  available: "Tillgänglig", in_use: "I bruk", maintenance: "Service", missing: "Saknas",
  i_lager: "I lager", i_bruk: "I bruk", saknas: "Saknas", kasserad: "Kasserad",
  pending: "Väntar", approved: "Godkänd", rejected: "Nekad", completed: "Klar",
  returned: "Återlämnad", pending_return: "Retur väntar", aktiv: "Aktiv", inaktiv: "Inaktiv",
  good: "Bra", fair: "OK", poor: "Dålig", excellent: "Utmärkt",
};

function fmt(v: unknown, type: Column["type"]) {
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  switch (type) {
    case "badge":
      return <Badge variant="secondary">{statusLabels[String(v)] ?? String(v)}</Badge>;
    case "money":
      return Number(v).toLocaleString("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
    case "number":
      return Number(v).toLocaleString("sv-SE");
    case "date":
      return new Date(String(v)).toLocaleDateString("sv-SE");
    case "count":
      return Array.isArray(v) ? v.length : String(v);
    case "image":
      return <img src={String(v)} alt="" className="h-9 w-9 rounded object-cover bg-muted" loading="lazy" />;
    default:
      return String(v);
  }
}

export function EntityTable({ title, description, table, columns, orderBy = "created_at", ascending = false, filterDeleted, limit = 3000 }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["entity", table],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from as any)(table).select("*").order(orderBy, { ascending }).limit(limit);
      if (filterDeleted) query = query.eq("is_deleted", false);
      const { data, error } = await query;
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r) => columns.some((c) => String(r[c.key] ?? "").toLowerCase().includes(s)) || String(r.barcode ?? r.streckkod ?? "").includes(s));
  }, [data, q, columns]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description ?? `${rows.length} av ${data.length} poster`}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök eller skanna streckkod…" className="pl-8" />
        </div>
      </header>

      <Card className="overflow-hidden">
        {error ? (
          <p className="p-6 text-sm text-destructive">Kunde inte läsa data. Du saknar kanske behörighet för den här sidan.</p>
        ) : isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Laddar…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Inga poster.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium whitespace-nowrap">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((r) => (
                  <tr key={String(r.id)} onClick={() => setSelected(r)} className="border-t cursor-pointer hover:bg-muted/40">
                    {columns.map((c) => <td key={c.key} className="px-3 py-2 whitespace-nowrap">{fmt(r[c.key], c.type)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 500 && <p className="p-3 text-xs text-muted-foreground">Visar 500 första — förfina sökningen.</p>}
          </div>
        )}
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{String(selected?.name ?? selected?.namn ?? selected?.artikel_namn ?? selected?.kund_namn ?? "Detaljer")}</SheetTitle></SheetHeader>
          {selected && (
            <dl className="mt-4 space-y-2 text-sm">
              {typeof selected.image_url === "string" && selected.image_url && <img src={selected.image_url} alt="" className="w-full max-h-64 object-contain rounded bg-muted" />}
              {Object.entries(selected).filter(([k, v]) => !["id", "image_url"].includes(k) && v !== null && v !== "" && !(typeof v === "object" && v && Object.keys(v).length === 0)).map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2 border-b pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="col-span-2 break-words">{typeof v === "object" ? <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre> : String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
