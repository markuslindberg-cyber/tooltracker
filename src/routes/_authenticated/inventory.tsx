import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Maskiner — Tooltracker" }, { name: "description", content: "Maskiner i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Maskiner" table="tools" filterDeleted={true} orderBy="name" ascending={true} columns={[{key:"image_url",label:"",type:"image"},{key:"name",label:"Namn"},{key:"manufacturer",label:"Tillverkare"},{key:"category",label:"Kategori"},{key:"subcategory",label:"Underkategori"},{key:"status",label:"Status",type:"badge"},{key:"location_name",label:"Plats"},{key:"barcode",label:"Streckkod"}]} />
  ),
});
