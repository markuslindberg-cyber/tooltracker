import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Hammer, Truck, Shirt, AlertCircle, ArrowLeftRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Tooltracker" }] }),
  component: DashboardPage,
});

const statDefs = [
  { label: "Maskiner", table: "tools", del: true, icon: Wrench, color: "text-primary" },
  { label: "Handredskap", table: "hand_tools", del: true, icon: Hammer, color: "text-primary" },
  { label: "Huvudmaskiner", table: "huvudmaskiner", icon: Truck, color: "text-primary" },
  { label: "Lokalvårdsartiklar", table: "lokalvards_artiklar", del: true, icon: Shirt, color: "text-primary" },
  { label: "Uttag", table: "uttag", icon: ArrowLeftRight, color: "text-primary" },
  { label: "Väntande begäran", table: "lokalvard_artikel_requests", pending: true, icon: AlertCircle, color: "text-destructive" },
];

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { data: counts = {} } = useQuery({
    queryKey: ["dash-counts"],
    queryFn: async () => {
      const out: Record<string, number | null> = {};
      await Promise.all(statDefs.map(async (d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabase.from as any)(d.table).select("id", { count: "exact", head: true });
        if (d.del) q = q.eq("is_deleted", false);
        if (d.pending) q = q.eq("status", "pending");
        const { count } = await q;
        out[d.label] = count ?? null;
      }));
      return out;
    },
  });
  const stats = statDefs.map((d) => ({ ...d, value: counts[d.label] ?? "—" }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Välkommen</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className={`h-5 w-5 ${color}`} />
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      
    </div>
  );
}
