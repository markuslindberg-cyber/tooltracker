import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/locations")({
  head: () => ({ meta: [{ title: "Platser — Tooltracker" }, { name: "description", content: "Platser i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Platser" table="locations" filterDeleted={true} orderBy="name" ascending={true} columns={[{key:"name",label:"Namn"},{key:"type",label:"Typ"},{key:"address",label:"Adress"},{key:"city",label:"Ort"}]} />
  ),
});
