import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/lokalvard/kunder")({
  head: () => ({ meta: [{ title: "Kunder — Tooltracker" }, { name: "description", content: "Kunder i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Kunder" table="kunder" filterDeleted={false} orderBy="namn" ascending={true} columns={[{key:"namn",label:"Namn"},{key:"typ",label:"Typ"},{key:"projektnummer",label:"Projektnummer"},{key:"status",label:"Status",type:"badge"}]} />
  ),
});
