# WebRTC Configuration Guide - bixtx.com

This document explains the WebRTC configuration and functionality implemented in bixtx for real-time peer-to-peer communication.

## Overview

bixtx.com now includes comprehensive WebRTC support for:
- **Real-time video/audio streaming** between devices
- **Screen sharing** capabilities
- **Peer-to-peer data channels** for remote control commands
- **Connection quality monitoring** with detailed statistics
- **Multi-device concurrent connections** support

## Architecture

### Core Components

#### 1. WebRTC Utilities (`/utils/webrtc.ts`)
- Browser compatibility layer for WebRTC APIs
- STUN/TURN server configuration
- Media device enumeration and management
- Codec detection and selection
- Connection statistics gathering

#### 2. WebRTC Manager (`/utils/webrtcManager.ts`)
- `WebRTCConnectionManager` class for managing peer connections
- Signaling protocol implementation
- Connection lifecycle management
- Data channel creation and handling
- Stream management (local and remote)

#### 3. WebRTC Context (`/contexts/WebRTCContext.tsx`)
- React context provider for WebRTC functionality
- Global state management for connections
- Hooks for easy integration:
  - `useWebRTC()` - Main WebRTC hook
  - `useRemoteControl()` - Remote control command hook

#### 4. WebRTC Dashboard (`/components/WebRTCDashboard.tsx`)
- Visual interface for managing WebRTC connections
- Real-time connection statistics display
- Media stream controls
- Connection quality monitoring

## Configuration

### STUN/TURN Servers

The application is configured with multiple STUN servers for NAT traversal:

```typescript
{
  iceServers: [
    // Google STUN servers (public, free)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional STUN servers for redundancy
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    
    // TURN servers (replace with your own in production)
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
}
```

### Media Constraints

#### Camera/Microphone Stream
```typescript
{
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}
```

#### Screen Share Stream
```typescript
{
  video: {
    displaySurface: 'monitor',
    cursor: 'always',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  }
}
```

## Usage

### Initializing WebRTC

The WebRTC system is automatically initialized when you access the WebRTC Dashboard or Multi-Device Control:

```typescript
import { useWebRTC } from './contexts/WebRTCContext';

function MyComponent() {
  const { initialize } = useWebRTC();
  
  useEffect(() => {
    const deviceInfo = {
      id: 'my-device-id',
      name: 'My Device',
      type: 'desktop',
      os: 'Windows 11',
      capabilities: {
        video: true,
        audio: true,
        screen: true,
        dataChannel: true
      }
    };
    
    initialize(deviceInfo.id, deviceInfo);
  }, []);
}
```

### Connecting to a Device

```typescript
const { connectToDevice } = useWebRTC();

// Initiate connection
await connectToDevice('target-device-id');
```

### Starting Camera/Screen Share

```typescript
const { startCamera, startScreenShare } = useWebRTC();

// Start camera
const cameraStream = await startCamera();

// Start screen sharing
const screenStream = await startScreenShare();
```

### Sending Remote Control Commands

```typescript
import { useRemoteControl } from './contexts/WebRTCContext';

function RemoteControlComponent() {
  const { moveMouse, clickMouse, pressKey } = useRemoteControl('device-id');
  
  // Move mouse
  moveMouse(100, 200);
  
  // Click mouse
  clickMouse('left', 100, 200);
  
  // Press key
  pressKey('Enter');
}
```

### Monitoring Connection Quality

```typescript
const { getDeviceStats } = useWebRTC();

const stats = await getDeviceStats('device-id');
console.log('Quality:', stats.quality); // excellent, good, fair, poor
console.log('RTT:', stats.roundTripTime);
console.log('Packet Loss:', stats.packetsLost);
console.log('Bandwidth:', stats.bandwidth);
```

## Signaling Server

### Production Setup

For production use, you need to deploy a WebSocket signaling server. The application expects the following message format:

```typescript
interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'device-info';
  from: string;
  to: string;
  data?: any;
  timestamp: number;
}
```

### Message Flow

1. **Join**: Device announces presence to signaling server
2. **Offer**: Initiating peer creates and sends SDP offer
3. **Answer**: Receiving peer responds with SDP answer
4. **ICE Candidates**: Both peers exchange ICE candidates
5. **Connected**: Peer connection established

### Recommended Signaling Server

You can use various signaling server implementations:

1. **Socket.IO** (Node.js)
2. **WebSocket server** (Node.js, Go, Python)
3. **Firebase Realtime Database**
4. **PeerJS Server**
5. **Twilio's Network Traversal Service**

## TURN Server Setup

For production deployments behind strict firewalls/NAT, you'll need your own TURN server:

### Using Coturn (Recommended)

```bash
# Install coturn
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=YOUR_SERVER_IP
external-ip=YOUR_SERVER_IP
relay-ip=YOUR_SERVER_IP
min-port=49152
max-port=65535
fingerprint
lt-cred-mech
user=bixtx_user:bixtx_secure_pass
realm=bixtx.com
cert=/path/to/cert.pem
pkey=/path/to/key.pem

# Start coturn
sudo systemctl start coturn
```

## Security Considerations

### 1. Credential Rotation
- Rotate TURN server credentials regularly
- Use time-limited credentials (e.g., HMAC-based)

### 2. Encryption
- All media streams are encrypted by default (DTLS-SRTP)
- Use TURNS (TLS) for signaling encryption
- Enable E2E encryption for data channels

### 3. Authentication
- Authenticate users before allowing WebRTC connections
- Validate device IDs and permissions
- Implement rate limiting on signaling server

### 4. Monitoring
- Log all connection attempts
- Monitor for unusual connection patterns
- Track bandwidth usage

## Troubleshooting

### Connection Fails

1. **Check STUN/TURN servers** are accessible
2. **Verify firewall rules** allow UDP ports
3. **Check NAT type** - some symmetric NATs require TURN
4. **Review browser console** for WebRTC errors

### Poor Quality

1. **Check network bandwidth** with speed test
2. **Reduce video resolution** or frame rate
3. **Enable adaptive bitrate** streaming
4. **Check packet loss** in connection stats

### No Audio/Video

1. **Verify permissions** for camera/microphone
2. **Check device availability** with `enumerateDevices()`
3. **Test with different codec** configuration
4. **Review browser compatibility**

## Browser Compatibility

bixtx.com WebRTC implementation supports:

- ✅ Chrome 74+
- ✅ Firefox 66+
- ✅ Safari 14.1+
- ✅ Edge 79+
- ✅ Opera 62+
- ⚠️ Mobile browsers (with limitations)

## Performance Optimization

### Bandwidth Optimization
- Use VP9 codec for better compression
- Implement simulcast for multi-party calls
- Adjust bitrate based on network conditions

### Latency Reduction
- Use UDP transport when possible
- Minimize signaling round trips
- Implement ICE trickle for faster connection

### Battery Optimization (Mobile)
- Lower frame rate when in background
- Disable video when not in view
- Use hardware acceleration when available

## Future Enhancements

Planned improvements for WebRTC functionality:

1. **Advanced Features**
   - SFU (Selective Forwarding Unit) for scalability
   - Recording of WebRTC streams
   - Picture-in-picture mode
   - Virtual backgrounds

2. **Quality Improvements**
   - Adaptive bitrate streaming
   - Network quality indicators
   - Automatic codec selection
   - Bandwidth estimation

3. **Security Enhancements**
   - End-to-end encryption for data channels
   - Certificate pinning
   - Intrusion detection

## API Reference

### WebRTC Context Methods

```typescript
interface WebRTCContextType {
  // State
  manager: WebRTCConnectionManager | null;
  isInitialized: boolean;
  activeConnections: string[];
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  connectionStats: Map<string, ConnectionStats>;
  
  // Methods
  initialize(deviceId: string, deviceInfo: DeviceInfo): Promise<void>;
  connectToDevice(deviceId: string): Promise<void>;
  disconnectFromDevice(deviceId: string): void;
  startCamera(): Promise<MediaStream | null>;
  stopCamera(): void;
  startScreenShare(): Promise<MediaStream | null>;
  stopScreenShare(): void;
  sendControlCommand(deviceId: string, command: string, params?: any): boolean;
  getDeviceStats(deviceId: string): Promise<ConnectionStats | null>;
  cleanup(): void;
}
```

### Connection Statistics

```typescript
interface ConnectionStats {
  bytesReceived: number;    // Total bytes received
  bytesSent: number;         // Total bytes sent
  packetsLost: number;       // Number of packets lost
  roundTripTime: number;     // RTT in seconds
  bandwidth: number;         // Total bandwidth usage
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}
```

## Support

For issues or questions about WebRTC configuration:
1. Check browser console for errors
2. Review connection statistics in WebRTC Dashboard
3. Verify STUN/TURN server accessibility
4. Consult WebRTC troubleshooting guide

---

**Last Updated**: November 21, 2025
**Version**: 2.0.0
