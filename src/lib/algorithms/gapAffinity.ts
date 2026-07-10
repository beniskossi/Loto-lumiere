import { DrawResult } from "@/types/lottery";

export interface GapAffinityResult {
  number: number;
  currentGap: number;
  affinityScore: number;
  cohort: "court" | "moyen" | "long" | "critique";
}

export interface TransformedNumber {
  original: number;
  voisinMoins: number; // n - 1
  voisinPlus: number;  // n + 1
  ombreLineaire: number; // 91 - n
  ombreCirculaire: number; // (n + 45) % 90
  miroir: number;       // reversed digits
}

/**
 * Moteur Déterministe d'Affinité des Écarts et de Géométrie des Nombres (Zéro hasard, Zéro nombre magique)
 */
export class GapAffinityEngine {
  private static MAX_NUMBER = 90;

  /**
   * Calcule le gap actuel (nombre de tirages écoulés) pour chaque numéro de la grille [1, 90]
   */
  public static calculateCurrentGaps(results: DrawResult[]): Map<number, number> {
    const gaps = new Map<number, number>();
    for (let n = 1; n <= this.MAX_NUMBER; n++) {
      gaps.set(n, results.length); // Fallback: max possible si jamais vu
    }

    // Parcourir du plus récent au plus ancien
    const sorted = [...results].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      const draw = sorted[i];
      const numbers = draw.winningNumbers || [];
      for (const num of numbers) {
        if (gaps.get(num) === results.length) {
          gaps.set(num, i); // i représente l'écart (0 = sorti au dernier tirage, etc.)
        }
      }
    }

    return gaps;
  }

  /**
   * Calcule la médiane déterministe d'un tableau de nombres
   */
  private static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calcule la Séquence d'Affinité des Écarts pour un groupe de numéros donnés
   * Établit l'affinité des écarts par rapport aux structures de cycles de la loterie.
   */
  public static getGapAffinitySequence(
    results: DrawResult[],
    inputNumbers: number[],
    limit: number = 5
  ): GapAffinityResult[] {
    if (!results || results.length === 0 || inputNumbers.length === 0) {
      return [];
    }

    const gaps = this.calculateCurrentGaps(results);
    const gapValues = Array.from(gaps.values());
    const medianGap = this.calculateMedian(gapValues) || 12;

    // Calculer les quartiles des gaps de toute la grille pour définir les cohortes de façon scientifique
    const sortedGaps = [...gapValues].sort((a, b) => a - b);
    const q1 = sortedGaps[Math.floor(sortedGaps.length * 0.25)] || 5;
    const q2 = sortedGaps[Math.floor(sortedGaps.length * 0.50)] || 12;
    const q3 = sortedGaps[Math.floor(sortedGaps.length * 0.75)] || 24;

    // Récupérer les gaps des nombres d'entrée
    const inputGaps = inputNumbers.map(num => gaps.get(num) ?? 0);

    const affinityList: GapAffinityResult[] = [];

    for (let n = 1; n <= this.MAX_NUMBER; n++) {
      // Éviter de proposer un numéro déjà présent dans les numéros d'entrée
      if (inputNumbers.includes(n)) continue;

      const currentGap = gaps.get(n) ?? 0;

      // Calcul d'affinité matricielle: Moyenne des proximités exponentielles de gap
      // Formule: Affinity = (1 / |I|) * Sum( e^(-|g(n) - g(i)| / MedianGap) )
      let sumProximity = 0;
      for (const inputGap of inputGaps) {
        const delta = Math.abs(currentGap - inputGap);
        sumProximity += Math.exp(-delta / medianGap);
      }
      const affinityScore = sumProximity / inputNumbers.length;

      // Détermination de la cohorte selon les quartiles exacts calculés sur la grille
      let cohort: GapAffinityResult["cohort"] = "moyen";
      if (currentGap <= q1) {
        cohort = "court";
      } else if (currentGap <= q2) {
        cohort = "moyen";
      } else if (currentGap <= q3) {
        cohort = "long";
      } else {
        cohort = "critique";
      }

      affinityList.push({
        number: n,
        currentGap,
        affinityScore,
        cohort,
      });
    }

    // Trier par score d'affinité décroissant (déterministe, si égalité trié par le numéro lui-même)
    return affinityList
      .sort((a, b) => {
        if (Math.abs(a.affinityScore - b.affinityScore) < 1e-9) {
          return a.number - b.number; // Résolution d'égalité par le rang canonique
        }
        return b.affinityScore - a.affinityScore;
      })
      .slice(0, limit);
  }

  /**
   * Calcule le miroir d'un numéro dans une grille de 90
   * Règle déterministe:
   *  - Si n est un multiple de 10 (ex: 30), son miroir est son diviseur (ex: 3)
   *  - Si n est un chiffre simple (ex: 3), son miroir est son multiple (ex: 30)
   *  - Sinon, on inverse les chiffres en base 10 (ex: 12 -> 21, 47 -> 74)
   *  - Si le nombre inversé dépasse 90, on le ramène par modulo 90 (et si 0, 90)
   */
  public static calculateMirror(num: number): number {
    if (num <= 0 || num > 90) return num;
    
    let mirrorVal = num;
    if (num % 10 === 0) {
      mirrorVal = num / 10;
    } else if (num < 10) {
      mirrorVal = num * 10;
    } else {
      const units = num % 10;
      const tens = Math.floor(num / 10);
      mirrorVal = units * 10 + tens;
    }

    if (mirrorVal > 90) {
      mirrorVal = mirrorVal % 90;
      if (mirrorVal === 0) mirrorVal = 90;
    }
    
    return mirrorVal;
  }

  /**
   * Calcule l'écart géométrique des numéros (+1, -1, ombre, miroir) pour une liste de numéros
   */
  public static calculateNumberTransforms(numbers: number[]): TransformedNumber[] {
    return numbers.map(n => {
      // Voisins modulo 90
      let voisinMoins = n - 1;
      if (voisinMoins === 0) voisinMoins = 90;

      let voisinPlus = n + 1;
      if (voisinPlus === 91) voisinPlus = 1;

      // Ombre linéaire (complémentaire canonique à l'échelle de la grille)
      const ombreLineaire = 91 - n;

      // Ombre circulaire (antipode direct sur le cercle stochastique mod 90)
      let ombreCirculaire = (n + 45) % 90;
      if (ombreCirculaire === 0) ombreCirculaire = 90;

      // Miroir
      const miroir = this.calculateMirror(n);

      return {
        original: n,
        voisinMoins,
        voisinPlus,
        ombreLineaire,
        ombreCirculaire,
        miroir,
      };
    });
  }
}
