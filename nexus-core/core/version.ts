/**
 * @module version
 * @description Version information and metadata for Nexus OS Core
 * 
 * Provides centralized version tracking, feature flags, and build information.
 * 
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * Semantic version components
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  prerelease: null as string | null,
  build: null as string | null,
} as const;

/**
 * Full version string (e.g., "1.0.0", "1.0.0-beta.1")
 */
export const VERSION_STRING = `${VERSION.major}.${VERSION.minor}.${VERSION.patch}${
  VERSION.prerelease ? `-${VERSION.prerelease}` : ""
}${VERSION.build ? `+${VERSION.build}` : ""}`;

/**
 * Product information
 */
export const PRODUCT = {
  name: "Nexus OS Core",
  description: "AI Intelligence, Automation, and Content-Generation Backbone",
  author: "Synapse OS Team",
  license: "MIT",
  repository: "https://github.com/synapse-os/nexus-core",
} as const;

/**
 * Build metadata
 */
export const BUILD = {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || "development",
  nodeVersion: process.version,
} as const;

/**
 * Feature flags for gradual rollout
 */
export const FEATURES = {
  // Core features
  multiAgentProcessing: true,
  memorySystem: true,
  automationEngine: true,
  vectorSearch: true,
  
  // Experimental features
  experimentalStreaming: false,
  experimentalPlugins: false,
  experimentalCollaboration: false,
  
  // Debug features
  debugLogging: process.env.NODE_ENV === "development",
  performanceTracking: true,
  eventHistory: true,
} as const;

/**
 * API versions supported
 */
export const API_VERSIONS = {
  current: "v1",
  supported: ["v1"],
  deprecated: [] as string[],
} as const;

/**
 * Compatibility information
 */
export const COMPATIBILITY = {
  minNodeVersion: "18.0.0",
  minNextVersion: "14.0.0",
  requiredEnvVars: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ],
  optionalEnvVars: [
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
} as const;

/**
 * Get full version info object
 */
export function getVersionInfo() {
  return {
    version: VERSION_STRING,
    product: PRODUCT,
    build: BUILD,
    features: FEATURES,
    api: API_VERSIONS,
    compatibility: COMPATIBILITY,
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] ?? false;
}

/**
 * Validate environment setup
 */
export function validateEnvironment(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  COMPATIBILITY.requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  COMPATIBILITY.optionalEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      warnings.push(`Optional: ${envVar} not set`);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

