/**
 * Dirichlet-Multinomial Model for Loto Lumiere
 * 
 * Ce module remplace les estimations de probabilité naïves (fréquence simple)
 * par un modèle bayésien robuste basé sur la distribution de Dirichlet-Multinomial.
 * 
 * Il permet :
 * 1. D'éviter l'écueil des probabilités à 0 (via le lissage de Laplace / prior de Dirichlet).
 * 2. De calculer des intervalles de confiance bayésiens crédibles pour chaque numéro.
 * 3. D'intégrer un facteur d'atténuation temporelle (Time Decay) pour pondérer les tirages récents.
 */

export interface DirichletParams {
  priorWeight?: number; // Somme des alphas du prior (défaut: 90 pour un prior uniforme alpha_i = 1)
  timeDecay?: number; // Facteur d'atténuation (ex: 0.99 pour donner plus de poids aux récents, 1.0 pour poids égal)
}

export interface DirichletEstimation {
  expectedProbability: number;
  variance: number;
  lowerBound95: number;
  upperBound95: number;
}

export class DirichletMultinomialEngine {
  private readonly TOTAL_NUMBERS = 90;
  private priorAlphas: Float64Array;
  
  constructor(private params: DirichletParams = {}) {
    const priorWeight = params.priorWeight || this.TOTAL_NUMBERS;
    this.priorAlphas = new Float64Array(this.TOTAL_NUMBERS).fill(priorWeight / this.TOTAL_NUMBERS);
  }

  /**
   * Calcule les paramètres postérieurs de Dirichlet à partir d'un historique de tirages.
   * @param historicalDraws Un tableau de tableaux contenant les 5 numéros gagnants. Le 1er élément est le PLUS RÉCENT (ou on gère par index).
   * @returns Un tableau de 90 paramètres alpha postérieurs.
   */
  public calculatePosterior(historicalDraws: number[][]): Float64Array {
    const posterior = new Float64Array(this.priorAlphas);
    const decay = this.params.timeDecay || 1.0;
    
    // On suppose que l'historique est trié du plus récent au plus ancien, ou chronologique.
    // Pour être robuste, on va assumer que historicalDraws[0] est le plus récent,
    // mais on applique le decay en remontant le temps.
    for (let t = 0; t < historicalDraws.length; t++) {
      const weight = Math.pow(decay, t);
      const draw = historicalDraws[t];
      
      for (const num of draw) {
        if (num >= 1 && num <= this.TOTAL_NUMBERS) {
          posterior[num - 1] += weight;
        }
      }
    }
    
    return posterior;
  }

  /**
   * Estime la probabilité d'apparition de chaque numéro et sa variance.
   * @param posteriorAlphas Les paramètres de la distribution de Dirichlet a posteriori
   * @returns Une Map associant chaque numéro (1-90) à ses métriques bayésiennes.
   */
  public estimateProbabilities(posteriorAlphas: Float64Array): Map<number, DirichletEstimation> {
    let alphaSum = 0;
    for (let i = 0; i < this.TOTAL_NUMBERS; i++) {
      alphaSum += posteriorAlphas[i];
    }

    const estimations = new Map<number, DirichletEstimation>();
    
    // Approximation pour l'intervalle de crédibilité à 95% (distribution Bêta marginale)
    // Quantile Z approché pour 95% = 1.96
    const zScore = 1.96;

    for (let i = 0; i < this.TOTAL_NUMBERS; i++) {
      const alpha_i = posteriorAlphas[i];
      
      // Espérance mathématique (Mean of Beta distribution)
      const expectedProbability = alpha_i / alphaSum;
      
      // Variance marginale (Variance of Beta distribution)
      const variance = (alpha_i * (alphaSum - alpha_i)) / (Math.pow(alphaSum, 2) * (alphaSum + 1));
      
      // Écart-type
      const stdDev = Math.sqrt(variance);
      
      // Intervalle de crédibilité (approximation normale de la loi Bêta pour grand alphaSum)
      const lowerBound95 = Math.max(0, expectedProbability - zScore * stdDev);
      const upperBound95 = Math.min(1, expectedProbability + zScore * stdDev);

      estimations.set(i + 1, {
        expectedProbability,
        variance,
        lowerBound95,
        upperBound95
      });
    }

    return estimations;
  }
}
