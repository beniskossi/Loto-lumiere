import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeLabels: Record<string, string> = {
  "/": "Accueil",
  "/tirage": "Tirage",
  "/statistiques": "Statistiques",
  "/consulter": "Consulter",
  "/historique": "Historique",
  "/admin": "Administration",
  "/dashboard": "Tableau de bord",
  "/auth": "Authentification",
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Don't show breadcrumbs on auth page
  if (location.pathname === "/auth") return null;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Accueil", path: "/" },
  ];

  let currentPath = "";
  pathnames.forEach((pathname, index) => {
    currentPath += `/${pathname}`;
    
    // Try to get a meaningful label
    let label = routeLabels[currentPath] || pathname;
    
    // If it's a dynamic route (like /tirage/:drawName), use the actual value
    if (!routeLabels[currentPath]) {
      label = decodeURIComponent(pathname);
    }

    breadcrumbs.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      path: currentPath,
    });
  });

  // Don't show if only home
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 animate-fade-in">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              )}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {isFirst ? <Home className="h-4 w-4" /> : crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className={cn(
                    "inline-flex items-center hover:text-foreground transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  )}
                >
                  {isFirst ? <Home className="h-4 w-4" /> : crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
