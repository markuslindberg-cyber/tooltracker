import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/transfers")({
  head: () => ({ meta: [{ title: "Flyttar — Tooltracker" }, { name: "description", content: "Flyttar i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Flyttar" table="transfers" filterDeleted={false} orderBy="created_at" ascending={false} columns={[{key:"created_at",label:"Datum",type:"date"},{key:"tool_name",label:"Verktyg"},{key:"from_location_name",label:"Från"},{key:"to_location_name",label:"Till"},{key:"requested_by_name",label:"Begärd av"},{key:"status",label:"Status",type:"badge"}]} />
  ),
});
