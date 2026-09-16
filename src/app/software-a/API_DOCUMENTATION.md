# bixtx Link Software - API Documentation

## Overview

This document describes the internal APIs and communication protocols used by the bixtx Link Software (Software A).

## Table of Contents

1. [WebSocket Protocol](#websocket-protocol)
2. [Message Format](#message-format)
3. [Authentication](#authentication)
4. [Device Information](#device-information)
5. [System Metrics](#system-metrics)
6. [Remote Control](#remote-control)
7. [Screen Capture](#screen-capture)
8. [File Operations](#file-operations)
9. [Command Protocol](#command-protocol)
10. [WebRTC Signaling](#webrtc-signaling)

## WebSocket Protocol

### Connection

**Endpoint**: `wss://api.bixtx.com/ws`

**Connection Headers**:
```
X-Device-Id: <device_id>
X-Registration-Code: <registration_code>
```

### Connection Flow

```
1. Client connects to WebSocket server
2. Server acknowledges connection
3. Client sends auth message
4. Server validates and responds with auth_success/auth_failed
5. Client begins sending device_info and system_metrics
6. Server can send commands at any time
```

## Message Format

All messages follow this JSON structure:

```typescript
interface Message {
  type: string;              // Message type
  data: any;                 // Message payload
  timestamp: string;         // ISO 8601 timestamp
  messageId: string;         // Unique message identifier
  encrypted?: boolean;       // Whether data is encrypted
}
```

### Example

```json
{
  "type": "device_info",
  "data": {
    "deviceId": "LWX-ABC123DEF456",
    "deviceName": "John's Laptop",
    "platform": "win32",
    "osVersion": "Windows 10 Pro 21H2"
  },
  "timestamp": "2024-11-27T10:30:00.000Z",
  "messageId": "1701086400000-a1b2c3d4e"
}
```

## Authentication

### Client → Server: auth

Authenticate the device with the server.

```typescript
{
  type: "auth",
  data: {
    deviceId: string;
    registrationCode: string;
    timestamp: string;
  }
}
```

**Example**:
```json
{
  "type": "auth",
  "data": {
    "deviceId": "LWX-ABC123DEF456",
    "registrationCode": "XYZABC",
    "timestamp": "2024-11-27T10:30:00.000Z"
  }
}
```

### Server → Client: auth_success

Authentication successful.

```typescript
{
  type: "auth_success",
  data: {
    message: string;
    sessionId: string;
  }
}
```

### Server → Client: auth_failed

Authentication failed.

```typescript
{
  type: "auth_failed",
  data: {
    reason: string;
  }
}
```

## Device Information

### Client → Server: device_info

Send complete device information.

```typescript
{
  type: "device_info",
  data: {
    deviceId: string;
    hardwareId: string;
    deviceName: string;
    platform: string;
    osVersion: string;
    architecture: string;
    hostname: string;
    cpu: {
      manufacturer: string;
      brand: string;
      cores: number;
      speed: number;
    };
    memory: {
      total: number;
      available: number;
    };
    disk: {
      total: number;
      available: number;
    };
    network: {
      interfaces: Array<{
        name: string;
        mac: string;
        ip4: string;
        ip6: string;
      }>;
    };
    graphics: Array<{
      model: string;
      vram: number;
    }>;
    lastSeen: string;
  }
}
```

## System Metrics

### Client → Server: system_metrics

Send real-time system metrics (sent every 10 seconds).

```typescript
{
  type: "system_metrics",
  data: {
    cpu: {
      usage: number;              // Overall CPU usage %
      cores: number[];            // Per-core usage %
    };
    memory: {
      total: number;              // Bytes
      used: number;               // Bytes
      available: number;          // Bytes
      usagePercent: number;       // %
    };
    disk: Array<{
      device: string;
      mount: string;
      total: number;              // Bytes
      used: number;               // Bytes
      available: number;          // Bytes
      usagePercent: number;       // %
    }>;
    network: Array<{
      interface: string;
      rx: number;                 // Bytes/sec
      tx: number;                 // Bytes/sec
    }>;
    processes: {
      total: number;
      running: number;
      sleeping: number;
      blocked: number;
    };
    timestamp: string;
  }
}
```

## Remote Control

### Server → Client: mouse_event

Control mouse input.

```typescript
{
  type: "mouse_event",
  data: {
    type: "move" | "click" | "scroll";
    x?: number;                   // For move
    y?: number;                   // For move
    button?: "left" | "right" | "middle";  // For click
    scrollAmount?: number;        // For scroll (positive = up, negative = down)
  }
}
```

**Examples**:

```json
// Mouse move
{
  "type": "mouse_event",
  "data": {
    "type": "move",
    "x": 500,
    "y": 300
  }
}

// Mouse click
{
  "type": "mouse_event",
  "data": {
    "type": "click",
    "button": "left"
  }
}

// Mouse scroll
{
  "type": "mouse_event",
  "data": {
    "type": "scroll",
    "scrollAmount": -5
  }
}
```

### Server → Client: keyboard_event

Control keyboard input.

```typescript
{
  type: "keyboard_event",
  "data": {
    type: "keypress" | "keydown" | "keyup";
    key: string;                  // Key name (e.g., "a", "enter", "space")
    modifiers?: string[];         // ["control", "shift", "alt", "command"]
  }
}
```

**Examples**:

```json
// Single key press
{
  "type": "keyboard_event",
  "data": {
    "type": "keypress",
    "key": "a"
  }
}

// Ctrl+C
{
  "type": "keyboard_event",
  "data": {
    "type": "keypress",
    "key": "c",
    "modifiers": ["control"]
  }
}

// Key down
{
  "type": "keyboard_event",
  "data": {
    "type": "keydown",
    "key": "shift"
  }
}
```

## Screen Capture

### Server → Client: start_screen_capture

Request to start screen capture.

```typescript
{
  type: "command",
  data: {
    command: "start_screen_capture",
    params: {
      interval?: number;          // Capture interval in ms (default: 1000)
      quality?: number;           // JPEG quality 1-100 (default: 70)
    }
  }
}
```

### Client → Server: screen_frame

Send captured screen frame (encrypted).

```typescript
{
  type: "screen_frame",
  data: {
    image: string;                // Base64 encoded image
    timestamp: string;
    format: "png" | "jpeg";
  },
  encrypted: true
}
```

### Server → Client: stop_screen_capture

Request to stop screen capture.

```typescript
{
  type: "command",
  data: {
    command: "stop_screen_capture",
    params: {}
  }
}
```

## File Operations

### List Files

**Server → Client**:
```typescript
{
  type: "command",
  data: {
    command: "list_files",
    params: {
      path: string;               // Directory path
    }
  }
}
```

**Client → Server** (Response):
```typescript
{
  type: "command_result",
  data: {
    command: "list_files",
    success: true,
    result: Array<{
      name: string;
      path: string;
      type: "file" | "directory";
      size: number;
      modified: string;
      created: string;
      permissions: string;
    }>
  }
}
```

### Read File

**Server → Client**:
```typescript
{
  type: "command",
  data: {
    command: "read_file",
    params: {
      path: string;               // File path
    }
  }
}
```

**Client → Server** (Response):
```typescript
{
  type: "command_result",
  data: {
    command: "read_file",
    success: true,
    result: {
      path: string;
      name: string;
      size: number;
      content: string;            // Base64 encoded
      encoding: "base64";
    }
  }
}
```

### Write File

**Server → Client**:
```typescript
{
  type: "command",
  data: {
    command: "write_file",
    params: {
      path: string;               // File path
      content: string;            // Base64 encoded
    }
  }
}
```

### Delete File

**Server → Client**:
```typescript
{
  type: "command",
  data: {
    command: "delete_file",
    params: {
      path: string;               // File path
    }
  }
}
```

## Command Protocol

### Server → Client: command

Execute a command on the device.

```typescript
{
  type: "command",
  data: {
    command: string;              // Command name
    params: any;                  // Command parameters
  }
}
```

### Client → Server: command_result

Return command execution result.

```typescript
{
  type: "command_result",
  data: {
    command: string;              // Command that was executed
    success: boolean;             // Whether command succeeded
    result?: any;                 // Result data (if success)
    error?: string;               // Error message (if failed)
  }
}
```

### Available Commands

| Command | Description | Parameters |
|---------|-------------|------------|
| `get_device_info` | Get device information | `{}` |
| `get_system_metrics` | Get current system metrics | `{}` |
| `start_screen_capture` | Start screen capture | `{ interval?, quality? }` |
| `stop_screen_capture` | Stop screen capture | `{}` |
| `start_camera` | Start camera | `{ deviceId? }` |
| `stop_camera` | Stop camera | `{}` |
| `start_microphone` | Start microphone | `{ deviceId? }` |
| `stop_microphone` | Stop microphone | `{}` |
| `list_files` | List files in directory | `{ path }` |
| `read_file` | Read file content | `{ path }` |
| `write_file` | Write file content | `{ path, content }` |
| `delete_file` | Delete file | `{ path }` |
| `start_remote_control` | Start remote control | `{}` |
| `stop_remote_control` | Stop remote control | `{}` |

## WebRTC Signaling

### Server → Client: webrtc_offer

WebRTC offer for peer connection.

```typescript
{
  type: "webrtc_offer",
  data: {
    sdp: string;                  // Session Description Protocol
    type: "offer";
  }
}
```

### Client → Server: webrtc_answer

WebRTC answer in response to offer.

```typescript
{
  type: "webrtc_answer",
  data: {
    sdp: string;
    type: "answer";
  }
}
```

### Bi-directional: webrtc_ice_candidate

ICE candidate for peer connection.

```typescript
{
  type: "webrtc_ice_candidate",
  data: {
    candidate: string;
    sdpMLineIndex: number;
    sdpMid: string;
  }
}
```

## Encryption

### Encrypted Messages

When `encrypted: true`, the `data` field contains an encrypted string:

```typescript
{
  type: "screen_frame",
  data: "U2FsdGVkX1+...",         // AES-256-GCM encrypted
  encrypted: true,
  timestamp: "2024-11-27T10:30:00.000Z",
  messageId: "1701086400000-a1b2c3d4e"
}
```

### Encryption Algorithm

- **Algorithm**: AES-256-GCM
- **Key**: 256-bit randomly generated key
- **IV**: 128-bit random initialization vector (included in encrypted data)
- **Auth Tag**: 128-bit authentication tag (included in encrypted data)

### Encrypted Data Format

```
[16 bytes IV] + [16 bytes Auth Tag] + [Encrypted Data]
```

## Error Handling

### Error Response Format

```typescript
{
  type: "command_result",
  data: {
    command: string;
    success: false,
    error: string;
  }
}
```

### Common Error Codes

- `AUTH_FAILED` - Authentication failed
- `INVALID_COMMAND` - Unknown command
- `PERMISSION_DENIED` - Operation not permitted
- `FILE_NOT_FOUND` - File does not exist
- `CONNECTION_LOST` - Lost connection to server
- `ENCRYPTION_ERROR` - Encryption/decryption failed

## Rate Limiting

- **System Metrics**: Maximum 1 per 10 seconds
- **Screen Frames**: Maximum 30 per second
- **Commands**: Maximum 100 per minute
- **File Operations**: Maximum 10 concurrent operations

## Best Practices

1. **Always encrypt sensitive data** (screen captures, camera, microphone, files)
2. **Handle connection loss gracefully** with automatic reconnection
3. **Validate all input data** before processing
4. **Implement proper error handling** for all operations
5. **Use message IDs** for tracking and deduplication
6. **Throttle high-frequency messages** to prevent server overload
7. **Clean up resources** when operations are cancelled or fail

## Code Examples

### Sending a Message

```typescript
await connectionManager.sendMessage({
  type: 'device_info',
  data: deviceInfo,
}, false); // Not encrypted
```

### Sending Encrypted Message

```typescript
await connectionManager.sendMessage({
  type: 'screen_frame',
  data: {
    image: base64Image,
    timestamp: new Date().toISOString(),
    format: 'png',
  },
}, true); // Encrypted
```

### Handling Commands

```typescript
connectionManager.on('command', async (data: any) => {
  const { command, params } = data;
  
  try {
    let result: any;
    
    switch (command) {
      case 'get_device_info':
        result = await deviceManager.updateDeviceInfo();
        break;
      
      case 'start_screen_capture':
        result = await screenCaptureService.startCapture(params);
        break;
      
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    
    // Send success result
    await connectionManager.sendMessage({
      type: 'command_result',
      data: {
        command,
        success: true,
        result,
      },
    });
  } catch (error) {
    // Send error result
    await connectionManager.sendMessage({
      type: 'command_result',
      data: {
        command,
        success: false,
        error: error.message,
      },
    });
  }
});
```

---

**API Version**: 1.0.0  
**Last Updated**: November 2024
