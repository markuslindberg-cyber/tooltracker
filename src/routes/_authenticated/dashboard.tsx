import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Hammer, Truck, Shirt, AlertCircle, ArrowLeftRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Tooltracker" }] }),
  component: DashboardPage,
});

const stats = [
  { label: "Maskiner", value: "—", icon: Wrench, color: "text-blue-600" },
  { label: "Handredskap", value: "—", icon: Hammer, color: "text-green-600" },
  { label: "Huvudmaskiner", value: "—", icon: Truck, color: "text-orange-600" },
  { label: "Arbetskläder", value: "—", icon: Shirt, color: "text-purple-600" },
  { label: "Aktiva flyttar", value: "—", icon: ArrowLeftRight, color: "text-amber-600" },
  { label: "Väntar godkännande", value: "—", icon: AlertCircle, color: "text-red-600" },
];

function DashboardPage() {
  const { user } = Route.useRouteContext();

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

      <Card>
        <CardHeader>
          <CardTitle>Migration pågår</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Backend, autentisering och grundstruktur är på plats. Sidorna kopplas in modul för modul i nästa fas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Fas 2 – Maskiner, handredskap, platser, personal, flyttar, utlåning</li>
            <li>Fas 3 – Lokalvård (lager, uttag, kunder, import)</li>
            <li>Fas 4 – Arbetskläder & service</li>
            <li>Fas 5 – Admin, rapporter, behörigheter</li>
            <li>Fas 6 – Dataimport från base44 + finputs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
