import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/lokalvard/uttag")({
  head: () => ({ meta: [{ title: "Uttag — Tooltracker" }, { name: "description", content: "Uttag i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Uttag" table="uttag" filterDeleted={false} orderBy="datum" ascending={false} columns={[{key:"datum",label:"Datum",type:"date"},{key:"kund_namn",label:"Kund"},{key:"projektnummer",label:"Projekt"},{key:"items",label:"Artiklar",type:"count"},{key:"total_pris",label:"Totalt",type:"money"},{key:"utfort_av_namn",label:"Utförd av"}]} />
  ),
});
