import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/service")({
  head: () => ({ meta: [{ title: "Service — Tooltracker" }, { name: "description", content: "Service i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Service" table="service_records" filterDeleted={false} orderBy="service_date" ascending={false} columns={[{key:"service_date",label:"Datum",type:"date"},{key:"tool_name",label:"Verktyg"},{key:"service_type",label:"Typ"},{key:"performed_by_name",label:"Utförd av"},{key:"cost",label:"Kostnad",type:"money"},{key:"next_service_date",label:"Nästa",type:"date"}]} />
  ),
});
