/**
 * Lazy loader for face-api.js
 * Reduces initial bundle size by ~3.5MB
 * Loads models only when face detection is first needed
 */

import { logger } from './logger';

// Type definitions for face-api (to avoid static import)
export type FaceApi = typeof import('face-api.js');

// Cache for the loaded module
let faceApiCache: FaceApi | null = null;
let loadingPromise: Promise<FaceApi> | null = null;

/**
 * Lazily loads face-api.js on first call
 * @returns Promise resolving to face-api module
 */
export async function loadFaceApi(): Promise<FaceApi> {
  // Return cached instance if available
  if (faceApiCache) {
    return faceApiCache;
  }

  // Return existing promise if loading is in progress
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = (async () => {
    try {
      logger.info('Lazy loading face-api.js...');
      const faceapi = await import('face-api.js');
      faceApiCache = faceapi;
      logger.info('face-api.js loaded successfully');
      return faceapi;
    } catch (error) {
      logger.error('Failed to load face-api.js', { 
        error: error instanceof Error ? error.message : 'Unknown' 
      });
      throw new Error('Face API failed to load. Check network connection.');
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Preloads face-api.js in background
 * Call this when app is idle to improve perceived performance
 */
export function preloadFaceApi(): void {
  if (!faceApiCache && !loadingPromise) {
    // Use setTimeout to not block current execution
    setTimeout(() => {
      loadFaceApi().catch(() => {
        // Preload failures are non-critical
        logger.debug('Preload of face-api.js failed (non-critical)');
      });
    }, 100);
  }
}

/**
 * Clears the cached face-api instance
 * Useful for memory cleanup in testing environments
 */
export function clearFaceApiCache(): void {
  faceApiCache = null;
  loadingPromise = null;
  logger.debug('face-api.js cache cleared');
}

/**
 * Check if face-api is already loaded
 */
export function isFaceApiLoaded(): boolean {
  return faceApiCache !== null;
}
