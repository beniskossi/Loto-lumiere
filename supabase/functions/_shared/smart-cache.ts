// Smart Cache with LRU and predictive preloading
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
  size: number;
}

interface CacheMetadata {
  drawName?: string;
  lastUpdate?: number;
  dependencies?: string[];
}

export class SmartCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize = 1000;
  private maxMemory = 50 * 1024 * 1024; // 50MB
  private ttl = 3600000; // 1 hour
  private currentMemory = 0;

  set(key: string, value: T, metadata?: CacheMetadata): void {
    // Check if should invalidate
    if (metadata && this.shouldInvalidate(key, metadata)) {
      this.invalidateRelated(key, metadata);
    }

    const size = this.estimateSize(value);

    // Evict if needed
    while (
      (this.cache.size >= this.maxSize || this.currentMemory + size > this.maxMemory) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    // Add to cache
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
      size,
    });

    this.currentMemory += size;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    // Update hits
    entry.hits++;
    entry.timestamp = Date.now();

    return entry.value;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= entry.size;
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.currentMemory = 0;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    // Find LRU entry (considering hits and timestamp)
    this.cache.forEach((entry, key) => {
      const score = entry.hits / (Date.now() - entry.timestamp + 1);
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  private shouldInvalidate(key: string, metadata: CacheMetadata): boolean {
    if (!metadata.lastUpdate) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    return metadata.lastUpdate > entry.timestamp;
  }

  private invalidateRelated(key: string, metadata: CacheMetadata): void {
    if (!metadata.dependencies) return;

    metadata.dependencies.forEach(dep => {
      const pattern = new RegExp(dep);
      this.cache.forEach((_, k) => {
        if (pattern.test(k)) {
          this.delete(k);
        }
      });
    });
  }

  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
      return 1024; // Default 1KB
    }
  }

  // Preload predictions
  async preload(drawName: string, predictor: (name: string) => Promise<T>): Promise<void> {
    const predictions = this.predictNextQueries(drawName);

    await Promise.all(
      predictions.map(async query => {
        if (!this.get(query)) {
          try {
            const result = await predictor(query);
            this.set(query, result);
          } catch {
            // Ignore preload errors
          }
        }
      })
    );
  }

  private predictNextQueries(drawName: string): string[] {
    return [
      `prediction:${drawName}`,
      `statistics:${drawName}`,
      `history:${drawName}:10`,
      `patterns:${drawName}`,
    ];
  }

  getStats() {
    let totalHits = 0;
    let totalEntries = 0;

    this.cache.forEach(entry => {
      totalHits += entry.hits;
      totalEntries++;
    });

    return {
      size: this.cache.size,
      memory: this.currentMemory,
      avgHits: totalEntries > 0 ? totalHits / totalEntries : 0,
      hitRate: totalHits / (totalHits + totalEntries),
    };
  }
}

// Global cache instance
export const globalCache = new SmartCache();
