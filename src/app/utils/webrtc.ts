/**
 * WebRTC Compatibility Layer for bixtx.com
 * Handles different browser implementations and version changes
 * Provides graceful fallbacks and error handling
 */

import { logConnectionEstablished, logConnectionTerminated, logPermissionGranted } from './securityCompliance';

/**
 * Get the appropriate RTCPeerConnection constructor
 */
export function getRTCPeerConnection(): typeof RTCPeerConnection | null {
  // Standard RTCPeerConnection
  if (typeof RTCPeerConnection !== 'undefined') {
    return RTCPeerConnection;
  }

  // Webkit prefix (older Safari)
  if (typeof (window as any).webkitRTCPeerConnection !== 'undefined') {
    return (window as any).webkitRTCPeerConnection;
  }

  // Mozilla prefix (older Firefox)
  if (typeof (window as any).mozRTCPeerConnection !== 'undefined') {
    return (window as any).mozRTCPeerConnection;
  }

  return null;
}

/**
 * Check if WebRTC is supported
 */
export function isWebRTCSupported(): boolean {
  return getRTCPeerConnection() !== null;
}

/**
 * Get getUserMedia with browser compatibility
 */
export function getUserMedia(
  constraints: MediaStreamConstraints
): Promise<MediaStream> {
  // Modern API
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  // Legacy API
  const legacyGetUserMedia = 
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia ||
    (navigator as any).msGetUserMedia;

  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject);
    });
  }

  // Return a mock stream for environments without getUserMedia
  console.log('getUserMedia not available, returning mock stream');
  return Promise.resolve(new MediaStream());
}

/**
 * Get display media (screen sharing) with compatibility
 */
export function getDisplayMedia(
  constraints: DisplayMediaStreamConstraints = { video: true }
): Promise<MediaStream> {
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
    return navigator.mediaDevices.getDisplayMedia(constraints);
  }

  // Some older browsers use getUserMedia with chromeMediaSource
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    const modifiedConstraints: any = {
      video: {
        ...(typeof constraints.video === 'object' ? constraints.video : {}),
        mediaSource: 'screen'
      }
    };
    return navigator.mediaDevices.getUserMedia(modifiedConstraints);
  }

  // Return a mock stream for environments without screen sharing
  console.log('Screen sharing not available, returning mock stream');
  return Promise.resolve(new MediaStream());
}

/**
 * Create a peer connection with standard configuration
 */
export function createPeerConnection(
  config?: RTCConfiguration
): RTCPeerConnection | null {
  const RTCPeerConnectionClass = getRTCPeerConnection();
  
  if (!RTCPeerConnectionClass) {
    console.error('RTCPeerConnection not available');
    return null;
  }

  // Default configuration with STUN/TURN servers
  const defaultConfig: RTCConfiguration = {
    iceServers: [
      // Google STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Additional STUN servers for redundancy
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      // TURN servers (replace with your own credentials in production)
      {
        urls: 'turn:turn.bixtx.com:3478',
        username: 'bixtx_user',
        credential: 'bixtx_secure_pass'
      },
      {
        urls: 'turns:turn.bixtx.com:5349',
        username: 'bixtx_user',
        credential: 'bixtx_secure_pass'
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  const finalConfig = config || defaultConfig;
  
  try {
    const pc = new RTCPeerConnectionClass(finalConfig);
    
    // Add event listeners for monitoring
    pc.addEventListener('iceconnectionstatechange', () => {
      console.log('ICE Connection State:', pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected') {
        logConnectionEstablished('peer', 'WebRTC P2P');
      } else if (pc.iceConnectionState === 'disconnected' || 
                 pc.iceConnectionState === 'failed' || 
                 pc.iceConnectionState === 'closed') {
        logConnectionTerminated('peer', `ICE state: ${pc.iceConnectionState}`);
      }
    });

    pc.addEventListener('connectionstatechange', () => {
      console.log('Connection State:', pc.connectionState);
    });

    pc.addEventListener('signalingstatechange', () => {
      console.log('Signaling State:', pc.signalingState);
    });

    return pc;
  } catch (error) {
    console.error('Failed to create peer connection:', error);
    return null;
  }
}

/**
 * Enumerate available media devices
 */
export async function getMediaDevices(): Promise<MediaDeviceInfo[]> {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      logPermissionGranted('MediaDevices', `Found ${devices.length} devices`);
      return devices;
    }
  } catch (error) {
    console.error('Failed to enumerate devices:', error);
  }
  
  return [];
}

/**
 * Get audio devices
 */
export async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await getMediaDevices();
  return devices.filter(device => device.kind === 'audioinput');
}

/**
 * Get video devices (cameras)
 */
export async function getVideoDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await getMediaDevices();
  return devices.filter(device => device.kind === 'videoinput');
}

/**
 * Check if a specific codec is supported
 */
export function isCodecSupported(mimeType: string): boolean {
  if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
    return MediaRecorder.isTypeSupported(mimeType);
  }
  return false;
}

/**
 * Get supported video codecs
 */
export function getSupportedVideoCodecs(): string[] {
  const codecs = [
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
    'video/webm;codecs=h264',
    'video/webm;codecs=av1',
    'video/mp4;codecs=h264',
    'video/mp4;codecs=avc1'
  ];

  return codecs.filter(codec => isCodecSupported(codec));
}

/**
 * Get best available codec for recording
 */
export function getBestVideoCodec(): string {
  const codecs = getSupportedVideoCodecs();
  
  // Prefer VP9 for quality, then VP8 for compatibility
  if (codecs.includes('video/webm;codecs=vp9')) {
    return 'video/webm;codecs=vp9';
  }
  if (codecs.includes('video/webm;codecs=vp8')) {
    return 'video/webm;codecs=vp8';
  }
  if (codecs.includes('video/webm;codecs=h264')) {
    return 'video/webm;codecs=h264';
  }
  
  // Fallback to first available
  return codecs[0] || 'video/webm';
}

/**
 * Create a media recorder with best settings
 */
export function createMediaRecorder(
  stream: MediaStream,
  options?: MediaRecorderOptions
): MediaRecorder | null {
  if (typeof MediaRecorder === 'undefined') {
    console.error('MediaRecorder not supported');
    return null;
  }

  try {
    // Use provided options or determine best codec
    const recorderOptions = options || {
      mimeType: getBestVideoCodec(),
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    };

    // Fallback if specified codec not supported
    if (recorderOptions.mimeType && !isCodecSupported(recorderOptions.mimeType)) {
      recorderOptions.mimeType = getBestVideoCodec();
    }

    return new MediaRecorder(stream, recorderOptions);
  } catch (error) {
    console.error('Failed to create MediaRecorder:', error);
    
    // Try without options as last resort
    try {
      return new MediaRecorder(stream);
    } catch (fallbackError) {
      console.error('MediaRecorder creation failed completely:', fallbackError);
      return null;
    }
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  
  stream.getTracks().forEach(track => {
    track.stop();
    stream.removeTrack(track);
  });
}

/**
 * Get connection quality metrics
 */
export async function getConnectionStats(
  pc: RTCPeerConnection
): Promise<{
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number;
} | null> {
  if (!pc || !pc.getStats) {
    return null;
  }

  try {
    const stats = await pc.getStats();
    let bytesReceived = 0;
    let bytesSent = 0;
    let packetsLost = 0;
    let roundTripTime = 0;

    stats.forEach((report: any) => {
      if (report.type === 'inbound-rtp') {
        bytesReceived += report.bytesReceived || 0;
        packetsLost += report.packetsLost || 0;
      } else if (report.type === 'outbound-rtp') {
        bytesSent += report.bytesSent || 0;
      } else if (report.type === 'candidate-pair' && report.nominated) {
        roundTripTime = report.currentRoundTripTime || 0;
      }
    });

    return {
      bytesReceived,
      bytesSent,
      packetsLost,
      roundTripTime
    };
  } catch (error) {
    console.error('Failed to get connection stats:', error);
    return null;
  }
}

/**
 * Test WebRTC connectivity
 */
export async function testWebRTCConnectivity(): Promise<{
  canConnect: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  canScreenShare: boolean;
}> {
  const result = {
    canConnect: isWebRTCSupported(),
    hasCamera: false,
    hasMicrophone: false,
    canScreenShare: false
  };

  try {
    // Check for camera
    const videoDevices = await getVideoDevices();
    result.hasCamera = videoDevices.length > 0;

    // Check for microphone
    const audioDevices = await getAudioDevices();
    result.hasMicrophone = audioDevices.length > 0;

    // Check for screen sharing
    result.canScreenShare = !!(
      navigator.mediaDevices && 
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  } catch (error) {
    console.error('Error testing WebRTC connectivity:', error);
  }

  return result;
}