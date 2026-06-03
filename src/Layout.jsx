import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGlobalConfig } from '@/hooks/useGlobalConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  Package,
  Users,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronLeft,
  Wrench,
  Shovel,
  Shirt,
  SprayCan,
  MapPin,
  Settings,
  Star,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from '@/hooks/useTheme';
import { cn } from "@/lib/utils";
import DeactivateAccountDialog from '@/components/modals/DeactivateAccountDialog';

const LOKALVARDARE_ROLES = ['lokalvårdare', 'admin_lokalvård', 'ägare'];
const NOT_LOKALVARDARE = ['admin', 'verktygsförvaltare', 'admin_lokalvård', 'ägare'];

// Top-level routes that are "root" tabs (no back button shown)
const ROOT_PATHS = ['/', '/Inventory', '/HandTools', '/Team', '/Dashboard'];

const navigation = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  {
    name: 'Maskiner',
    path: '/Inventory',
    icon: Package,
    roles: NOT_LOKALVARDARE,
    children: [
      { name: 'Översikt', path: '/Inventory' },
      { name: 'Huvudmaskiner', path: '/Huvudmaskiner' },
      { name: 'Sålda & Kasserade', path: '/Inventory/SaldaRedskap' },
      { name: 'Lån av utrustning', path: '/Transfers' },
      { name: 'Service', path: '/Service' },
      { name: 'Importera maskiner', path: '/Inventory/ToolImport', desktopOnly: true, devOnly: true },
    ]
  },
  { name: 'Handredskap', path: '/HandTools', icon: Shovel, roles: NOT_LOKALVARDARE },
  {
    name: 'Arbetskläder',
    path: '/ArbetskladerUtrustning',
    icon: Shirt,
    children: [
      { name: 'Arbetskläder och skyddsutrustning', path: '/ArbetskladerUtrustning', roles: NOT_LOKALVARDARE },
      { name: 'Uttagsrapporter', path: '/Arbetsklader/CheckoutReports', roles: NOT_LOKALVARDARE },
      { name: 'Begäran - arbetskläder', path: '/ArbetskläderRequestWorkwear' },
      { name: 'Förfrågan - arbetskläder', path: '/Arbetsklader/Forfragan', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Streckkodhantering', path: '/Arbetsklader/Streckkodhantering', roles: ['admin_lokalvård', 'ägare'] },
    ]
  },
  {
    name: 'Lokalvård',
    path: '/Lokalvard',
    icon: SprayCan,
    children: [
      { name: 'Begäran - lokalvårdsartiklar', path: '/LokalvardRequestArtikel' },
      { name: 'Lager', path: '/Lokalvard/Lager', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Plocka ut begärda uttag', path: '/Lokalvard/NyttUttag', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Uttag', path: '/Lokalvard/Uttag', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Godkänna Begäran', path: '/Lokalvard/BegaranAttGodkanna', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Kostnad per kund', path: '/Lokalvard/KostnadPerKund', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Kunder', path: '/Lokalvard/Kunder', roles: ['admin_lokalvård', 'ägare'] },
      { name: 'Importera inköp', path: '/Lokalvard/InköpImport', desktopOnly: true, devOnly: true },
      { name: 'Importera uttag', path: '/Lokalvard/UttagImport', desktopOnly: true, devOnly: true },
    ]
  },
  {
    name: 'Inventeringskontroll',
    path: '/InventoryCheck',
    icon: Wrench,
    roles: NOT_LOKALVARDARE,
    children: [
      { name: 'Inventering', path: '/InventoryCheck' },
      { name: 'Inventeringsrapporter', path: '/InventoryReports' },
    ]
  },
  {
    name: 'Administration',
    path: '/Administration',
    icon: Users,
    roles: NOT_LOKALVARDARE,
    children: [
      { name: 'Platser', path: '/Locations' },
      { name: 'Personal', path: '/Team' },
      { name: 'Kategorier', path: '/Administration/Kategorier' },
      { name: 'Papperskorg', path: '/Administration/Papperskorg', desktopOnly: true, devOnly: true },
      { name: 'Roller & Behörigheter', path: '/Administration/RollBehorigheter', roles: ['ägare'] },
      { name: 'Avskrivningar', path: '/Administration/Avskrivningar', roles: ['ägare'] },
    ]
  },
];

const ICON_MAP = {
  LayoutDashboard, Package, Users, Wrench, Shovel, Shirt, SprayCan, MapPin, Settings, Star
};

const DASHBOARD_TAB = { name: 'Dashboard', path: '/', icon: LayoutDashboard };

// Default bottom tab bar items (used if user has no shortcuts set)
const DEFAULT_BOTTOM_TABS = [
  DASHBOARD_TAB,
  { name: 'Maskiner', path: '/Inventory', icon: Package },
  { name: 'Handredskap', path: '/HandTools', icon: Shovel },
  { name: 'Inventering', path: '/InventoryCheck', icon: Wrench },
];

const slideVariants = {
  initial: { x: '4%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-4%', opacity: 0 },
};

// Cached scroll positions for each bottom tab
const scrollPositions = {};

const NAV_ID_MAP = {
  dashboard: 'Dashboard',
  maskiner: 'Maskiner',
  handredskap: 'Handredskap',
  arbetsklader: 'Arbetskläder',
  lokalvard: 'Lokalvård',
  inventering: 'Inventeringskontroll',
  administration: 'Administration',
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [user, setUser] = useState(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [bottomTabs, setBottomTabs] = useState(DEFAULT_BOTTOM_TABS);
  const { data: navConfig } = useGlobalConfig('navigation_order');
  useTheme();

  const toggleMenu = (name) => setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  const location = useLocation();
  const navigate = useNavigate();

  // Save scroll position when leaving a tab
  useEffect(() => {
    return () => {
      scrollPositions[location.pathname] = window.scrollY;
    };
  }, [location.pathname]);

  // Restore scroll position when entering a tab
  useEffect(() => {
    if (scrollPositions[location.pathname] !== undefined) {
      window.scrollTo(0, scrollPositions[location.pathname]);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const isRootPath = ROOT_PATHS.includes(location.pathname);

  // Auto-open parent menu when on a child path
  useEffect(() => {
    const autoOpen = {};
    navigation.forEach(item => {
      if (item.children) {
        const anyChildActive = item.children.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
        if (anyChildActive) autoOpen[item.name] = true;
      }
    });
    setOpenMenus(prev => ({ ...prev, ...autoOpen }));
  }, [location.pathname]);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.bottom_nav_shortcuts?.length > 0) {
        setBottomTabs([
          DASHBOARD_TAB,
          ...u.bottom_nav_shortcuts.map(s => ({
            name: s.label,
            path: s.path,
            icon: ICON_MAP[s.icon] || Star,
          }))
        ]);
      }
    }).catch(() => {});
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    if (location.pathname === path) return true;
    return location.pathname.startsWith(path + '/');
  };

  // Get current page title for mobile header
  const currentPageTitle = (() => {
    for (const item of navigation) {
      if (item.children) {
        const child = item.children.find(c => c.path === location.pathname);
        if (child) return child.name;
      }
      if (item.path === location.pathname) return item.name;
    }
    return 'ToolTrack';
  })();

  return (
    <>
    <DeactivateAccountDialog
      open={deactivateOpen}
      onOpenChange={setDeactivateOpen}
      user={user}
    />
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800" style={{ paddingTop: 'var(--sat)' }}>
            <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">ToolTrack</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2.5 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {(() => {
              // Apply global nav order/visibility if configured
              let navItems = [...navigation];
              if (navConfig?.config_value?.items?.length > 0) {
                const order = navConfig.config_value.items;
                navItems = order
                  .filter(o => o.visible)
                  .map(o => navigation.find(n => n.name === NAV_ID_MAP[o.id]))
                  .filter(Boolean);
                // Add any nav items not in config (new items)
                const configured = order.map(o => NAV_ID_MAP[o.id]);
                navigation.forEach(n => { if (!configured.includes(n.name)) navItems.push(n); });
              }
              return navItems;
            })().filter(item => {
              if (!item.roles) return true;
              // Lokalvård menu always visible for lokalvårdare, regardless of parent roles
              if (item.name === 'Lokalvård' && LOKALVARDARE_ROLES.includes(user?.role)) return true;
              return item.roles.includes(user?.role);
            }).map((item) => {
              const isActive = isActivePath(item.path);

              if (item.children) {
                const isOpen = openMenus[item.name];

                // Apply child order/visibility from config
                const navGroupId = Object.entries(NAV_ID_MAP).find(([, v]) => v === item.name)?.[0];
                const configGroup = navConfig?.config_value?.items?.find(g => g.id === navGroupId);
                let orderedChildren = [...item.children];
                if (configGroup?.children?.length > 0) {
                  const childOrder = configGroup.children;
                  // Map config child ids back to navigation children
                  const CHILD_ID_TO_NAME = {
                    maskiner_oversikt: 'Översikt', maskiner_huvudmaskiner: 'Huvudmaskiner',
                    maskiner_salda: 'Sålda & Kasserade', maskiner_lan: 'Lån av utrustning',
                    maskiner_service: 'Service',
                    arbetsklader_utrustning: 'Arbetskläder och skyddsutrustning',
                    arbetsklader_rapporter: 'Uttagsrapporter',
                    arbetsklader_begaran: 'Begäran - arbetskläder',
                    arbetsklader_forfragan: 'Förfrågan - arbetskläder',
                    lokalvard_begaran: 'Begäran - lokalvårdsartiklar',
                    lokalvard_lager: 'Lager', lokalvard_nyttuttag: 'Plocka ut begärda uttag',
                    lokalvard_uttag: 'Uttag', lokalvard_godkanna: 'Godkänna Begäran',
                    lokalvard_kostnad: 'Kostnad per kund', lokalvard_kunder: 'Kunder',
                    inventering_inventering: 'Inventering', inventering_rapporter: 'Inventeringsrapporter',
                    administration_platser: 'Platser', administration_personal: 'Personal',
                    administration_kategorier: 'Kategorier',
                  };
                  const visible = childOrder.filter(c => c.visible).map(c => CHILD_ID_TO_NAME[c.id]).filter(Boolean);
                  const reordered = visible.map(name => item.children.find(c => c.name === name)).filter(Boolean);
                  // Add any not in config
                  item.children.forEach(c => { if (!visible.includes(c.name)) reordered.push(c); });
                  orderedChildren = reordered;
                }

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 lg:py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                        isActive
                          ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className={cn(
                          "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center shrink-0",
                          isActive ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                        )}>
                          <item.icon className={cn(
                            "w-3.5 h-3.5 lg:w-4 lg:h-4",
                            isActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400"
                          )} />
                        </div>
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-700 pl-3">
                        {orderedChildren.filter(child => {
                          if (child.devOnly && !window.location.hostname.includes('base44.app')) return false;
                          if (child.desktopOnly && window.innerWidth < 1024) return false;
                          if (child.roles && !child.roles.includes(user?.role)) return false;
                          return true;
                        }).map((child) => (
                          <Link
                            key={child.name}
                            to={child.path}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center px-3 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                              child.desktopOnly ? "hidden lg:flex" : "",
                              location.pathname === child.path
                                ? "text-[#8B1E1E] bg-[#8B1E1E]/10"
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                    isActive
                      ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center shrink-0",
                    isActive ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <item.icon className={cn(
                      "w-3.5 h-3.5 lg:w-4 lg:h-4",
                      isActive ? "text-[#8B1E1E]" : "text-gray-500 dark:text-gray-400"
                    )} />
                  </div>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Owner Overview & Layout Editor Link for ägare */}
          {user?.role === 'ägare' && (
            <div className="px-3 pb-1 space-y-0.5">
              <Link
                to="/OwnerOverview"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  location.pathname === '/OwnerOverview'
                    ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", location.pathname === '/OwnerOverview' ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800")}>
                  <Star className="w-4 h-4" />
                </div>
                Ägaröversikt
              </Link>
              <Link
                to="/AdminLayoutEditor"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  location.pathname === '/AdminLayoutEditor'
                    ? "bg-[#8B1E1E]/10 text-[#8B1E1E]"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", location.pathname === '/AdminLayoutEditor' ? "bg-[#8B1E1E]/15" : "bg-gray-100 dark:bg-gray-800")}>
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                Redigera layout
              </Link>
            </div>
          )}

          {/* User Profile */}
          {user && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Avatar className="w-10 h-10 border-2 border-gray-100">
                      <AvatarFallback className="bg-[#8B1E1E]/10 text-[#8B1E1E] font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => base44.auth.logout()}
                    className="text-[#8B1E1E]"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeactivateOpen(true)}
                    className="text-red-500"
                  >
                    Inaktivera konto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-[280px]">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sticky top-0 z-30" style={{ paddingTop: 'var(--sat)' }}>
          {/* Left: back button on child routes, menu on root routes */}
          {isRootPath ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Center: always show logo linking to dashboard */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#8B1E1E] rounded-lg flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">ToolTrack</span>
          </Link>

          {/* Right: menu button always visible */}
          {!isRootPath ? (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </header>

        {/* Page Content - Preserve scroll position per tab */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen pb-16 lg:pb-0" style={{ paddingBottom: 'calc(4rem + var(--sab))' }}>
          {children}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex z-30"
          style={{ paddingBottom: 'var(--sab)' }}
        >
          {bottomTabs.map((tab) => {
            const active = isActivePath(tab.path);
            const handleTabClick = (e) => {
              if (active) {
                e.preventDefault();
                navigate(tab.path);
              }
            };
            return (
              <Link
                key={tab.path}
                to={tab.path}
                onClick={handleTabClick}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors min-h-[56px]",
                  active ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500"
                )}
              >
                <tab.icon className={cn("w-5 h-5", active ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500")} />
                <span className="truncate max-w-[4rem] text-center leading-tight">{tab.name}</span>
              </Link>
            );
          })}
          <Link
            to="/NavInstellningar"
            className={cn(
              "flex-none w-12 flex flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors min-h-[56px]",
              location.pathname === '/NavInstellningar' ? "text-[#8B1E1E]" : "text-gray-400 dark:text-gray-500"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </Link>
        </nav>
      </div>
    </div>
    </>
  );
}