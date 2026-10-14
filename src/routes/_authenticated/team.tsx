import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Personal — Tooltracker" }, { name: "description", content: "Personal i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Personal" table="team_members" filterDeleted={false} orderBy="name" ascending={true} columns={[{key:"name",label:"Namn"},{key:"email",label:"E-post"},{key:"phone",label:"Telefon"},{key:"role",label:"Roll",type:"badge"},{key:"default_location_name",label:"Plats"}]} />
  ),
});
