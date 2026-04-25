import { Landmark } from "./places";

/**
 * Configuration for the Ranking Engine
 */
interface RankingConfig {
  /**
   * The confidence threshold 'm' in Bayesian Average.
   * Represents the "weight" of the prior (average rating).
   * A higher value means we need more reviews to deviate from the global average.
   * Default: 10
   */
  confidenceThreshold: number;

  /**
   * The "prior" or global average rating 'C'.
   * In a perfect world, we calculate this dynamically, but a constant
   * based on platform averages is efficient and stable.
   * Default: 4.0
   */
  globalAverageRating: number;

  /**
   * Impact of the "Virality Boost".
   * Multiplier for the log10(review_count).
   * Default: 0.1 (Small nudges for popularity)
   */
  viralityWeight: number;
}

const DEFAULT_CONFIG: RankingConfig = {
  confidenceThreshold: 20, // It takes ~20 reviews to start "proving" yourself
  globalAverageRating: 4.2, // Places on Google tend to skew high; 4.2 is a reasonable "neutral"
  viralityWeight: 0.05, // A small boost for being famous, but Quality is King.
};

export class RankingEngine {
  private config: RankingConfig;

  constructor(config: Partial<RankingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculates the Bayesian Average Score for a single item.
   * Formula: S = (v / (v + m)) * R + (m / (v + m)) * C
   */
  private calculateBayesianScore(rating: number, reviewCount: number): number {
    const { confidenceThreshold: m, globalAverageRating: C } = this.config;
    const v = reviewCount;
    const R = rating;

    // Protection against bad data
    if (v < 0 || R < 0) return 0;

    const bayesian = (v / (v + m)) * R + (m / (v + m)) * C;
    return bayesian;
  }

  /**
   * Calculates a "Virality Boost" based on popularity.
   * We use log10 so that 10,000 reviews isn't 100x better than 100 reviews.
   * Formula: Boost = weight * log10(v + 1)
   */
  private calculateViralityBoost(reviewCount: number): number {
    if (reviewCount <= 0) return 0;
    return this.config.viralityWeight * Math.log10(reviewCount + 1);
  }

  /**
   * Computes the final detailed score for a place.
   */
  public getScore(place: Landmark): number {
    const rating = place.rating || 0;
    const reviewCount = place.userRatingCount || 0;

    // Filter out junk
    if (reviewCount === 0) return 0;

    const qualityScore = this.calculateBayesianScore(rating, reviewCount);
    const popularityBonus = this.calculateViralityBoost(reviewCount);

    return qualityScore + popularityBonus;
  }

  /**
   * Sorts a list of landmarks by their calculated score (descending).
   * Returns a new array, does not mutate original.
   * Scores are pre-computed once per element to avoid redundant calculations during sort.
   */
  public rank(places: Landmark[]): Landmark[] {
    const scored = places.map((p) => ({
      place: p,
      score: this.getScore(p),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.place);
  }
}

// Singleton export for easy usage
export const rankingEngine = new RankingEngine();
