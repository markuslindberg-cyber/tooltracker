import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({ meta: [{ title: "Lån — Tooltracker" }, { name: "description", content: "Lån i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Lån" table="loan_requests" filterDeleted={false} orderBy="created_at" ascending={false} columns={[{key:"created_at",label:"Datum",type:"date"},{key:"tool_name",label:"Verktyg"},{key:"borrower_name",label:"Låntagare"},{key:"to_location_name",label:"Till"},{key:"start_date",label:"Från",type:"date"},{key:"end_date",label:"Till",type:"date"},{key:"status",label:"Status",type:"badge"}]} />
  ),
});
