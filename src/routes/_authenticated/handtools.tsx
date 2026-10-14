import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/handtools")({
  head: () => ({ meta: [{ title: "Handredskap — Tooltracker" }, { name: "description", content: "Handredskap i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Handredskap" table="hand_tools" filterDeleted={true} orderBy="name" ascending={true} columns={[{key:"image_url",label:"",type:"image"},{key:"name",label:"Namn"},{key:"category",label:"Kategori"},{key:"status",label:"Status",type:"badge"},{key:"location_name",label:"Plats"},{key:"assigned_to_name",label:"Tilldelad"},{key:"barcode",label:"Streckkod"}]} />
  ),
});
