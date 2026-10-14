import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/inventering")({
  head: () => ({ meta: [{ title: "Inventeringsrapporter — Tooltracker" }, { name: "description", content: "Inventeringsrapporter i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Inventeringsrapporter" table="inventory_reports" filterDeleted={false} orderBy="performed_at" ascending={false} columns={[{key:"performed_at",label:"Datum",type:"date"},{key:"location_name",label:"Plats"},{key:"tool_type",label:"Typ"},{key:"performed_by_name",label:"Utförd av"},{key:"total_items",label:"Totalt",type:"number"},{key:"checked_items",label:"Kontrollerade",type:"number"},{key:"unchecked_items",label:"Saknas",type:"number"}]} />
  ),
});
