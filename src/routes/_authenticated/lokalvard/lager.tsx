import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/lokalvard/lager")({
  head: () => ({ meta: [{ title: "Lokalvårdslager — Tooltracker" }, { name: "description", content: "Lokalvårdslager i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Lokalvårdslager" table="lokalvards_artiklar" filterDeleted={true} orderBy="namn" ascending={true} columns={[{key:"image_url",label:"",type:"image"},{key:"namn",label:"Artikel"},{key:"artikelnummer",label:"Art.nr"},{key:"kategori",label:"Kategori"},{key:"lagersaldo",label:"Saldo",type:"number"},{key:"minimum_lagersaldo",label:"Min",type:"number"},{key:"pris_per_enhet",label:"Pris",type:"money"},{key:"leverantor",label:"Leverantör"}]} />
  ),
});
