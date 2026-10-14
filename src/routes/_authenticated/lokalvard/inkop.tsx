import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/lokalvard/inkop")({
  head: () => ({ meta: [{ title: "Inköp — Tooltracker" }, { name: "description", content: "Inköp i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Inköp" table="lokalvard_inkop" filterDeleted={false} orderBy="datum" ascending={false} columns={[{key:"datum",label:"Datum",type:"date"},{key:"artikel_namn",label:"Artikel"},{key:"antal",label:"Antal",type:"number"},{key:"pris",label:"Pris",type:"money"},{key:"leverantor",label:"Leverantör"}]} />
  ),
});
