import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/arbetsklader")({
  head: () => ({ meta: [{ title: "Arbetskläder & utrustning — Tooltracker" }, { name: "description", content: "Arbetskläder & utrustning i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Arbetskläder & utrustning" table="arbetsklader_utrustning" filterDeleted={true} orderBy="name" ascending={true} columns={[{key:"name",label:"Namn"},{key:"category",label:"Kategori"},{key:"size",label:"Storlek"},{key:"quantity",label:"Antal",type:"number"},{key:"status",label:"Status",type:"badge"},{key:"location_name",label:"Plats"}]} />
  ),
});
