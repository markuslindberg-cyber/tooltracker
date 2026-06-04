## Strategi: visa först, polera sen

Du har redan ~80 färdiga `.jsx`-komponenter i `src/` (Dashboard, Inventory, HandTools, Locations, Team, Lokalvård, Arbetskläder osv). Databasen är redan migrerad (31 tabeller finns). Det som saknas är **limmet** mellan dem. Istället för att skriva om varje sida bygger vi en tunn kompatibilitetslayer så de befintliga filerna funkar direkt mot Supabase.

## Steg

### 1. base44-kompatibilitetsshim (`src/api/entities.ts`)
Ersätter `@base44/sdk`-importerna med ett objekt som har samma API (`Tool.list()`, `Tool.filter()`, `Tool.create()`, `Tool.update()`, `Tool.delete()`) men kör mot Supabase under huven. Mappar entitetsnamn → tabellnamn (`Tool` → `tools`, `LokalvardsArtikel` → `lokalvards_artiklar` osv).

Resultat: en sida som har `import { Tool } from "@/api/entities"` fungerar utan ändring.

### 2. `User`-shim med roller
`User.me()`, `User.list()`, `User.updateMyUserData()` mappas till Supabase auth + `profiles` + `user_roles`. Returnerar samma shape som base44 (`{ id, email, full_name, role }`).

### 3. `createPageUrl` + routerhjälpare
Liten util som översätter base44-stilens `createPageUrl("LokalvardUttag")` → `/lokalvard/uttag`. Då slipper vi röra alla `<Link>`-anrop i de befintliga filerna.

### 4. Flytta `.jsx`-sidor till routes
Varje sida får en tunn route-wrapper under `src/routes/_authenticated/`:

```text
src/routes/_authenticated/
  dashboard.tsx          -> renderar <Dashboard /> från src/Dashboard.jsx
  inventory.tsx          -> <Inventory />
  handtools.tsx          -> <HandTools />
  locations.tsx          -> <Locations />
  locations.$id.tsx      -> <LocationDetails />
  team.tsx               -> <Team />
  transfers.tsx          -> <Transfers />
  huvudmaskiner.tsx      -> <Huvudmaskiner />
  arbetsklader.index.tsx -> <ArbetskläderUtrustning />
  arbetsklader.request.tsx
  arbetsklader.godkanna.tsx
  lokalvard.lager.tsx
  lokalvard.uttag.tsx
  lokalvard.nytt-uttag.tsx
  lokalvard.kunder.tsx
  lokalvard.kostnad.tsx
  lokalvard.request.tsx
  lokalvard.godkanna.tsx
  lokalvard.import.tsx
  lokalvard.artikel.$id.tsx
  service.index.tsx
  service.mallar.tsx
  admin.kategorier.tsx
  admin.roller.tsx
  admin.papperskorg.tsx
  admin.deprecation.tsx
  admin.layout.tsx
  admin.nav.tsx
  admin.import.tsx
  rapporter.inventering.tsx
  rapporter.checkout.tsx
  rapporter.sald.tsx
  owner.tsx
```

Wrappern är 5 rader: `createFileRoute` + render av befintlig komponent.

### 5. UI-komponenter
`src/*.jsx` på rotnivå (button, card, dialog, table osv) finns redan som `.tsx` under `src/components/ui/`. Vi pekar om alla imports `from "@/button"` → `from "@/components/ui/button"` med en enkel sed-körning. Inga komponenter skrivs om.

### 6. Layout
`src/Layout.jsx` (din sidebar/header) flyttas in i `src/routes/_authenticated/route.tsx` och ersätter den enkla sidebar jag byggde i fas 1.

### 7. Dataimport
Skript som läser `tooltrack-export-2026-06-03.json` (8 500 poster) och kör batch-insert mot Supabase med id-mappning base44 → uuid. Kör som engångsmigration via server-fn.

## Vad detta ger dig

- **Appen syns och fungerar** efter steg 1–6 (uppskattning: 1 lång iteration)
- Dina befintliga sidor används som de är — ingen risk att jag missar funktionalitet
- Stilen, layouten, all logik bevaras
- Data importeras i steg 7 så du ser riktiga maskiner/uttag/personal

## Vad detta INTE ger (ännu)

- TypeScript-typer på sidorna (de är fortfarande `.jsx`)
- Realtime/SWR-optimering — fungerar som idag, omladdning vid navigering
- Server-fns istället för klientqueries — kommer i polishfas

## Frågor

1. Kör vi **lift-and-shift** (denna plan) eller **clean rewrite** (förra planen, 4–6 faser)?
2. URL-stil — kebab-case (`/lokalvard/uttag`) eller behåll PascalCase (`/Lokalvard/Uttag`) som matchar base44 exakt?
3. Bilder från base44 (`image_url`-fält) — laddar vi ner och rehostar i Supabase Storage, eller lämnar URL:erna som de är (om de fortfarande är åtkomliga)?
