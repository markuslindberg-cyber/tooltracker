import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/lokalvard/begaran")({
  head: () => ({ meta: [{ title: "Begäran lokalvård — Tooltracker" }, { name: "description", content: "Begäran lokalvård i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Begäran lokalvård" table="lokalvard_artikel_requests" filterDeleted={false} orderBy="created_at" ascending={false} columns={[{key:"created_at",label:"Datum",type:"date"},{key:"artikel_namn",label:"Artikel"},{key:"antal",label:"Antal",type:"number"},{key:"kund_namn",label:"Kund"},{key:"requester_name",label:"Begärd av"},{key:"status",label:"Status",type:"badge"}]} />
  ),
});
