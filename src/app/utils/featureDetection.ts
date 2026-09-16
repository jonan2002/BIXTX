/**
 * Feature Detection System for bixtx.com
 * Detects browser capabilities and provides fallbacks
 * Ensures compatibility across different browsers and versions
 */

export interface BrowserCapabilities {
  webrtc: boolean;
  mediaDevices: boolean;
  screenCapture: boolean;
  clipboard: boolean;
  notifications: boolean;
  webSockets: boolean;
  fileTransfer: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  webWorkers: boolean;
  cryptoAPI: boolean;
  fullscreen: boolean;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  secure: boolean;
  mobile: boolean;
}

/**
 * Detect all browser capabilities
 */
export function detectCapabilities(): BrowserCapabilities {
  return {
    webrtc: detectWebRTC(),
    mediaDevices: detectMediaDevices(),
    screenCapture: detectScreenCapture(),
    clipboard: detectClipboard(),
    notifications: detectNotifications(),
    webSockets: detectWebSockets(),
    fileTransfer: detectFileTransfer(),
    indexedDB: detectIndexedDB(),
    serviceWorker: detectServiceWorker(),
    webWorkers: detectWebWorkers(),
    cryptoAPI: detectCryptoAPI(),
    fullscreen: detectFullscreen()
  };
}

/**
 * Detect WebRTC support
 */
function detectWebRTC(): boolean {
  return !!(
    window.RTCPeerConnection ||
    (window as any).mozRTCPeerConnection ||
    (window as any).webkitRTCPeerConnection
  );
}

/**
 * Detect Media Devices API
 */
function detectMediaDevices(): boolean {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

/**
 * Detect Screen Capture API
 */
function detectScreenCapture(): boolean {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
}

/**
 * Detect Clipboard API
 */
function detectClipboard(): boolean {
  // Check for modern Clipboard API or fallback execCommand
  return !!(navigator.clipboard || document.queryCommandSupported?.('copy'));
}

/**
 * Detect Notifications API
 */
function detectNotifications(): boolean {
  return 'Notification' in window;
}

/**
 * Detect WebSocket support
 */
function detectWebSockets(): boolean {
  return 'WebSocket' in window;
}

/**
 * Detect File Transfer capabilities
 */
function detectFileTransfer(): boolean {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * Detect IndexedDB support
 */
function detectIndexedDB(): boolean {
  return !!(window.indexedDB || (window as any).mozIndexedDB || (window as any).webkitIndexedDB);
}

/**
 * Detect Service Worker support
 */
function detectServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Detect Web Workers support
 */
function detectWebWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Detect Crypto API support
 */
function detectCryptoAPI(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}

/**
 * Detect Fullscreen API support
 */
function detectFullscreen(): boolean {
  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );
}

/**
 * Get browser information
 */
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  let engine = 'Unknown';

  // Detect browser name and version
  if (ua.indexOf('Firefox') > -1) {
    name = 'Firefox';
    version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    engine = 'Gecko';
  } else if (ua.indexOf('Edg') > -1) {
    name = 'Edge';
    version = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
    engine = 'Chromium';
  } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    name = 'Chrome';
    version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    engine = 'Chromium';
  } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    name = 'Safari';
    version = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    engine = 'WebKit';
  } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
    name = 'Opera';
    version = ua.match(/(?:Opera|OPR)\/([0-9.]+)/)?.[1] || 'Unknown';
    engine = 'Chromium';
  }

  return {
    name,
    version,
    engine,
    secure: window.isSecureContext || false,
    mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  };
}

/**
 * Check if running in a secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || false;
}

/**
 * Get missing features report
 */
export function getMissingFeatures(): string[] {
  const capabilities = detectCapabilities();
  const missing: string[] = [];

  Object.entries(capabilities).forEach(([feature, supported]) => {
    if (!supported) {
      missing.push(feature);
    }
  });

  return missing;
}

/**
 * Get compatibility score (0-100)
 */
export function getCompatibilityScore(): number {
  const capabilities = detectCapabilities();
  const supported = Object.values(capabilities).filter(Boolean).length;
  const total = Object.keys(capabilities).length;
  return Math.round((supported / total) * 100);
}

/**
 * Check if browser is supported
 */
export function isBrowserSupported(): boolean {
  const score = getCompatibilityScore();
  // Require at least 70% compatibility
  return score >= 70;
}

/**
 * Get recommended browser upgrade message
 */
export function getUpgradeMessage(): string | null {
  if (isBrowserSupported()) {
    return null;
  }

  const browserInfo = getBrowserInfo();
  const missing = getMissingFeatures();

  return `Your browser (${browserInfo.name} ${browserInfo.version}) is missing support for: ${missing.join(', ')}. Please upgrade to the latest version or use a modern browser like Chrome, Firefox, or Edge.`;
}

/**
 * Check for specific feature with fallback suggestion
 */
export function checkFeature(feature: keyof BrowserCapabilities): {
  supported: boolean;
  fallback?: string;
} {
  const capabilities = detectCapabilities();
  const supported = capabilities[feature];

  const fallbacks: Partial<Record<keyof BrowserCapabilities, string>> = {
    clipboard: 'Using legacy clipboard method',
    notifications: 'Toast notifications available',
    webrtc: 'P2P connection not available',
    screenCapture: 'Screen sharing not available',
    fullscreen: 'Manual fullscreen mode available'
  };

  return {
    supported,
    fallback: !supported ? fallbacks[feature] : undefined
  };
}

/**
 * Log capabilities for debugging
 */
export function logCapabilities(): void {
  const capabilities = detectCapabilities();
  const browserInfo = getBrowserInfo();
  const score = getCompatibilityScore();

  console.group('🔍 bixtx.com - Browser Capabilities');
  console.log('Browser:', browserInfo.name, browserInfo.version);
  console.log('Engine:', browserInfo.engine);
  console.log('Secure Context:', browserInfo.secure);
  console.log('Mobile:', browserInfo.mobile);
  console.log('Compatibility Score:', `${score}%`);
  console.log('\nFeature Support:');
  Object.entries(capabilities).forEach(([feature, supported]) => {
    console.log(`  ${supported ? '✅' : '❌'} ${feature}`);
  });
  console.groupEnd();
}
