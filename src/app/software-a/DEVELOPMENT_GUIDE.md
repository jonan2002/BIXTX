# bixtx Link Software - Development Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Architecture](#project-architecture)
3. [Core Components](#core-components)
4. [Service Layer](#service-layer)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Debugging](#debugging)
8. [Building & Packaging](#building--packaging)
9. [Contributing](#contributing)

## Development Environment Setup

### Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v8.x or higher
- **Git**: Latest version
- **C++ Build Tools**: Required for native modules
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential package

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/bixtx/software-a.git
cd software-a
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**
```bash
npm run dev
```

### IDE Setup

#### Visual Studio Code (Recommended)

**Recommended Extensions**:
- ESLint
- Prettier
- TypeScript Vue Plugin
- Electron Debug

**Workspace Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Project Architecture

### Directory Structure

```
software-a/
├── src/
│   ├── main.ts                     # Application entry point
│   ├── core/                       # Core system modules
│   │   ├── DeviceManager.ts        # Device info & metrics
│   │   ├── ConnectionManager.ts    # WebSocket communication
│   │   ├── SecurityManager.ts      # Encryption & security
│   │   └── ConfigManager.ts        # Configuration management
│   ├── services/                   # Feature services
│   │   ├── MonitoringService.ts    # Main monitoring coordinator
│   │   ├── ScreenCaptureService.ts # Screen streaming
│   │   ├── CameraService.ts        # Webcam access
│   │   ├── MicrophoneService.ts    # Audio recording
│   │   ├── FileSystemService.ts    # File operations
│   │   └── RemoteControlService.ts # Remote input control
│   └── utils/                      # Utility modules
│       └── Logger.ts               # Logging system
├── pages/                          # HTML pages
│   ├── registration.html           # Device registration UI
│   ├── settings.html              # Settings interface
│   └── logs.html                  # Log viewer
├── assets/                         # Static assets
│   └── icons/                     # Application icons
├── scripts/                        # Build & dev scripts
├── dist/                          # Compiled JavaScript (generated)
└── out/                           # Built applications (generated)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Main Process                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              bixtx.comLinkApp                        │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│      ┌───────────────────┼───────────────────┐        │
│      │                   │                   │        │
│  ┌───▼────┐      ┌───────▼──────┐    ┌──────▼────┐  │
│  │ Device │      │ Connection    │    │ Security  │  │
│  │Manager │      │ Manager       │    │ Manager   │  │
│  └───┬────┘      └───────┬───────┘    └──────┬────┘  │
│      │                   │                    │        │
│      │     ┌─────────────▼──────────────┐    │        │
│      │     │   MonitoringService        │    │        │
│      │     └─────────────┬──────────────┘    │        │
│      │                   │                    │        │
│      │     ┌─────────────┴──────────────┐    │        │
│      └─────►  Screen │ Camera │ Mic    │◄────┘        │
│            │  Remote │ FileSystem       │              │
│            └──────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### DeviceManager

**Responsibility**: Collect and manage device information and system metrics.

**Key Methods**:
- `initialize()`: Initialize the device manager
- `collectDeviceInfo()`: Gather complete device information
- `getSystemMetrics()`: Get real-time system metrics
- `register(code)`: Register device with code
- `unregister()`: Unregister device

**Example Usage**:
```typescript
const deviceManager = new DeviceManager(configManager);
await deviceManager.initialize();

const info = await deviceManager.collectDeviceInfo();
const metrics = await deviceManager.getSystemMetrics();
```

### ConnectionManager

**Responsibility**: Manage WebSocket connection to the server.

**Key Methods**:
- `initialize()`: Initialize connection manager
- `connect()`: Connect to server
- `disconnect()`: Disconnect from server
- `sendMessage(message, encrypt)`: Send message to server
- `isConnected()`: Check connection status

**Events**:
- `connected`: WebSocket connected
- `disconnected`: WebSocket disconnected
- `authenticated`: Authentication successful
- `message`: Message received
- `command`: Command received
- `error`: Error occurred

**Example Usage**:
```typescript
const connectionManager = new ConnectionManager(configManager, securityManager);
await connectionManager.initialize();

connectionManager.on('connected', () => {
  console.log('Connected to server');
});

connectionManager.on('command', async (data) => {
  // Handle command
});

await connectionManager.connect();
```

### SecurityManager

**Responsibility**: Handle encryption, decryption, and security operations.

**Key Methods**:
- `initialize()`: Initialize security manager
- `encrypt(data)`: Encrypt data
- `decrypt(data)`: Decrypt data
- `encryptBuffer(buffer)`: Encrypt binary data
- `decryptBuffer(buffer)`: Decrypt binary data
- `generateRegistrationCode()`: Generate registration code

**Example Usage**:
```typescript
const securityManager = new SecurityManager(configManager);
await securityManager.initialize();

const encrypted = securityManager.encrypt(sensitiveData);
const decrypted = securityManager.decrypt(encrypted);
```

### ConfigManager

**Responsibility**: Manage application configuration and settings.

**Key Methods**:
- `getConfig()`: Get full configuration
- `updateConfig(updates)`: Update configuration
- `getDeviceId()`: Get device ID
- `isDeviceRegistered()`: Check if device is registered
- `getSettings()`: Get user settings
- `updateSettings(settings)`: Update settings

**Example Usage**:
```typescript
const configManager = new ConfigManager();
const deviceId = configManager.getDeviceId();
const settings = configManager.getSettings();
```

## Service Layer

### MonitoringService

**Responsibility**: Coordinate all monitoring services and handle commands.

**Key Features**:
- Command routing and execution
- Service lifecycle management
- Automatic metrics collection
- Event coordination

### ScreenCaptureService

**Responsibility**: Capture and stream screen content.

**Features**:
- Screenshot capture
- WebRTC-based streaming
- Adjustable quality and frame rate
- Encryption support

### RemoteControlService

**Responsibility**: Handle remote keyboard and mouse input.

**Features**:
- Mouse movement and clicks
- Keyboard input
- Modifier key support
- Input validation

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ...

# Test locally
npm run dev

# Commit changes
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
```

### 2. Code Style

**TypeScript Guidelines**:
- Use TypeScript strict mode
- Define interfaces for all data structures
- Use async/await for asynchronous operations
- Handle errors appropriately
- Add JSDoc comments for public APIs

**Example**:
```typescript
/**
 * Capture and send a screen frame to the server
 * @param quality JPEG quality (1-100)
 * @throws {Error} If capture fails
 */
private async captureAndSend(quality: number): Promise<void> {
  try {
    const imgBuffer = await screenshot({ format: 'png' });
    const base64Image = imgBuffer.toString('base64');
    
    await this.connectionManager.sendMessage({
      type: 'screen_frame',
      data: {
        image: base64Image,
        timestamp: new Date().toISOString(),
        format: 'png',
      },
    }, true);
  } catch (error) {
    this.logger.error('Failed to capture screen:', error);
    throw error;
  }
}
```

### 3. Adding New Commands

1. **Define command interface** in `MonitoringService.ts`:
```typescript
case 'my_new_command':
  result = await this.myNewCommandHandler(params);
  break;
```

2. **Implement handler**:
```typescript
private async myNewCommandHandler(params: any): Promise<any> {
  // Implementation
  return result;
}
```

3. **Document in API documentation**

### 4. Adding New Services

1. **Create service file** in `src/services/`:
```typescript
import { ConnectionManager } from '../core/ConnectionManager';
import { Logger } from '../utils/Logger';

export class MyNewService {
  private logger: Logger;
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.logger = new Logger('MyNewService');
    this.connectionManager = connectionManager;
  }

  async initialize(): Promise<void> {
    this.logger.info('MyNewService initialized');
  }

  async start(): Promise<void> {
    // Implementation
  }

  async stop(): Promise<void> {
    // Implementation
  }
}
```

2. **Register in MonitoringService**:
```typescript
this.myNewService = new MyNewService(connectionManager);
await this.myNewService.initialize();
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Testing

1. Start in development mode:
```bash
npm run dev
```

2. Test specific features:
   - Device registration
   - Connection to server
   - Screen capture
   - Remote control
   - File operations

3. Check logs for errors:
   - Location varies by OS (see README.md)

## Debugging

### Electron DevTools

Enable DevTools in development:
```typescript
// In main.ts
if (process.env.NODE_ENV === 'development') {
  mainWindow.webContents.openDevTools();
}
```

### Logging

Use the built-in Logger:
```typescript
this.logger.debug('Debug message', { data });
this.logger.info('Info message');
this.logger.warn('Warning message');
this.logger.error('Error message', error);
```

### Remote Debugging

```bash
# Start with remote debugging
npm run dev -- --remote-debugging-port=9222
```

Then open Chrome and navigate to `chrome://inspect`

## Building & Packaging

### Development Build

```bash
npm run dev
```

### Production Build

```bash
# Compile TypeScript
npm run build

# Package application
npm run package

# Create distributables
npm run make
```

### Platform-Specific Builds

```bash
# Windows
npm run make -- --platform=win32

# macOS
npm run make -- --platform=darwin

# Linux
npm run make -- --platform=linux
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Ensure all tests pass
6. Update documentation
7. Submit pull request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] No console.log statements (use Logger)
- [ ] Error handling implemented
- [ ] Security considerations addressed
- [ ] Performance implications considered

## Common Issues

### Build Failures

**Issue**: Native module compilation fails

**Solution**:
```bash
# Rebuild native modules
npm rebuild

# Or install specific module
npm rebuild robotjs
```

### Connection Issues

**Issue**: Cannot connect to server

**Solution**:
1. Check `.env` file for correct server URL
2. Verify network connectivity
3. Check firewall settings
4. Review logs for detailed errors

### Permission Issues

**Issue**: Screen capture not working

**Solution**:
- macOS: Grant Screen Recording permission in System Preferences
- Windows: Run as administrator (if needed)
- Linux: Check user is in video group

---

**Last Updated**: November 2024  
**Maintainers**: bixtx.com Development Team
