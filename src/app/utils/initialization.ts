/**
* Application Initialization for bixtx.com
* Sets up security monitoring, compatibility checks, error handling,
* feature flags, metrics collection, and resilient retry logic.
* 
* @version 3.0.0
*/

import { initializeSecurityMonitoring, checkSecurityCompliance } from './securityCompliance';
import { 
 detectCapabilities, 
 getBrowserInfo, 
 getCompatibilityScore,
 logCapabilities,
 isBrowserSupported,
 getUpgradeMessage
} from './featureDetection';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface InitResult {
 success: boolean;
 warnings: string[];
 errors: string[];
 metrics: InitMetrics;
 diagnostics?: StartupDiagnostics;
}

interface InitMetrics {
 totalDuration: number;
 stepTimings: Record<string, number>;
 retryAttempts: Record<string, number>;
 timestamp: string;
}

interface StartupDiagnostics {
 browser: {
   name: string;
   version: string;
   engine: string;
   secure: boolean;
   mobile: boolean;
 };
 compatibility: {
   score: number;
   supported: boolean;
   missingFeatures: string[];
 };
 security: {
   compliant: boolean;
   issues: string[];
   recommendations: string[];
 };
 features: Record<string, boolean>;
}

interface HealthCheckResult {
 status: 'healthy' | 'degraded' | 'critical';
 issues: string[];
 timestamp: string;
 metrics: {
   score: number;
   featureFlagsActive: number;
 };
}

interface FeatureFlag {
 name: string;
 enabled: boolean;
 source: 'local' | 'remote' | 'default';
 rolloutPercentage?: number;
}

interface TelemetryEvent {
 type: 'init' | 'error' | 'metric' | 'feature_flag';
 name: string;
 payload: Record<string, unknown>;
 timestamp: string;
 sessionId: string;
}

type InitStep = {
 name: string;
 critical: boolean;
 retryable: boolean;
 maxRetries: number;
 run: () => Promise<void> | void;
};

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
 RETRY: {
   maxAttempts: 3,
   baseDelay: 300,
   maxDelay: 5000,
   backoffMultiplier: 2
 },
 FEATURE_FLAGS: {
   remoteUrl: '/api/feature-flags',
   refreshInterval: 5 * 60 * 1000,
   defaults: {
     'new_ui_enabled': false,
     'webrtc_experimental': false,
     'metrics_collection': true,
     'storage_encryption': false,
     'service_worker_cache': true
   }
 },
 TELEMETRY: {
   enabled: true,
   batchSize: 10,
   flushInterval: 30000,
   endpoint: '/api/telemetry'
 }
};

// ============================================================================
// State Management
// ============================================================================

let isInitialized = false;
let initPromise: Promise<InitResult> | null = null;
const cleanupRegistry: Array<() => void> = [];
const featureFlags = new Map<string, FeatureFlag>();
const telemetryQueue: TelemetryEvent[] = [];
let telemetryFlushTimer: ReturnType<typeof setInterval> | null = null;
let sessionId = '';

// ============================================================================
// Core Utilities
// ============================================================================

function generateSessionId(): string {
 return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function isBrowser(): boolean {
 return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function registerCleanup(cleanup: () => void): void {
 cleanupRegistry.push(cleanup);
}

export function disposeApp(): void {
 cleanupRegistry.forEach(cleanup => {
   try { cleanup(); } catch (e) { /* ignore */ }
 });
 cleanupRegistry.length = 0;
 
 if (telemetryFlushTimer) {
   clearInterval(telemetryFlushTimer);
   telemetryFlushTimer = null;
 }
 
 featureFlags.clear();
 telemetryQueue.length = 0;
 isInitialized = false;
 initPromise = null;
 sessionId = '';
 console.log('[Init] Application disposed');
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

async function withRetry<T>(
 fn: () => Promise<T> | T,
 options: {
   maxRetries?: number;
   baseDelay?: number;
   maxDelay?: number;
   backoffMultiplier?: number;
   context: string;
 }
): Promise<{ success: boolean; data?: T; error?: string; attempts: number }> {
 const {
   maxRetries = CONFIG.RETRY.maxAttempts,
   baseDelay = CONFIG.RETRY.baseDelay,
   maxDelay = CONFIG.RETRY.maxDelay,
   backoffMultiplier = CONFIG.RETRY.backoffMultiplier,
   context
 } = options;

 let attempts = 0;
 let lastError: Error | null = null;

 while (attempts <= maxRetries) {
   try {
     const result = await fn();
     return { success: true, data: result, attempts: attempts + 1 };
   } catch (err) {
     lastError = err instanceof Error ? err : new Error(String(err));
     attempts++;

     if (attempts > maxRetries) break;

     const delay = Math.min(
       baseDelay * Math.pow(backoffMultiplier, attempts - 1),
       maxDelay
     );
     
     console.warn(`[Retry] ${context} failed (attempt ${attempts}/${maxRetries + 1}), retrying in ${delay}ms...`);
     await new Promise(resolve => setTimeout(resolve, delay));
   }
 }

 return {
   success: false,
   error: `${context} failed after ${attempts} attempts: ${lastError?.message}`,
   attempts
 };
}

// ============================================================================
// Feature Flag System
// ============================================================================

async function initializeFeatureFlags(): Promise<void> {
 Object.entries(CONFIG.FEATURE_FLAGS.defaults).forEach(([name, enabled]) => {
   featureFlags.set(name, {
     name,
     enabled,
     source: 'default'
   });
 });

 if (!isBrowser()) return;

 try {
   const cached = localStorage.getItem('bixtx_feature_flags');
   if (cached) {
     const parsed = JSON.parse(cached);
     Object.entries(parsed).forEach(([name, flag]: [string, any]) => {
       if (featureFlags.has(name)) {
         featureFlags.set(name, { ...flag, source: 'local' });
       }
     });
   }
 } catch (e) {
   console.warn('[FeatureFlags] Failed to load from cache');
 }

 const remoteResult = await withRetry(
   async () => {
     const response = await fetch(CONFIG.FEATURE_FLAGS.remoteUrl, {
       credentials: 'same-origin',
       headers: { 'Accept': 'application/json' }
     });
     if (!response.ok) throw new Error(`HTTP ${response.status}`);
     return response.json();
   },
   { context: 'Feature flag fetch', maxRetries: 2 }
 );

 if (remoteResult.success && remoteResult.data) {
   Object.entries(remoteResult.data).forEach(([name, config]: [string, any]) => {
     const rollout = config.rolloutPercentage ?? 100;
     const sessionHash = sessionId.split('-')[1] ?? '0';
     const userRoll = parseInt(sessionHash, 36) % 100;
     const enabled = config.enabled && userRoll < rollout;

     featureFlags.set(name, {
       name,
       enabled,
       source: 'remote',
       rolloutPercentage: rollout
     });
   });

   try {
     localStorage.setItem('bixtx_feature_flags', JSON.stringify(Object.fromEntries(featureFlags)));
   } catch (e) {}
 }

 console.log(`[FeatureFlags] Loaded ${featureFlags.size} flags`);
}

export function isFeatureEnabled(name: string): boolean {
 const flag = featureFlags.get(name);
 return flag?.enabled ?? false;
}

export function getFeatureFlags(): FeatureFlag[] {
 return Array.from(featureFlags.values());
}

export async function refreshFeatureFlags(): Promise<void> {
 featureFlags.clear();
 await initializeFeatureFlags();
}

// ============================================================================
// Telemetry & Metrics Collection
// ============================================================================

function getSessionId(): string {
 if (!sessionId) {
   sessionId = generateSessionId();
 }
 return sessionId;
}

function trackEvent(event: Omit<TelemetryEvent, 'timestamp' | 'sessionId'>): void {
 if (!isFeatureEnabled('metrics_collection')) return;

 telemetryQueue.push({
   ...event,
   timestamp: new Date().toISOString(),
   sessionId: getSessionId()
 });

 if (telemetryQueue.length >= CONFIG.TELEMETRY.batchSize) {
   flushTelemetry();
 }
}

async function flushTelemetry(): Promise<void> {
 if (telemetryQueue.length === 0) return;

 const batch = telemetryQueue.splice(0, telemetryQueue.length);

 if (!isBrowser() || !CONFIG.TELEMETRY.enabled) {
   console.log('[Telemetry]', batch);
   return;
 }

 try {
   if (navigator.sendBeacon) {
     const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' });
     navigator.sendBeacon(CONFIG.TELEMETRY.endpoint, blob);
   } else {
     await fetch(CONFIG.TELEMETRY.endpoint, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(batch),
       keepalive: true
     });
   }
 } catch (err) {
   console.warn('[Telemetry] Flush failed:', err);
 }
}

function startTelemetryFlush(): void {
 if (telemetryFlushTimer) return;
 telemetryFlushTimer = setInterval(() => flushTelemetry(), CONFIG.TELEMETRY.flushInterval);
 registerCleanup(() => {
   if (telemetryFlushTimer) {
     clearInterval(telemetryFlushTimer);
     telemetryFlushTimer = null;
   }
 });
}

function createStepTimer(stepName: string): () => number {
 const start = performance.now();
 return () => {
   const duration = performance.now() - start;
   trackEvent({
     type: 'metric',
     name: 'init_step_duration',
     payload: { step: stepName, duration }
   });
   return duration;
 };
}

// ============================================================================
// Safe Execution Wrappers
// ============================================================================

function safeExec<T>(fn: () => T, context: string): { success: boolean; data?: T; error?: string } {
 try {
   return { success: true, data: fn() };
 } catch (err) {
   const message = err instanceof Error ? err.message : String(err);
   console.error(`[Init] ${context} failed:`, message);
   trackEvent({
     type: 'error',
     name: 'init_error',
     payload: { context, message, phase: 'sync' }
   });
   return { success: false, error: `${context}: ${message}` };
 }
}

async function safeExecAsync(
 fn: () => Promise<void>,
 context: string
): Promise<{ success: boolean; error?: string }> {
 try {
   await fn();
   return { success: true };
 } catch (err) {
   const message = err instanceof Error ? err.message : String(err);
   console.error(`[Init] ${context} failed:`, message);
   trackEvent({
     type: 'error',
     name: 'init_error',
     payload: { context, message, phase: 'async' }
   });
   return { success: false, error: `${context}: ${message}` };
 }
}

// ============================================================================
// Main Initialization
// ============================================================================

export async function initializeApp(): Promise<InitResult> {
 if (initPromise) return initPromise;
 
 if (isInitialized) {
   console.warn('[Init] Already initialized. Call disposeApp() to reinitialize.');
   return { 
     success: true, 
     warnings: ['Already initialized'], 
     errors: [],
     metrics: { totalDuration: 0, stepTimings: {}, retryAttempts: {}, timestamp: new Date().toISOString() }
   };
 }

 initPromise = performInitialization();
 return initPromise;
}

async function performInitialization(): Promise<InitResult> {
 const initStart = performance.now();
 const warnings: string[] = [];
 const errors: string[] = [];
 const stepTimings: Record<string, number> = {};
 const retryAttempts: Record<string, number> = {};

 console.log('[Init] Starting bixtx.com initialization...');

 await initializeFeatureFlags();
 startTelemetryFlush();

 trackEvent({
   type: 'init',
   name: 'initialization_started',
   payload: { url: isBrowser() ? window.location.href : 'server', userAgent: isBrowser() ? navigator.userAgent : 'none' }
 });

 const steps: InitStep[] = [
   {
     name: 'securityMonitoring',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => {
       console.log('[Init] Setting up security monitoring...');
       initializeSecurityMonitoring();
     }
   },
   {
     name: 'browserCapabilities',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => {
       if (!isBrowser()) {
         warnings.push('Non-browser environment detected');
         return;
       }
       
       const browserResult = safeExec(getBrowserInfo, 'Browser detection');
       const scoreResult = safeExec(getCompatibilityScore, 'Compatibility scoring');
       
       if (browserResult.success && browserResult.data) {
         console.log(`[Init] Browser: ${browserResult.data.name} ${browserResult.data.version}`);
       }
       if (scoreResult.success && scoreResult.data !== undefined) {
         console.log(`[Init] Compatibility Score: ${scoreResult.data}%`);
       }
       
       safeExec(logCapabilities, 'Capability logging');
     }
   },
   {
     name: 'browserSupport',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => {
       if (!isBrowser()) return;
       
       const supportedResult = safeExec(isBrowserSupported, 'Support check');
       if (!supportedResult.success || supportedResult.data === false) {
         const msgResult = safeExec(getUpgradeMessage, 'Upgrade message');
         const message = msgResult.success && msgResult.data 
           ? msgResult.data 
           : 'Browser not fully supported';
         warnings.push(message);
       }
     }
   },
   {
     name: 'criticalFeatures',
     critical: true,
     retryable: true,
     maxRetries: 2,
     run: async () => {
       if (!isBrowser()) {
         errors.push('Browser environment required');
         return;
       }
       
       const capsResult = await withRetry(
         detectCapabilities,
         { context: 'Capability detection', maxRetries: 2 }
       );
       
       if (!capsResult.success || !capsResult.data) {
         errors.push('Failed to detect browser capabilities');
         return;
       }
       
       retryAttempts['criticalFeatures'] = capsResult.attempts - 1;
       
       const capabilities = capsResult.data;
       const criticalFeatures = ['webrtc', 'mediaDevices'] as const;
       
       const missingCritical = criticalFeatures.filter(feature => {
         return !(feature in capabilities) || !capabilities[feature];
       });
       
       if (missingCritical.length > 0) {
         const error = `Critical features missing: ${missingCritical.join(', ')}`;
         errors.push(error);
         console.error(`[Init] ${error}`);
       }
     }
   },
   {
     name: 'securityCompliance',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => {
       if (!isBrowser()) return;
       
       console.log('[Init] Checking security compliance...');
       const complianceResult = safeExec(checkSecurityCompliance, 'Compliance check');
       
       if (complianceResult.success && complianceResult.data) {
         const status = complianceResult.data;
         if (!status.compliant && Array.isArray(status.issues)) {
           status.issues.forEach((issue: string) => warnings.push(issue));
         }
       } else {
         warnings.push('Security compliance check failed');
       }
     }
   },
   {
     name: 'secureContext',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => {
       if (!isBrowser()) return;
       if (!window.isSecureContext) {
         warnings.push('Not running in secure context (HTTPS). Some features may be unavailable.');
       }
     }
   },
   {
     name: 'globalErrorHandling',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => setupGlobalErrorHandling()
   },
   {
     name: 'visibilityMonitoring',
     critical: false,
     retryable: false,
     maxRetries: 0,
     run: () => setupVisibilityMonitoring()
   },
   {
     name: 'storageAvailability',
     critical: false,
     retryable: true,
     maxRetries: 3,
     run: async () => {
       const result = await withRetry(
         () => checkStorageAvailability(warnings),
         { context: 'Storage check', maxRetries: 3 }
       );
       retryAttempts['storageAvailability'] = result.attempts - 1;
     }
   }
 ];

 for (const step of steps) {
   const endTimer = createStepTimer(step.name);
   
   let result;
   if (step.retryable) {
     result = await safeExecAsync(step.run, step.name);
   } else {
     result = await safeExecAsync(step.run, step.name);
   }
   
   stepTimings[step.name] = endTimer();

   if (!result.success) {
     if (step.critical) {
       errors.push(result.error || `${step.name} failed`);
       break;
     } else {
       warnings.push(result.error || `${step.name} warning`);
     }
   }
 }

 isInitialized = true;
 const totalDuration = performance.now() - initStart;

 const success = errors.length === 0;
 
 const metrics: InitMetrics = {
   totalDuration,
   stepTimings,
   retryAttempts,
   timestamp: new Date().toISOString()
 };

 trackEvent({
   type: 'init',
   name: success ? 'initialization_success' : 'initialization_failure',
   payload: { 
     duration: totalDuration, 
     warnings: warnings.length, 
     errors: errors.length,
     retryAttempts 
   }
 });

 await flushTelemetry();

 let diagnostics: StartupDiagnostics | undefined;
 if (isBrowser()) {
   try {
     diagnostics = await getStartupDiagnostics();
   } catch (e) {
     warnings.push('Failed to collect startup diagnostics');
   }
 }

 return { success, warnings, errors, metrics, diagnostics };
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupGlobalErrorHandling(): void {
 if (!isBrowser()) return;
 if ((window as any).__bixtxErrorHandlingInstalled) return;
 (window as any).__bixtxErrorHandlingInstalled = true;

 const errorHandler = (event: ErrorEvent) => {
   event.preventDefault();
   
   trackEvent({
     type: 'error',
     name: 'uncaught_error',
     payload: {
       message: event.message,
       filename: event.filename,
       line: event.lineno,
       stack: event.error?.stack
     }
   });

   console.error('[Global] Uncaught error:', {
     message: event.message,
     filename: event.filename,
     line: event.lineno,
     column: event.colno,
     stack: event.error?.stack,
     timestamp: new Date().toISOString()
   });
 };

 const rejectionHandler = (event: PromiseRejectionEvent) => {
   event.preventDefault();
   
   const reason = event.reason;
   trackEvent({
     type: 'error',
     name: 'unhandled_rejection',
     payload: {
       reason: reason instanceof Error ? reason.message : String(reason),
       stack: reason instanceof Error ? reason.stack : undefined
     }
   });

   console.error('[Global] Unhandled rejection:', {
     reason: reason instanceof Error ? reason.message : String(reason),
     stack: reason instanceof Error ? reason.stack : undefined,
     timestamp: new Date().toISOString()
   });
 };

 window.addEventListener('error', errorHandler);
 window.addEventListener('unhandledrejection', rejectionHandler);

 registerCleanup(() => {
   window.removeEventListener('error', errorHandler);
   window.removeEventListener('unhandledrejection', rejectionHandler);
   (window as any).__bixtxErrorHandlingInstalled = false;
 });

 console.log('[Init] Global error handling configured');
}

function setupVisibilityMonitoring(): void {
 if (!isBrowser()) return;
 if ((document as any).__bixtxVisibilityInstalled) return;
 (document as any).__bixtxVisibilityInstalled = true;

 const handler = () => {
   const isHidden = document.hidden;
   
   trackEvent({
     type: 'metric',
     name: 'visibility_change',
     payload: { hidden: isHidden }
   });

   console.log(`[Visibility] Page ${isHidden ? 'hidden' : 'visible'}`);
   
   window.dispatchEvent(new CustomEvent('bixtx:visibilitychange', {
     detail: { hidden: isHidden, timestamp: Date.now() }
   }));
 };

 document.addEventListener('visibilitychange', handler);

 registerCleanup(() => {
   document.removeEventListener('visibilitychange', handler);
   (document as any).__bixtxVisibilityInstalled = false;
 });

 console.log('[Init] Visibility monitoring configured');
}

// ============================================================================
// Storage (with retry support)
// ============================================================================

async function checkStorageAvailability(warnings: string[]): Promise<void> {
 if (!isBrowser()) {
   warnings.push('Storage APIs unavailable in non-browser environment');
   return;
 }

 const testKey = '__bixtx_storage_test__';

 const lsResult = await withRetry(
   () => {
     localStorage.setItem(testKey, '1');
     const value = localStorage.getItem(testKey);
     localStorage.removeItem(testKey);
     if (value !== '1') throw new Error('Read/write mismatch');
     return true;
   },
   { context: 'localStorage check', maxRetries: 2 }
 );

 if (lsResult.success) {
   console.log('[Init] localStorage available');
 } else {
   warnings.push(`localStorage unavailable: ${lsResult.error}`);
 }

 const ssResult = await withRetry(
   () => {
     sessionStorage.setItem(testKey, '1');
     const value = sessionStorage.getItem(testKey);
     sessionStorage.removeItem(testKey);
     if (value !== '1') throw new Error('Read/write mismatch');
     return true;
   },
   { context: 'sessionStorage check', maxRetries: 2 }
 );

 if (ssResult.success) {
   console.log('[Init] sessionStorage available');
 } else {
   warnings.push(`sessionStorage unavailable: ${ssResult.error}`);
 }

 if ('indexedDB' in window) {
   console.log('[Init] IndexedDB available');
 } else {
   warnings.push('IndexedDB not available');
 }
}

// ============================================================================
// Diagnostics
// ============================================================================

export async function getStartupDiagnostics(): Promise<StartupDiagnostics> {
 if (!isBrowser()) {
   throw new Error('Diagnostics require browser environment');
 }

 const [browserInfo, capabilities, score, supported, securityStatus] = await Promise.all([
   safeExec(getBrowserInfo, 'Browser info').then(r => r.data),
   safeExec(detectCapabilities, 'Capabilities').then(r => r.data),
   safeExec(getCompatibilityScore, 'Score').then(r => r.data),
   safeExec(isBrowserSupported, 'Supported').then(r => r.data),
   safeExec(checkSecurityCompliance, 'Security').then(r => r.data)
 ]);

 const missingFeatures: string[] = [];
 if (capabilities && typeof capabilities === 'object') {
   Object.entries(capabilities).forEach(([feature, available]) => {
     if (available === false) missingFeatures.push(feature);
   });
 }

 return {
   browser: browserInfo || {
     name: 'unknown',
     version: 'unknown',
     engine: 'unknown',
     secure: window.isSecureContext,
     mobile: false
   },
   compatibility: {
     score: score ?? 0,
     supported: supported ?? false,
     missingFeatures
   },
   security: securityStatus || {
     compliant: false,
     issues: ['Security check failed'],
     recommendations: []
   },
   features: capabilities || {}
 };
}

// ============================================================================
// Display & Utilities
// ============================================================================

export function displayInitializationBanner(): void {
 if (!isBrowser()) return;

 const banner = `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                      BIXTX                                 ║
║              Supreme Remote Access Platform                  ║
║                                                            ║
║  🔒 Security First  |  🌐 Browser Compliant               ║
║  🛡️ Antivirus Safe  |  🔄 Update Resilient                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
 `;

 console.log(banner);

 const infoResult = safeExec(getBrowserInfo, 'Banner info');
 const scoreResult = safeExec(getCompatibilityScore, 'Banner score');

 const info = infoResult.success ? infoResult.data : null;
 const score = scoreResult.success ? scoreResult.data : null;

 const styles = {
   header: 'color: #10d9a0; font-weight: bold',
   alert: 'color: #f59e0b; font-weight: bold',
   critical: 'color: #ef4444; font-weight: bold'
 };

 if (info) {
   console.log(`%c🌐 Browser: ${info.name} ${info.version}`, styles.header);
 }
 if (score !== null && score !== undefined) {
   const scoreStyle = score < 70 ? styles.critical : score < 90 ? styles.alert : styles.header;
   console.log(`%c⚡ Compatibility: ${score}%`, scoreStyle);
 }
 
 console.log(`%c🔒 Secure Context: ${window.isSecureContext ? 'Yes' : 'No'}`, 
   window.isSecureContext ? styles.header : styles.critical);
 
 console.log('');
 console.log('%cAll systems operational ✨', 'color: #10b981; font-size: 14px; font-weight: bold');
 console.log('');
}

export async function checkForAppUpdate(): Promise<{ hasUpdate: boolean; version?: string }> {
 if (!isBrowser() || !('serviceWorker' in navigator)) {
   return { hasUpdate: false };
 }

 const result = await withRetry(
   async () => {
     const registration = await navigator.serviceWorker.ready;
     if (registration.waiting) return { hasUpdate: true, version: 'pending' };
     await registration.update();
     if (registration.installing) return { hasUpdate: true, version: 'installing' };
     return { hasUpdate: false };
   },
   { context: 'Service worker update check', maxRetries: 2 }
 );

 if (result.success) return result.data ?? { hasUpdate: false };
 return { hasUpdate: false };
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
 const issues: string[] = [];
 let status: HealthCheckResult['status'] = 'healthy';
 const timestamp = new Date().toISOString();

 if (!isBrowser()) {
   return { 
     status: 'critical', 
     issues: ['Not in browser environment'], 
     timestamp,
     metrics: { score: 0, featureFlagsActive: 0 }
   };
 }

 if (!isInitialized) {
   issues.push('Application not initialized');
 }

 const scoreResult = safeExec(getCompatibilityScore, 'Health check score');
 const score = scoreResult.data ?? 0;

 if (score < 50) {
   status = 'critical';
   issues.push(`Browser compatibility critically low (${score}%)`);
 } else if (score < 70) {
   status = 'critical';
   issues.push(`Browser compatibility too low (${score}%)`);
 } else if (score < 90) {
   status = status === 'healthy' ? 'degraded' : status;
   issues.push(`Some features may not be available (${score}%)`);
 }

 if (!window.isSecureContext) {
   status = status === 'healthy' ? 'degraded' : status;
   issues.push('Not running in secure context (HTTPS)');
 }

 const capsResult = safeExec(detectCapabilities, 'Health check capabilities');
 const capabilities = capsResult.data;

 if (capabilities) {
   if (!capabilities.webrtc) {
     status = 'critical';
     issues.push('WebRTC not available');
   }
   if (!capabilities.mediaDevices) {
     status = 'critical';
     issues.push('MediaDevices API not available');
   }
 } else {
   status = 'degraded';
   issues.push('Could not verify critical APIs');
 }

 trackEvent({
   type: 'metric',
   name: 'health_check',
   payload: { status, issues: issues.length, score }
 });

 return { 
   status, 
   issues, 
   timestamp,
   metrics: {
     score,
     featureFlagsActive: featureFlags.size
   }
 };
}

// ============================================================================
// Exports
// ============================================================================

export { isInitialized, isBrowser, isFeatureEnabled, getFeatureFlags, refreshFeatureFlags };
