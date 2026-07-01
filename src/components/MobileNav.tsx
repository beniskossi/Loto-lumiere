import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { 
  Home, 
  BarChart3, 
  History, 
  FileSearch, 
  LayoutDashboard, 
  Shield, 
  Menu,
  Sparkles,
  TrendingUp,
  Activity
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";

export const MobileNav = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole(user?.id);
  const [open, setOpen] = useState(false);

  const mainNavItems = [
    { to: "/", label: "Accueil", icon: Home, end: true, description: "Dashboard principal" },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Vue personnalisée" },
  ];

  const analysisNavItems = [
    { to: "/statistiques", label: "Statistiques", icon: BarChart3, description: "Analyses détaillées" },
    { to: "/consulter", label: "Consulter", icon: FileSearch, description: "Prédictions avancées" },
    { to: "/historique", label: "Historique", icon: History, description: "Résultats passés" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          aria-label="Menu de navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            LOTO LUMIÈRE
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 space-y-6">
          {/* Section Principale */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Principal
            </h3>
            <nav className="space-y-1">
              {mainNavItems.map((item) => (
                <SheetClose asChild key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group w-full"
                    activeClassName="bg-primary/10 text-primary font-medium"
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground group-hover:text-foreground/80">
                        {item.description}
                      </p>
                    </div>
                  </NavLink>
                </SheetClose>
              ))}
            </nav>
          </div>

          <Separator />

          {/* Section Analyses */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Analyses
            </h3>
            <nav className="space-y-1">
              {analysisNavItems.map((item) => (
                <SheetClose asChild key={item.to}>
                  <NavLink
                    to={item.to}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group w-full"
                    activeClassName="bg-primary/10 text-primary font-medium"
                    onClick={() => setOpen(false)}
                  >
                    <item.icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground group-hover:text-foreground/80">
                        {item.description}
                      </p>
                    </div>
                  </NavLink>
                </SheetClose>
              ))}
            </nav>
          </div>

          {/* Section Admin */}
          {isAdmin && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Administration
                </h3>
                <nav>
                  <SheetClose asChild>
                    <NavLink
                      to="/admin"
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group w-full"
                      activeClassName="bg-primary/10 text-primary font-medium"
                      onClick={() => setOpen(false)}
                    >
                      <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Admin</p>
                        <p className="text-xs text-muted-foreground group-hover:text-foreground/80">
                          Gestion du système
                        </p>
                      </div>
                    </NavLink>
                  </SheetClose>
                </nav>
              </div>
            </>
          )}
        </div>

        {/* Version Info */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-xs text-muted-foreground text-center p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="font-semibold">LOTO LUMIÈRE</p>
            <p className="mt-1">Version 2.1.0 • Côte d'Ivoire</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
