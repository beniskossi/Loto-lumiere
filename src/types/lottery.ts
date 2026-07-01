export interface DrawResult {
  id: string;
  drawName: string;
  drawTime: string;
  drawDay: string;
  date: string;
  winningNumbers: number[];
  machineNumbers?: number[];
}

export interface DrawSchedule {
  name: string;
  time: string;
  day: string;
}

export const DRAW_SCHEDULE: Record<string, DrawSchedule[]> = {
  Lundi: [
    { name: "Reveil", time: "10:00", day: "Lundi" },
    { name: "Etoile", time: "13:00", day: "Lundi" },
    { name: "Akwaba", time: "16:00", day: "Lundi" },
    { name: "Monday Special", time: "19:50", day: "Lundi" },
  ],
  Mardi: [
    { name: "La Matinale", time: "10:00", day: "Mardi" },
    { name: "Emergence", time: "13:00", day: "Mardi" },
    { name: "Sika", time: "16:00", day: "Mardi" },
    { name: "Lucky Tuesday", time: "19:50", day: "Mardi" },
  ],
  Mercredi: [
    { name: "Premiere Heure", time: "10:00", day: "Mercredi" },
    { name: "Fortune", time: "13:00", day: "Mercredi" },
    { name: "Baraka", time: "16:00", day: "Mercredi" },
    { name: "Midweek", time: "19:50", day: "Mercredi" },
  ],
  Jeudi: [
    { name: "Kado", time: "10:00", day: "Jeudi" },
    { name: "Privilege", time: "13:00", day: "Jeudi" },
    { name: "Monni", time: "16:00", day: "Jeudi" },
    { name: "Fortune Thursday", time: "19:50", day: "Jeudi" },
  ],
  Vendredi: [
    { name: "Cash", time: "10:00", day: "Vendredi" },
    { name: "Solution", time: "13:00", day: "Vendredi" },
    { name: "Wari", time: "16:00", day: "Vendredi" },
    { name: "Friday Bonanza", time: "19:50", day: "Vendredi" },
  ],
  Samedi: [
    { name: "Soutra", time: "10:00", day: "Samedi" },
    { name: "Diamant", time: "13:00", day: "Samedi" },
    { name: "Moaye", time: "16:00", day: "Samedi" },
    { name: "National", time: "19:50", day: "Samedi" },
  ],
  Dimanche: [
    { name: "Benediction", time: "10:00", day: "Dimanche" },
    { name: "Prestige", time: "13:00", day: "Dimanche" },
    { name: "Awale", time: "16:00", day: "Dimanche" },
    { name: "Espoir", time: "19:50", day: "Dimanche" },
  ],
};

export const DAYS_ORDER = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
