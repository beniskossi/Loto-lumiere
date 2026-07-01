import { cn } from "@/lib/utils";
import { getNumberColorClasses } from "@/utils/numberColors";

interface NumberBallProps {
  number: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export const NumberBall = ({ number, size = "md", className, onClick }: NumberBallProps) => {
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 sm:w-8 sm:h-8 text-xs",
    md: "w-9 h-9 sm:w-10 sm:h-10 text-sm",
    lg: "w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center font-bold shadow-md",
        "transition-all duration-300 touch-target font-display",
        "relative overflow-hidden",
        onClick ? "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg" : "cursor-default",
        getNumberColorClasses(number),
        sizeClasses[size],
        className
      )}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50" />
      <span className="relative z-10">{number}</span>
    </div>
  );
};
