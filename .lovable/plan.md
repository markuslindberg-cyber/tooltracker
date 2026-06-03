
# Migrationsplan: Tooltracker → TanStack Start + Lovable Cloud

Befintlig kod är en base44-app skriven mot `@base44/sdk` + React Router DOM med ~40 sidor och ~25 entiteter (under `.lovable/*.jsonc` och `src/*.jsx`). Projektmallen här kör TanStack Start + Supabase via Lovable Cloud, så all kod behöver portas — base44-SDK:n finns inte i denna miljö och `src/App.jsx`/`src/pages.config.js` är inte aktiva (endast `src/routes/*` används).

Detta är **inte ett enda steg** — det är en migration på flera veckor. Planen nedan delar upp arbetet i 6 faser. Vi kör fas 1 nu, sedan stämmer av efter varje fas innan vi går vidare.

## Fas 1 — Grund (denna iteration)

1. **Databasschema (migration)** — skapa alla tabeller i Lovable Cloud baserat på `.lovable/*.jsonc`:
   - `profiles` (kopplad till `auth.users`)
   - `app_role` enum + `user_roles` (samma roller: technician, apprentice, contractor, admin_lokalvard, lokalvardare, verktygsforvaltare, admin, agare) + `has_role()` security definer
   - Kärnentiteter: `locations`, `team_members`, `tools` (HandTool/Tool/Huvudmaskin), `transfers`, `loan_requests`, `tool_logs`, `categories`, `service_records`, `service_templates`
   - Lokalvård: `lokalvards_artiklar`, `lokalvard_inkop`, `lokalvard_checkout`, `lokalvard_uttag`, `lokalvard_artikel_request`, `kunder`
   - Arbetskläder: `workwear_requests`, `arbetsklader_*`
   - Övrigt: `inventering`, `inventering_skanning`, `checkout_reports`, `inventory_reports`, `depreciation_settings`, `role_permissions`, `global_app_config`, `category_images`
   - RLS-policies översatta från `rls`-blocken i jsonc-filerna, kallar `public.has_role(auth.uid(), 'admin')` etc.
   - GRANTs på varje publik tabell

2. **Auth** — email/lösenord + Google (managed) via Lovable Cloud, ingen auto-confirm. `/auth`-sida och `_authenticated`-layout för skyddade rutter.

3. **App-shell** — TanStack-routes-struktur, root layout, sidebar/header från `src/Layout.jsx` portad till `src/components/Layout.tsx`, design-tokens i `src/styles.css`.

4. **Dataimport-stöd** — `/api/public/import`-route med signaturverifiering, eller ett enkelt admin-UI under fas 2. Du exporterar JSON från base44 så får jag specen på filerna och bygger importen.

Inga sidor migreras i fas 1 — bara tom dashboard så vi vet att shell + auth funkar.

## Fas 2 — Kärnmoduler

Inventory, HandTools, Locations, Team, Transfers, LoanRequests, Dashboard. Inkluderar `ToolFormModal`, `CheckoutModal`, `TransferModal`, `LocationDetails`, scanmoduler.

## Fas 3 — Lokalvård

Uttag, NyttUttag, BegaranAttGodkanna, KostnadPerKund, Kunder, Lager, ArtikelDetaljer, Inköp/UttagImport, RequestArtikel, ImportHistorik.

## Fas 4 — Arbetskläder + Service

ArbetskläderUtrustning, RequestWorkwear, BegaranAttGodkanna, Streckkodhantering, CheckoutReports, Service, ServiceMallar, Huvudmaskiner.

## Fas 5 — Admin & rapporter

CategoryManagement, RollBehorigheter, Papperskorg, NavInstellningar, AdminLayoutEditor, OwnerOverview, DepreciationSettings, InventoryReports, SåldaRedskap, ToolImport.

## Fas 6 — Datamigrering & finputs

Importera dina base44-exporter, behörighetsmappning per användare, polish, mobil-QA, publicering.

---

## Tekniska val

- **Server-fns** (`createServerFn` + `requireSupabaseAuth`) för all DB-access, inga Edge Functions.
- **React Router DOM ersätts helt** av TanStack Router file-routes under `src/routes/_authenticated/...`.
- **Tabellnamn**: snake_case (postgres-konvention) — komponenter får TypeScript-typer auto-genererade.
- **Skanning/streckkod**: kvar som klientkod (samma libs).
- **Bilduppladdning**: Supabase Storage-buckets per modul (verktyg, kategorier, avatarer).
- **Realtime**: aktiveras för `transfers`, `loan_requests`, `lokalvard_artikel_request`, `workwear_requests` så listor uppdateras live.
- **Legacy-städning**: `src/App.jsx`, `src/integrations.js`, `src/base44Client.js`, `src/pages.config.js`, och alla `src/*.jsx` på rotnivå raderas i takt med att de portas in i `src/routes/` och `src/components/`.

## Frågor jag behöver svar på innan fas 2

- Vilket exportformat har du från base44? (JSON per entitet är enklast — jag förutsätter det)
- Hur mappar vi befintliga base44-användare till nya Lovable Cloud-konton? (samma e-post → matcha på `profiles.email` efter att de skapar konto, eller pre-create via admin-script?)
- Ska sökväg/URL-struktur vara identisk med dagens (`/Lokalvard/Uttag` etc.) eller får jag normalisera till kebab-case (`/lokalvard/uttag`)?

Säg "kör" så börjar jag fas 1 (schema + auth + shell). Sidorna börjar komma i fas 2.
