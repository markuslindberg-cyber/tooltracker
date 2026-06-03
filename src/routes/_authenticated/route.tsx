import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Wrench,
  Hammer,
  Shirt,
  Sparkles,
  Truck,
  MapPin,
  Users,
  ArrowLeftRight,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "Översikt",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Verktyg",
    items: [
      { to: "/inventory", label: "Maskiner", icon: Wrench },
      { to: "/handtools", label: "Handredskap", icon: Hammer },
      { to: "/huvudmaskiner", label: "Huvudmaskiner", icon: Truck },
      { to: "/transfers", label: "Flyttar", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Arbetskläder",
    items: [
      { to: "/arbetsklader", label: "Utrustning", icon: Shirt },
    ],
  },
  {
    title: "Lokalvård",
    items: [
      { to: "/lokalvard/lager", label: "Lager", icon: Sparkles },
      { to: "/lokalvard/uttag", label: "Uttag", icon: ArrowLeftRight },
      { to: "/lokalvard/kunder", label: "Kunder", icon: Users },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/locations", label: "Platser", icon: MapPin },
      { to: "/team", label: "Personal", icon: Users },
      { to: "/admin", label: "Inställningar", icon: Settings },
    ],
  },
];

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border shadow-sm"
        aria-label="Meny"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Tooltracker</h1>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-2 py-1 text-xs font-medium uppercase text-muted-foreground tracking-wider">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Logga ut
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
