/**
 * Service Worker Utility for bixtx.com
 * Provides offline functionality and caching strategies
 * Helps maintain functionality during browser updates
 */

import { logDataAccess } from './securityCompliance';

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.log('Service Workers are not supported in this browser');
    return null;
  }

  try {
    // Only register in production or when explicitly enabled
    if (import.meta.env.PROD || import.meta.env.VITE_SW_ENABLED) {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration.scope);
      logDataAccess('ServiceWorker', 'Registered for offline support');

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      return registration;
    }
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }

  return null;
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const unregistered = await registration.unregister();
      if (unregistered) {
        console.log('Service Worker unregistered successfully');
        logDataAccess('ServiceWorker', 'Unregistered');
      }
      return unregistered;
    }
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
  }

  return false;
}

/**
 * Check if there's an update available
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return !!registration.waiting;
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }

  return false;
}

/**
 * Activate waiting service worker
 */
export function activateWaitingServiceWorker(): void {
  if (!isServiceWorkerSupported()) {
    return;
  }

  navigator.serviceWorker.getRegistration().then(registration => {
    if (registration?.waiting) {
      // Send message to activate the waiting service worker
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}

/**
 * Listen for service worker updates
 */
export function onServiceWorkerUpdate(callback: () => void): void {
  if (!isServiceWorkerSupported()) {
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    callback();
  });

  navigator.serviceWorker.getRegistration().then(registration => {
    if (registration) {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              callback();
            }
          });
        }
      });
    }
  });
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
    logDataAccess('Cache', 'All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Get cache storage usage
 */
export async function getCacheUsage(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentage
    };
  } catch (error) {
    console.error('Failed to get cache usage:', error);
    return null;
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator && 'persist' in navigator.storage)) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    if (isPersisted) {
      console.log('Persistent storage granted');
      logDataAccess('Storage', 'Persistent storage granted');
    }
    return isPersisted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (!('storage' in navigator && 'persisted' in navigator.storage)) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Failed to check storage persistence:', error);
    return false;
  }
}
