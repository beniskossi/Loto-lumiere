// Rate Limiter pour Edge Functions
// Protège contre l'abus et les attaques DoS

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval: number;

  constructor(options: { windowMs?: number; maxRequests?: number } = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute par défaut
    this.maxRequests = options.maxRequests || 10; // 10 requêtes max par défaut
    this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs) as unknown as number;
  }

  /**
   * Vérifie si une requête est autorisée
   * @param identifier - Identifiant unique (IP, user ID, etc.)
   * @returns true si autorisé, false si rate limit dépassé
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Première requête ou fenêtre expirée
    if (!entry || now > entry.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    // Incrémenter le compteur
    entry.count++;

    // Vérifier la limite
    if (entry.count > this.maxRequests) {
      return false;
    }

    return true;
  }

  /**
   * Obtient les informations de rate limit pour un identifier
   */
  getInfo(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now > entry.resetTime) {
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetIn: this.windowMs,
      };
    }

    const allowed = entry.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetIn = entry.resetTime - now;

    return { allowed, remaining, resetIn };
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Arrête le nettoyage automatique
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Helper pour extraire l'identifiant client d'une requête
 */
export function getClientIdentifier(req: Request): string {
  // Essayer d'obtenir l'IP réelle (si derrière un proxy)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback sur l'user agent (moins fiable)
  const userAgent = req.headers.get("user-agent") || "unknown";
  return `ua:${userAgent.substring(0, 100)}`;
}

/**
 * Crée une réponse HTTP 429 (Too Many Requests)
 */
export function createRateLimitResponse(resetIn: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": String(Math.ceil(resetIn / 1000)),
        "X-RateLimit-Limit": "10",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Date.now() + resetIn),
        "Content-Type": "application/json",
      },
    }
  );
}
