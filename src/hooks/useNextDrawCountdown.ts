import { useState, useEffect, useMemo } from "react";
import { DRAW_SCHEDULE } from "@/types/lottery";
import { getCurrentFrenchDay } from "@/utils/dateUtils";

interface NextDraw {
  name: string;
  time: string;
  timeUntil: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  isNow: boolean;
}

export const useNextDrawCountdown = () => {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nextDraw = useMemo((): NextDraw | null => {
    const today = getCurrentFrenchDay();
    const todayDraws = DRAW_SCHEDULE[today] || [];
    
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Trouver le prochain tirage
    const upcomingDraw = todayDraws.find(draw => draw.time > currentTime);
    
    if (!upcomingDraw) return null;
    
    const [drawHours, drawMinutes] = upcomingDraw.time.split(':').map(Number);
    const drawDate = new Date(now);
    drawDate.setHours(drawHours, drawMinutes, 0, 0);
    
    const diffMs = drawDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return {
        name: upcomingDraw.name,
        time: upcomingDraw.time,
        timeUntil: { hours: 0, minutes: 0, seconds: 0 },
        isNow: true
      };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return {
      name: upcomingDraw.name,
      time: upcomingDraw.time,
      timeUntil: { hours, minutes, seconds },
      isNow: false
    };
  }, [now]);

  return nextDraw;
};
