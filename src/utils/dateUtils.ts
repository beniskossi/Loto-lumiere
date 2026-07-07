// Utilitaires pour la gestion des dates et jours

const FRENCH_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const getCurrentFrenchDay = (): string => {
  const now = new Date();
  return FRENCH_DAYS[now.getDay()];
};

export const getFrenchDayFromDate = (date: Date): string => {
  return FRENCH_DAYS[date.getDay()];
};

export const getCurrentTime = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

export const isDrawPassed = (drawTime: string): boolean => {
  const currentTime = getCurrentTime();
  return currentTime > drawTime;
};

export const isDrawUpcoming = (drawTime: string, withinMinutes: number = 60): boolean => {
  const now = new Date();
  const [hours, minutes] = drawTime.split(':').map(Number);
  const drawDate = new Date(now);
  drawDate.setHours(hours, minutes, 0, 0);
  
  const diffMs = drawDate.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  return diffMinutes > 0 && diffMinutes <= withinMinutes;
};

export const getDrawStatus = (drawTime: string, isToday: boolean): 'passed' | 'upcoming' | 'future' => {
  if (!isToday) return 'future';
  if (isDrawPassed(drawTime)) return 'passed';
  if (isDrawUpcoming(drawTime, 60)) return 'upcoming';
  return 'future';
};

export const formatDateToFrench = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

export const formatDateForQuery = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatToFrenchDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  // If it's already DD/MM/YYYY, return it
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // Try YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  // Try ISO date with time or T...
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  // Otherwise, use basic JS Date
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // Ignore and fallback
  }
  return dateStr;
};
