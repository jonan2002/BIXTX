# bixtx.com - Integration Guide

## 🔗 How Software A & B Communicate

This guide explains the complete communication protocol between Link Software (A) and App Platform (B).

---

## 📡 Communication Architecture

```
┌──────────────────┐                           ┌──────────────────┐
│   SOFTWARE A     │                           │   SOFTWARE B     │
│   (Link Agent)   │                           │   (App Platform) │
└────────┬─────────┘                           └────────┬─────────┘
         │                                              │
         │  1. WebSocket (Signaling)                   │
         ├──────────────────────────────────────────────┤
         │     - Device registration                    │
         │     - Session management                     │
         │     - Command routing                        │
         │     - Status updates                         │
         │                                              │
         │  2. WebRTC (Media & Data)                   │
         ├──────────────────────────────────────────────┤
         │     - Screen streaming                       │
         │     - Camera/mic audio                       │
         │     - Control commands                       │
         │     - File transfer                          │
         │                                              │
         │  3. REST API (Administrative)               │
         ├──────────────────────────────────────────────┤
         │     - Device info                            │
         │     - Metrics history                        │
         │     - Recordings                             │
         │     - User management                        │
         │                                              │
         └──────────────────┬─────────────────────────┘
                            │
                   ┌────────▼─────────┐
                   │  BACKEND SERVER  │
                   │                  │
                   │  - Signaling     │
                   │  - TURN/STUN     │
                   │  - Database      │
                   │  - File Storage  │
                   └──────────────────┘
```

---

## 1️⃣ Device Registration Flow

### Step-by-Step Process

```
SOFTWARE A                    BACKEND SERVER              SOFTWARE B
(Link Agent)                  (Signaling)                 (App Platform)
─────────────                 ──────────────              ──────────────

1. Install & Launch
   │
   ├─ Generate Device ID
   │  (hardware-based)
   │
   ├─ Generate Key Pair
   │  (RSA-4096)
   │
   ├─ Generate Pairing Code
   │  (6-digit: 123456)
   │
   └─ Display to user
      "Device ID: LAW-A5B9"
      "Pairing Code: 123456"

2. Connect to Server
   │
   ├─ WebSocket Connection ────────►
   │  wss://signal.bixtxai.com
   │
   └─ Send Registration ──────────►
      {
        type: "register",
        deviceId: "LAW-A5B9",
        deviceName: "John's Laptop",
        platform: "windows",
        publicKey: "MIIBIjAN...",
        pairingCode: "123456"
      }
                                    │
                                    ├─ Validate Request
                                    │
                                    ├─ Store in Database
                                    │  Status: "pending"
                                    │
                                    └─ Send Confirmation ─►
                                       {
                                         success: true,
                                         message: "Awaiting approval"
                                       }

3. Wait for Approval
   │
   ├─ Poll Status Every 5s
   │
   [USER ACTION: Admin enters code in Software B]
                                                           │
                                                           ├─ Admin Opens "Add Device"
                                                           │
                                                           ├─ Enters Pairing Code
                                                           │  "123456"
                                                           │
                                                           └─ API Call ──────►
                                                              POST /api/devices/approve
                                                              {
                                                                pairingCode: "123456",
                                                                adminId: "admin123"
                                                              }
                                    │
                                    ├─ Update Database
                                    │  Status: "approved"
                                    │
                                    └─ Notify Device ──────►
                                       {
                                         type: "approved",
                                         sessionToken: "eyJhbG...",
                                         turnServers: [...]
                                       }

4. Activation
   │
   ◄─ Receive Approval
   │
   ├─ Store Session Token
   │
   ├─ Initialize WebRTC
   │
   └─ Begin Monitoring
      Status: "active"
```

---

## 2️⃣ WebSocket Protocol (Signaling)

### Connection Endpoint
```
wss://signal.bixtxai.com/v1/connect
```

### Authentication
```javascript
// After registration, all messages include:
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  // ... message payload
}
```

### Message Types

#### A→Server: Device Status Update
```json
{
  "type": "status_update",
  "sessionToken": "eyJhbG...",
  "deviceId": "LAW-A5B9",
  "status": {
    "online": true,
    "cpuUsage": 45.2,
    "memoryUsage": 62.8,
    "diskUsage": 71.5,
    "activeSession": false,
    "lastSeen": 1732636800000
  },
  "timestamp": 1732636800000
}
```

#### Server→A: Session Request
```json
{
  "type": "session_request",
  "sessionId": "sess_abc123",
  "adminId": "admin_xyz789",
  "adminName": "John Admin",
  "requestedCapabilities": [
    "screen_share",
    "remote_control",
    "file_access"
  ],
  "timestamp": 1732636800000
}
```

#### A→Server: Session Acceptance
```json
{
  "type": "session_accept",
  "sessionId": "sess_abc123",
  "sessionToken": "eyJhbG...",
  "webrtcOffer": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1..."
  },
  "timestamp": 1732636800000
}
```

#### Server→B: Session Established
```json
{
  "type": "session_established",
  "sessionId": "sess_abc123",
  "deviceId": "LAW-A5B9",
  "webrtcAnswer": {
    "type": "answer",
    "sdp": "v=0\r\no=- 987654321 2 IN IP4 192.168.1.5..."
  },
  "timestamp": 1732636800000
}
```

#### ICE Candidate Exchange
```json
// A→Server or B→Server
{
  "type": "ice_candidate",
  "sessionId": "sess_abc123",
  "candidate": {
    "candidate": "candidate:1 1 UDP 2122260223 192.168.1.5 54321 typ host",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  },
  "timestamp": 1732636800000
}
```

#### Metrics Report (A→Server)
```json
{
  "type": "metrics_report",
  "sessionToken": "eyJhbG...",
  "deviceId": "LAW-A5B9",
  "metrics": {
    "cpu": {
      "usage": 45.2,
      "cores": 8,
      "model": "Intel Core i7-9700K"
    },
    "memory": {
      "total": 17179869184,
      "used": 10737418240,
      "available": 6442450944,
      "percentage": 62.5
    },
    "disk": {
      "total": 1000204886016,
      "used": 715891200000,
      "available": 284313686016,
      "percentage": 71.6
    },
    "network": {
      "downloadSpeed": 1024,
      "uploadSpeed": 512,
      "bytesReceived": 1073741824,
      "bytesSent": 536870912
    },
    "processes": {
      "count": 245,
      "topProcesses": [
        { "name": "chrome.exe", "cpu": 15.2, "memory": 2147483648 },
        { "name": "code.exe", "cpu": 8.5, "memory": 1073741824 }
      ]
    }
  },
  "timestamp": 1732636800000
}
```

#### Session Termination
```json
{
  "type": "session_end",
  "sessionId": "sess_abc123",
  "reason": "admin_disconnect", // or "device_disconnect", "timeout", "error"
  "timestamp": 1732636800000
}
```

---

## 3️⃣ WebRTC Protocol (Media & Data)

### Connection Setup

```javascript
// SOFTWARE A (Link Agent)
class WebRTCConnection {
  constructor(sessionId, turnServers) {
    this.sessionId = sessionId;
    this.peerConnection = new RTCPeerConnection({
      iceServers: turnServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    
    this.dataChannel = this.peerConnection.createDataChannel('control', {
      ordered: true,
      maxRetransmits: 3
    });
    
    this.setupEventHandlers();
  }
  
  async addMediaTracks() {
    // Screen capture
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080, frameRate: 30 },
      audio: false
    });
    
    screenStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, screenStream);
    });
    
    // Camera (optional)
    if (this.capabilities.includes('camera')) {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      
      cameraStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, cameraStream);
      });
    }
    
    // Microphone (optional)
    if (this.capabilities.includes('microphone')) {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      micStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, micStream);
      });
    }
  }
}
```

### Data Channel Protocol

#### Command Structure (B→A)
```typescript
interface RemoteCommand {
  id: string;                    // Unique command ID
  type: 'mouse' | 'keyboard' | 'system' | 'file';
  action: string;
  data: any;
  timestamp: number;
  signature: string;             // HMAC-SHA256 signature
}
```

#### Mouse Commands
```json
// Move Mouse
{
  "id": "cmd_12345",
  "type": "mouse",
  "action": "move",
  "data": { "x": 500, "y": 300 },
  "timestamp": 1732636800000,
  "signature": "a1b2c3d4..."
}

// Click Mouse
{
  "id": "cmd_12346",
  "type": "mouse",
  "action": "click",
  "data": { 
    "button": "left",  // "left", "right", "middle"
    "x": 500,
    "y": 300
  },
  "timestamp": 1732636801000,
  "signature": "e5f6g7h8..."
}

// Drag
{
  "id": "cmd_12347",
  "type": "mouse",
  "action": "drag",
  "data": {
    "startX": 100,
    "startY": 200,
    "endX": 300,
    "endY": 400
  },
  "timestamp": 1732636802000,
  "signature": "i9j0k1l2..."
}

// Scroll
{
  "id": "cmd_12348",
  "type": "mouse",
  "action": "scroll",
  "data": {
    "deltaX": 0,
    "deltaY": -100  // Negative = scroll up
  },
  "timestamp": 1732636803000,
  "signature": "m3n4o5p6..."
}
```

#### Keyboard Commands
```json
// Type Text
{
  "id": "cmd_12349",
  "type": "keyboard",
  "action": "type",
  "data": {
    "text": "Hello World"
  },
  "timestamp": 1732636804000,
  "signature": "q7r8s9t0..."
}

// Key Press
{
  "id": "cmd_12350",
  "type": "keyboard",
  "action": "press",
  "data": {
    "key": "enter",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    }
  },
  "timestamp": 1732636805000,
  "signature": "u1v2w3x4..."
}

// Hotkey
{
  "id": "cmd_12351",
  "type": "keyboard",
  "action": "hotkey",
  "data": {
    "keys": ["ctrl", "c"]  // Copy
  },
  "timestamp": 1732636806000,
  "signature": "y5z6a7b8..."
}
```

#### System Commands
```json
// Take Screenshot
{
  "id": "cmd_12352",
  "type": "system",
  "action": "screenshot",
  "data": {
    "quality": 90,
    "format": "png"
  },
  "timestamp": 1732636807000,
  "signature": "c9d0e1f2..."
}

// Get Process List
{
  "id": "cmd_12353",
  "type": "system",
  "action": "list_processes",
  "data": {},
  "timestamp": 1732636808000,
  "signature": "g3h4i5j6..."
}

// Kill Process
{
  "id": "cmd_12354",
  "type": "system",
  "action": "kill_process",
  "data": {
    "pid": 12345
  },
  "timestamp": 1732636809000,
  "signature": "k7l8m9n0..."
}

// Execute Command
{
  "id": "cmd_12355",
  "type": "system",
  "action": "execute",
  "data": {
    "command": "ipconfig",
    "args": ["/all"],
    "shell": true
  },
  "timestamp": 1732636810000,
  "signature": "o1p2q3r4..."
}
```

#### File Commands
```json
// List Directory
{
  "id": "cmd_12356",
  "type": "file",
  "action": "list",
  "data": {
    "path": "C:\\Users\\John\\Documents"
  },
  "timestamp": 1732636811000,
  "signature": "s5t6u7v8..."
}

// Read File
{
  "id": "cmd_12357",
  "type": "file",
  "action": "read",
  "data": {
    "path": "C:\\Users\\John\\Documents\\file.txt"
  },
  "timestamp": 1732636812000,
  "signature": "w9x0y1z2..."
}

// Write File
{
  "id": "cmd_12358",
  "type": "file",
  "action": "write",
  "data": {
    "path": "C:\\Users\\John\\Documents\\new.txt",
    "content": "base64encodedcontent...",
    "encoding": "base64"
  },
  "timestamp": 1732636813000,
  "signature": "a3b4c5d6..."
}

// Delete File
{
  "id": "cmd_12359",
  "type": "file",
  "action": "delete",
  "data": {
    "path": "C:\\Users\\John\\Documents\\old.txt"
  },
  "timestamp": 1732636814000,
  "signature": "e7f8g9h0..."
}

// Upload File (Chunked)
{
  "id": "cmd_12360",
  "type": "file",
  "action": "upload",
  "data": {
    "fileId": "upload_abc123",
    "chunk": 0,
    "totalChunks": 10,
    "data": "base64chunk...",
    "destination": "C:\\Users\\John\\Downloads\\uploaded.zip"
  },
  "timestamp": 1732636815000,
  "signature": "i1j2k3l4..."
}

// Download File (Request)
{
  "id": "cmd_12361",
  "type": "file",
  "action": "download",
  "data": {
    "path": "C:\\Users\\John\\Documents\\report.pdf",
    "fileId": "download_xyz789"
  },
  "timestamp": 1732636816000,
  "signature": "m5n6o7p8..."
}
```

#### Command Response (A→B)
```json
{
  "commandId": "cmd_12345",
  "success": true,
  "data": {
    // Response data specific to command
  },
  "error": null,
  "executionTime": 45,  // milliseconds
  "timestamp": 1732636817000
}

// Error Response
{
  "commandId": "cmd_12346",
  "success": false,
  "data": null,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "File system write access not permitted"
  },
  "executionTime": 5,
  "timestamp": 1732636818000
}
```

---

## 4️⃣ REST API (Administrative)

### Base URL
```
https://api.bixtxai.com/v1
```

### Authentication
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Endpoints

#### Device Management

##### GET /devices
List all devices
```http
GET /devices?status=active&limit=50&offset=0
```

Response:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "LAW-A5B9",
        "deviceName": "John's Laptop",
        "platform": "windows",
        "osVersion": "Windows 11 Pro",
        "status": "online",
        "lastSeen": 1732636800000,
        "registeredAt": 1732550400000,
        "approvedBy": "admin_xyz789",
        "ipAddress": "192.168.1.105",
        "currentSession": null
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

##### GET /devices/:deviceId
Get device details
```http
GET /devices/LAW-A5B9
```

Response:
```json
{
  "success": true,
  "data": {
    "deviceId": "LAW-A5B9",
    "deviceName": "John's Laptop",
    "platform": "windows",
    "osVersion": "Windows 11 Pro",
    "appVersion": "1.0.0",
    "status": "online",
    "lastSeen": 1732636800000,
    "registeredAt": 1732550400000,
    "approvedBy": "admin_xyz789",
    "ipAddress": "192.168.1.105",
    "publicKey": "MIIBIjAN...",
    "capabilities": [
      "screen_share",
      "camera_access",
      "microphone_access",
      "file_access",
      "remote_control"
    ],
    "currentSession": {
      "sessionId": "sess_abc123",
      "adminId": "admin_xyz789",
      "startedAt": 1732636700000,
      "duration": 100000
    },
    "systemInfo": {
      "cpu": "Intel Core i7-9700K",
      "memory": "16 GB",
      "disk": "1 TB SSD",
      "networkSpeed": "1 Gbps"
    }
  }
}
```

##### POST /devices/approve
Approve pending device
```http
POST /devices/approve
Content-Type: application/json

{
  "pairingCode": "123456",
  "deviceName": "John's Laptop",
  "permissions": {
    "screenCapture": true,
    "cameraAccess": true,
    "microphoneAccess": true,
    "fileSystemRead": true,
    "fileSystemWrite": false,
    "remoteControl": true
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "deviceId": "LAW-A5B9",
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Device approved successfully"
  }
}
```

##### DELETE /devices/:deviceId
Revoke device access
```http
DELETE /devices/LAW-A5B9
```

Response:
```json
{
  "success": true,
  "message": "Device access revoked"
}
```

#### Session Management

##### POST /sessions/start
Start remote session
```http
POST /sessions/start
Content-Type: application/json

{
  "deviceId": "LAW-A5B9",
  "capabilities": [
    "screen_share",
    "remote_control"
  ],
  "recordSession": true
}
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123",
    "webrtcOffer": {
      "type": "offer",
      "sdp": "v=0\r\no=- 123456789..."
    },
    "turnServers": [
      {
        "urls": "turn:turn.bixtxai.com:3478",
        "username": "user_abc",
        "credential": "pass_xyz"
      }
    ]
  }
}
```

##### POST /sessions/:sessionId/end
End remote session
```http
POST /sessions/sess_abc123/end
```

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_abc123",
    "duration": 125000,
    "recordingUrl": "https://storage.bixtxai.com/recordings/sess_abc123.webm"
  }
}
```

##### GET /sessions
List sessions
```http
GET /sessions?deviceId=LAW-A5B9&status=active&limit=20
```

Response:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "sess_abc123",
        "deviceId": "LAW-A5B9",
        "adminId": "admin_xyz789",
        "status": "active",
        "startedAt": 1732636700000,
        "duration": 100000,
        "recordingEnabled": true
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

#### Metrics & Analytics

##### GET /metrics/device/:deviceId
Get device metrics history
```http
GET /metrics/device/LAW-A5B9?from=1732550400000&to=1732636800000&interval=3600000
```

Response:
```json
{
  "success": true,
  "data": {
    "deviceId": "LAW-A5B9",
    "timeRange": {
      "from": 1732550400000,
      "to": 1732636800000
    },
    "interval": 3600000,
    "metrics": [
      {
        "timestamp": 1732550400000,
        "cpu": 45.2,
        "memory": 62.5,
        "disk": 71.6,
        "networkDown": 1024,
        "networkUp": 512
      }
      // ... more data points
    ]
  }
}
```

#### Recordings

##### GET /recordings
List recordings
```http
GET /recordings?deviceId=LAW-A5B9&limit=20&offset=0
```

Response:
```json
{
  "success": true,
  "data": {
    "recordings": [
      {
        "recordingId": "rec_abc123",
        "sessionId": "sess_abc123",
        "deviceId": "LAW-A5B9",
        "adminId": "admin_xyz789",
        "startedAt": 1732636700000,
        "duration": 125000,
        "fileSize": 52428800,
        "url": "https://storage.bixtxai.com/recordings/rec_abc123.webm",
        "thumbnail": "https://storage.bixtxai.com/thumbnails/rec_abc123.jpg"
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

##### DELETE /recordings/:recordingId
Delete recording
```http
DELETE /recordings/rec_abc123
```

Response:
```json
{
  "success": true,
  "message": "Recording deleted successfully"
}
```

#### User Management

##### GET /users
List users
```http
GET /users?role=admin&limit=50&offset=0
```

Response:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "admin_xyz789",
        "email": "admin@company.com",
        "name": "John Admin",
        "role": "admin",
        "permissions": {
          "viewDevices": true,
          "controlDevices": true,
          "manageUsers": true,
          "viewRecordings": true,
          "deleteRecordings": true
        },
        "createdAt": 1732464000000,
        "lastLogin": 1732636800000
      }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 5️⃣ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DEVICE_OFFLINE` | 503 | Device is offline |
| `SESSION_EXPIRED` | 410 | Session has expired |
| `DEVICE_BUSY` | 409 | Device already in a session |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server internal error |
| `PERMISSION_DENIED` | 403 | Device permission not granted |
| `COMMAND_FAILED` | 422 | Command execution failed |
| `CONNECTION_FAILED` | 503 | WebRTC connection failed |

---

## 6️⃣ Security Considerations

### Message Signing
All commands sent from Software B to Software A must be signed:

```javascript
// Software B - Signing command
const command = {
  id: generateUUID(),
  type: 'mouse',
  action: 'click',
  data: { x: 100, y: 200 },
  timestamp: Date.now()
};

const signature = hmacSHA256(
  JSON.stringify(command),
  sessionKey
);

command.signature = signature;

// Send via data channel
dataChannel.send(JSON.stringify(command));
```

```javascript
// Software A - Verifying command
dataChannel.onmessage = (event) => {
  const command = JSON.parse(event.data);
  
  // Extract signature
  const { signature, ...commandData } = command;
  
  // Verify signature
  const expectedSignature = hmacSHA256(
    JSON.stringify(commandData),
    sessionKey
  );
  
  if (signature !== expectedSignature) {
    console.error('Invalid command signature');
    return;
  }
  
  // Execute command
  executeCommand(command);
};
```

### End-to-End Encryption
All media streams are encrypted using DTLS-SRTP (built into WebRTC).

Data channel messages use additional AES-256-GCM encryption:

```javascript
// Encrypt sensitive data
async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data)
  );
  
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };
}

// Decrypt data
async function decryptData(encrypted, key) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encrypted.iv) },
    key,
    new Uint8Array(encrypted.data)
  );
  
  return new TextDecoder().decode(decrypted);
}
```

---

## 7️⃣ Performance Optimization

### Adaptive Bitrate
```javascript
// Adjust video quality based on network conditions
class AdaptiveBitrate {
  adjustQuality(rtt, packetLoss) {
    if (rtt > 200 || packetLoss > 5) {
      // Poor connection - reduce quality
      return {
        width: 1280,
        height: 720,
        frameRate: 15,
        bitrate: 500000
      };
    } else if (rtt < 50 && packetLoss < 1) {
      // Excellent connection - max quality
      return {
        width: 1920,
        height: 1080,
        frameRate: 30,
        bitrate: 2000000
      };
    } else {
      // Normal connection - medium quality
      return {
        width: 1920,
        height: 1080,
        frameRate: 24,
        bitrate: 1000000
      };
    }
  }
}
```

### Command Batching
```javascript
// Batch multiple mouse movements into single command
class CommandBatcher {
  constructor() {
    this.queue = [];
    this.interval = setInterval(() => this.flush(), 16); // 60 FPS
  }
  
  addMouseMove(x, y) {
    this.queue.push({ type: 'mouse', action: 'move', data: { x, y } });
  }
  
  flush() {
    if (this.queue.length === 0) return;
    
    // Only send the last mouse position
    if (this.queue.every(cmd => cmd.action === 'move')) {
      const lastMove = this.queue[this.queue.length - 1];
      this.send(lastMove);
    } else {
      // Send all other commands
      this.queue.forEach(cmd => this.send(cmd));
    }
    
    this.queue = [];
  }
}
```

---

## 8️⃣ Testing Integration

### Integration Test Checklist

- [ ] Device registration flow
- [ ] WebSocket connection establishment
- [ ] WebRTC peer connection
- [ ] Screen streaming quality
- [ ] Command execution latency
- [ ] File transfer reliability
- [ ] Session management
- [ ] Error handling
- [ ] Reconnection logic
- [ ] Multi-session support
- [ ] Security (encryption, signing)
- [ ] Performance under load

### Sample Integration Test

```javascript
describe('Device Registration Flow', () => {
  it('should register device and establish connection', async () => {
    // 1. Software A connects to signaling server
    const linkAgent = new LinkAgent();
    await linkAgent.connect('wss://signal.bixtxai.com');
    
    // 2. Generate pairing code
    const pairingCode = linkAgent.generatePairingCode();
    expect(pairingCode).toMatch(/^\d{6}$/);
    
    // 3. Software B approves device
    const appPlatform = new AppPlatform();
    await appPlatform.login('admin@test.com', 'password');
    const approval = await appPlatform.approveDevice(pairingCode);
    expect(approval.success).toBe(true);
    
    // 4. Wait for Software A to receive approval
    await linkAgent.waitForApproval();
    expect(linkAgent.status).toBe('approved');
    
    // 5. Establish WebRTC connection
    const session = await appPlatform.startSession(approval.deviceId);
    expect(session.connected).toBe(true);
    
    // 6. Verify media streams
    expect(session.screenStream).toBeDefined();
    expect(session.screenStream.active).toBe(true);
  });
});
```

---

## 📚 Summary

This integration guide covers:

✅ Complete communication architecture  
✅ Device registration flow  
✅ WebSocket signaling protocol  
✅ WebRTC media and data channels  
✅ REST API specifications  
✅ Command structures and responses  
✅ Security implementation  
✅ Performance optimization  
✅ Testing guidelines  

**Next Steps:**
1. Implement backend signaling server
2. Build Software A with WebRTC client
3. Integrate with Software B
4. Test end-to-end flows
5. Security audit
6. Performance testing

---

**Document Version**: 1.0  
**Last Updated**: November 26, 2025  
**Status**: Specification Complete
