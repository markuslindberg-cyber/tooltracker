import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Logg — Tooltracker" }, { name: "description", content: "Logg i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Logg" table="tool_logs" filterDeleted={false} orderBy="created_at" ascending={false} columns={[{key:"created_at",label:"Datum",type:"date"},{key:"tool_name",label:"Verktyg"},{key:"action",label:"Händelse",type:"badge"},{key:"performed_by_name",label:"Av"},{key:"from_location_name",label:"Från"},{key:"to_location_name",label:"Till"}]} />
  ),
});
