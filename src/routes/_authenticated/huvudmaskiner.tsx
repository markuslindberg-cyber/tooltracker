import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/EntityTable";

export const Route = createFileRoute("/_authenticated/huvudmaskiner")({
  head: () => ({ meta: [{ title: "Huvudmaskiner — Tooltracker" }, { name: "description", content: "Huvudmaskiner i Tooltracker." }] }),
  component: () => (
    <EntityTable title="Huvudmaskiner" table="huvudmaskiner" filterDeleted={false} orderBy="name" ascending={true} columns={[{key:"name",label:"Namn"},{key:"typ",label:"Typ"},{key:"manufacturer",label:"Tillverkare"},{key:"model",label:"Modell"},{key:"registration_number",label:"Reg.nr"},{key:"location_name",label:"Plats"}]} />
  ),
});
