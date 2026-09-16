import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, BarChart3, Settings, LogOut, Users, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { gsap } from "gsap";
import {
  Sheet,
  SheetContent,
  SheetHeader,
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

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const adminNavigation = [
  { name: "Manajemen User", href: "/users", icon: Users },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

function NavItem({
  item,
  onClick,
  mobile = false,
}: {
  item: { name: string; href: string; icon: React.ElementType };
  onClick?: () => void;
  mobile?: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === item.href;

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-sm font-medium transition-colors duration-150",
        mobile
          ? cn(
              "w-full px-3 py-2.5 rounded-lg",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )
          : cn(
              "px-3 py-1.5 rounded-md",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-foreground/60 hover:text-foreground hover:bg-muted"
            )
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{item.name}</span>
    </NavLink>
  );
}

function TopNav() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const allNav = user?.role === "admin" ? [...navigation, ...adminNavigation] : navigation;
  const navRef = useRef<HTMLElement>(null);

  // GSAP: stagger nav links from top on mount, respects prefers-reduced-motion
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const links = Array.from(el.querySelectorAll("a")) as HTMLElement[];
      gsap.from(links, {
        opacity: 0,
        y: -6,
        duration: 0.25,
        stagger: 0.04,
        ease: "power1.out",
        clearProps: "all",
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      {/* Brand accent line */}
      <div className="h-0.5 w-full bg-primary" />

      <div className="flex h-14 items-center px-4 md:px-6 gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/icon/logos.svg" alt="GiziX" className="h-7 w-7 object-contain" />
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-foreground leading-none">GiziX</span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Puskesmas Pulau Gadang</p>
          </div>
        </NavLink>

        {/* Desktop nav */}
        <nav ref={navRef} className="hidden md:flex items-center gap-1 ml-6" aria-label="Navigasi utama">
          {navigation.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
          {user?.role === "admin" &&
            adminNavigation.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
        </nav>

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
                className="h-8 gap-2 px-2 text-sm text-foreground/70 hover:text-foreground hidden md:flex"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-primary">
                    {user?.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <span className="max-w-[120px] truncate text-xs">{user?.email}</span>
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

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" aria-label="Buka menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-5 border-b border-border">
                <SheetTitle className="flex items-center gap-2.5">
                  <img src="/icon/logos.svg" alt="GiziX" className="h-7 w-7 object-contain" />
                  <div>
                    <p className="text-sm font-semibold">GiziX</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Puskesmas Pulau Gadang</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="p-4 space-y-1" aria-label="Navigasi mobile">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-2">Menu</p>
                {navigation.map((item) => (
                  <NavItem key={item.href} item={item} mobile onClick={() => setMobileOpen(false)} />
                ))}
                {user?.role === "admin" && (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mt-4 mb-2">Admin</p>
                    {adminNavigation.map((item) => (
                      <NavItem key={item.href} item={item} mobile onClick={() => setMobileOpen(false)} />
                    ))}
                  </>
                )}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                <div className="mb-3 px-3">
                  <p className="text-[10px] text-muted-foreground">Masuk sebagai</p>
                  <p className="text-xs font-medium truncate">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/5"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 px-4 py-6 md:px-6 md:py-8 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <footer className="border-t border-border bg-card py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-muted-foreground">
          <p>© {new Date().getFullYear()} UPT Puskesmas Pulau Gadang</p>
          <p>Build &amp; Design by Rossa Gusti Yolanda, S.Gz</p>
        </div>
      </footer>
    </div>
  );
}
