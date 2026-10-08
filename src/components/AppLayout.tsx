import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, BarChart3, Settings, LogOut, Users, Menu, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeStorage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { gsap } from "gsap";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sections = [
  {
    label: "Menu Utama",
    adminOnly: false,
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Administrasi",
    adminOnly: true,
    items: [
      { name: "Manajemen User", href: "/users", icon: Users },
      { name: "Pengaturan", href: "/settings", icon: Settings },
    ],
  },
];

const COLLAPSE_KEY = "posyandu_sidebar_collapsed";

function NavItem({
  item,
  collapsed,
  onClick,
}: {
  item: { name: string; href: string; icon: React.ElementType };
  collapsed: boolean;
  onClick?: () => void;
}) {
  const isActive = useLocation().pathname === item.href;

  const link = (
    <NavLink
      to={item.href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-foreground/60 hover:text-foreground hover:bg-muted"
      )}
    >
      {isActive && <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-full bg-primary" aria-hidden="true" />}
      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className={cn("whitespace-nowrap transition-opacity duration-200", collapsed && "opacity-0")}>{item.name}</span>
    </NavLink>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.name}</TooltipContent>
    </Tooltip>
  );
}

// Shared by the desktop rail and the mobile Sheet
function SidebarBody({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const navRef = useRef<HTMLElement>(null);

  // GSAP: stagger nav links on mount, respects prefers-reduced-motion
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(Array.from(el.querySelectorAll("a")), {
        opacity: 0,
        x: -8,
        duration: 0.25,
        stagger: 0.04,
        ease: "power1.out",
        clearProps: "all",
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <NavLink to="/" onClick={onNavigate} className="flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-border px-[18px]">
        <img src="/icon/logos.svg" alt="GiziX" className="h-7 w-7 flex-shrink-0 object-contain" />
        <div className={cn("whitespace-nowrap transition-opacity duration-200", collapsed && "opacity-0")}>
          <span className="text-sm font-semibold text-foreground leading-none">GiziX</span>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Puskesmas Pulau Gadang</p>
        </div>
      </NavLink>

      <nav ref={navRef} className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3" aria-label="Navigasi utama">
        {sections
          .filter((s) => !s.adminOnly || user?.role === "admin")
          .map((s) => (
            <div key={s.label} className="space-y-1">
              {collapsed ? (
                <Separator className="my-2" />
              ) : (
                <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
              )}
              {s.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} onClick={onNavigate} />
              ))}
            </div>
          ))}
      </nav>

      {onToggle && (
        <div className="flex-shrink-0 border-t border-border p-3">
          <Button
            variant="ghost"
            onClick={onToggle}
            aria-label={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
            className="h-9 w-full justify-start gap-3 px-3 text-sm font-medium text-foreground/60 hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4 flex-shrink-0" /> : <PanelLeftClose className="h-4 w-4 flex-shrink-0" />}
            <span className={cn("whitespace-nowrap transition-opacity duration-200", collapsed && "opacity-0")}>Perkecil</span>
          </Button>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // Close mobile menu on any route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const section = sections.find((s) => s.items.some((i) => i.href === pathname));
  const current = section?.items.find((i) => i.href === pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      {/* Mobile hamburger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="Buka menu">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      {current && (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden text-muted-foreground sm:inline">{section.label}</span>
          <ChevronRight className="hidden h-3 w-3 text-muted-foreground sm:inline" aria-hidden="true" />
          <span className="truncate font-semibold text-foreground" aria-current="page">{current.name}</span>
        </nav>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
          {/* Online badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Online</span>
          </div>

          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                aria-label="Menu pengguna"
                className="h-8 gap-2 px-2 text-sm text-foreground/70 hover:text-foreground"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-primary">
                    {user?.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <span className="hidden max-w-[120px] truncate text-xs md:inline">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] text-muted-foreground">Masuk sebagai</p>
                <p className="text-xs font-medium truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </header>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => safeStorage.getItem(COLLAPSE_KEY) === "1");
  const toggle = () =>
    setCollapsed((c) => {
      safeStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          "hidden md:block flex-shrink-0 overflow-hidden border-r border-border bg-card transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarBody collapsed={collapsed} onToggle={toggle} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <main className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6 md:py-5">{children}</main>
          <footer className="border-t border-border bg-card py-3 px-4 md:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-muted-foreground">
              <p>© {new Date().getFullYear()} UPT Puskesmas Pulau Gadang</p>
              <p>Build &amp; Design by Rossa Gusti Yolanda, S.Gz</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
