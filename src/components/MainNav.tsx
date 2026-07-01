import { NavLink } from "@/components/NavLink";
import { Home, BarChart3, History, FileSearch, LayoutDashboard, Shield } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/MobileNav";

interface MainNavProps {
  className?: string;
}

export const MainNav = ({ className }: MainNavProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);

  const navItems = [
    { to: "/", label: "Accueil", icon: Home, end: true },
    { to: "/statistiques", label: "Statistiques", icon: BarChart3 },
    { to: "/consulter", label: "Consulter", icon: FileSearch },
    { to: "/historique", label: "Historique", icon: History },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  if (isAdmin) {
    navItems.push({ to: "/admin", label: "Admin", icon: Shield });
  }

  return (
    <>
      {/* Mobile Navigation */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Desktop Navigation */}
      <nav className={cn("hidden md:flex flex-wrap items-center gap-1", className)}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="text-sm"
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};
