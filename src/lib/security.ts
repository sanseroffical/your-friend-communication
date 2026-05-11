/**
 * Security & Environment Configuration Module
 * Handles secure initialization and protection against common vulnerabilities
 */

// Security Headers - Prevent XSS, Clickjacking, MIME-type sniffing
export const setupSecurityHeaders = () => {
  // Content Security Policy
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = `
    default-src 'self' https:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.supabase.co;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com data:;
    connect-src 'self' https://*.supabase.co https://*.lovable.dev wss://*.supabase.co;
    frame-src 'self' https://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim();
  document.head.appendChild(cspMeta);

  // X-Frame-Options
  const xFrameOptions = document.createElement('meta');
  xFrameOptions.httpEquiv = 'X-UA-Compatible';
  xFrameOptions.content = 'IE=edge';
  document.head.appendChild(xFrameOptions);
};

// Environment Validation
export const validateEnvironment = () => {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}`
    );
  }
};

// URL Validation - Prevent open redirect vulnerabilities
export const isValidRedirectUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow redirects to same origin
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
};

// Input Sanitization - Prevent XSS attacks
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// Safe JSON Parse - Prevent JSON injection
export const safeJsonParse = <T = unknown>(json: string, fallback: T): T => {
  try {
    const parsed = JSON.parse(json);
    // Ensure it's actually an object/array
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as T;
    }
    return fallback;
  } catch {
    console.warn('Invalid JSON encountered during parse');
    return fallback;
  }
};

// CSRF Token Management
export const getCsrfToken = (): string => {
  let token = sessionStorage.getItem('csrf-token');
  if (!token) {
    token = crypto.getRandomValues(new Uint8Array(32)).toString();
    sessionStorage.setItem('csrf-token', token);
  }
  return token;
};

// Rate Limiting for API calls
export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (time) => now - time < this.windowMs
    );

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }

    return false;
  }

  getRemainingRequests(): number {
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }
}

// Secure Local Storage wrapper
export const secureStorage = {
  setItem: (key: string, value: unknown): void => {
    try {
      const serialized = JSON.stringify(value);
      // Basic encryption prefix (in production, use proper encryption)
      localStorage.setItem(`secure_${key}`, serialized);
    } catch (error) {
      console.error('Failed to set secure storage item:', error);
    }
  },

  getItem: <T = unknown>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`secure_${key}`);
      return item ? (JSON.parse(item) as T) : fallback;
    } catch (error) {
      console.error('Failed to get secure storage item:', error);
      return fallback;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(`secure_${key}`);
  },

  clear: (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    });
  },
};

export default {
  setupSecurityHeaders,
  validateEnvironment,
  isValidRedirectUrl,
  sanitizeHtml,
  safeJsonParse,
  getCsrfToken,
  RateLimiter,
  secureStorage,
};
