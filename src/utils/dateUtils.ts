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
