// Simple in-memory cache avec TTL pour les edge functions
// Note: Deno Deploy a une mémoire limitée, donc le cache est petit

export class SimpleCache<T> {
  private cache: Map<string, { data: T; expiry: number }>;
  private maxSize: number;
  
  constructor(maxSize = 20) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Vérifier l'expiration
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    // Si le cache est plein, supprimer l'entrée la plus ancienne
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Nettoyer les entrées expirées
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Instance globale partagée
export const predictionCache = new SimpleCache<any>(30);
export const dataCache = new SimpleCache<any>(20);

// Nettoyer le cache périodiquement (toutes les 10 minutes)
setInterval(() => {
  predictionCache.cleanup();
  dataCache.cleanup();
}, 10 * 60 * 1000);
