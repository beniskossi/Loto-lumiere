import { Link, LinkProps, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  end?: boolean;
}

export const NavLink = ({
  to,
  children,
  className,
  activeClassName = "bg-primary/10 text-primary font-semibold",
  end = false,
  ...props
}: NavLinkProps) => {
  const location = useLocation();
  const toPath = typeof to === "string" ? to : to.pathname;
  
  const isActive = end
    ? location.pathname === toPath
    : location.pathname.startsWith(toPath || "");

  return (
    <Link
      to={to}
      className={cn(
        "relative inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && activeClassName,
        className
      )}
      {...props}
    >
      {children}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-scale-in"
          aria-hidden="true"
        />
      )}
    </Link>
  );
};
