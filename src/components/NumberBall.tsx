import { cn } from "@/lib/utils";
import { getNumberColorClasses } from "@/utils/numberColors";

interface NumberBallProps {
  number: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  confidence?: number;
}

export const NumberBall = ({ number, size = "md", className, onClick, confidence }: NumberBallProps) => {
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 sm:w-8 sm:h-8 text-xs",
    md: "w-9 h-9 sm:w-10 sm:h-10 text-sm",
    lg: "w-12 h-12 sm:w-14 sm:h-14 text-base sm:text-lg",
  };

  const safeNumber = Number.isNaN(number) || number == null ? "?" : number;

  const ball = (
    <div
      onClick={onClick}
      className={cn(
        "rounded-full flex items-center justify-center font-bold shadow-md",
        "transition-all duration-300 touch-target font-display",
        "relative overflow-hidden z-10",
        onClick ? "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg" : "cursor-default",
        getNumberColorClasses(typeof safeNumber === "number" ? safeNumber : 1),
        sizeClasses[size],
        className
      )}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50" />
      <span className="relative z-10">{safeNumber}</span>
    </div>
  );

  const isConfValid = confidence !== undefined && confidence !== null && !Number.isNaN(confidence);

  if (isConfValid) {
    const rawConf = confidence <= 1 && confidence > 0 ? confidence * 100 : confidence;
    const clampedConf = Math.min(100, Math.max(0, rawConf));
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedConf / 100) * circumference;
    
    const getStrokeColor = (conf: number) => {
      if (conf >= 80) return "stroke-emerald-500";
      if (conf >= 60) return "stroke-amber-500";
      return "stroke-rose-500";
    };

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          <svg className="absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] -rotate-90 pointer-events-none" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              className="fill-none stroke-muted opacity-50"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              className={cn("fill-none transition-all duration-1000 ease-out", getStrokeColor(clampedConf))}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={Number.isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {ball}
        </div>
        <span className="text-[10px] sm:text-xs font-mono text-muted-foreground font-medium">
          {Math.round(clampedConf)}%
        </span>
      </div>
    );
  }

  return ball;
};
