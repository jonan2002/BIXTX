# bixtx.com - Link Software (Software A)

The lightweight monitoring agent for the bixtx.com device management system. This is the software that gets installed on devices you want to monitor and control remotely.

## 🚀 Features

- **Cross-Platform Support**: Works on Windows, macOS, and Linux
- **Real-Time Monitoring**: Continuous system metrics collection and reporting
- **Remote Control**: Keyboard and mouse control via WebRTC
- **Screen Capture**: High-performance screen streaming
- **Camera & Microphone**: Webcam and audio access
- **File Management**: Secure file browsing and transfer
- **Military-Grade Security**: E2E encryption with AES-256-GCM
- **System Tray Integration**: Runs silently in the background
- **Auto-Update**: Automatic software updates
- **Lightweight**: Minimal resource usage (~50MB RAM)

## 📋 Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 512MB minimum
- **Disk Space**: 100MB
- **Network**: Internet connection required

## 🛠️ Installation

### From Source

1. **Clone the repository**
```bash
git clone https://github.com/bixtx/software-a.git
cd software-a
```

2. **Install dependencies**
```bash
npm install
```

3. **Build the application**
```bash
npm run build
```

4. **Run in development mode**
```bash
npm run dev
```

### Pre-built Binaries

Download the latest release for your platform:
- **Windows**: `bixtx.com-Link-Setup-1.0.0.exe`
- **macOS**: `bixtx.com-Link-1.0.0.dmg`
- **Linux**: `bixtx-link_1.0.0_amd64.deb`

## 🔧 Development

### Project Structure

```
software-a/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── core/
│   │   ├── DeviceManager.ts    # Device info & metrics
│   │   ├── ConnectionManager.ts # WebSocket communication
│   │   ├── SecurityManager.ts  # Encryption & security
│   │   └── ConfigManager.ts    # Configuration management
│   ├── services/
│   │   ├── MonitoringService.ts      # Main monitoring service
│   │   ├── ScreenCaptureService.ts   # Screen streaming
│   │   ├── CameraService.ts          # Webcam access
│   │   ├── MicrophoneService.ts      # Audio recording
│   │   ├── FileSystemService.ts      # File operations
│   │   └── RemoteControlService.ts   # Remote input control
│   └── utils/
│       └── Logger.ts           # Logging utility
├── pages/
│   ├── registration.html       # Device registration UI
│   ├── settings.html          # Settings interface
│   └── logs.html              # Log viewer
├── package.json
├── tsconfig.json
└── forge.config.js
```

### Available Scripts

- `npm run dev` - Start in development mode
- `npm run build` - Build TypeScript to JavaScript
- `npm run package` - Package the application
- `npm run make` - Create distributables
- `npm run publish` - Publish to update server

## 🔐 Security

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Generation**: Cryptographically secure random keys
- **Data in Transit**: All WebSocket messages encrypted
- **Data at Rest**: Configuration files encrypted

### Permissions

The Link Software requires the following permissions:
- Screen recording
- Camera access (optional)
- Microphone access (optional)
- File system access (configurable)
- Network access

All permissions can be configured in the Settings panel.

## 📱 Registration Process

1. Install and launch the Link Software
2. A 6-digit registration code will be displayed
3. Open the bixtx.com app (Software B)
4. Navigate to "Add Device"
5. Enter the registration code
6. Device will be registered and appear in your device list

## 🔌 System Tray

The Link Software runs in the system tray with the following options:

- **Status**: Shows connection status
- **Device ID**: Displays your device ID
- **Show Registration Code**: Display the registration code (if not registered)
- **Settings**: Open settings panel
- **View Logs**: Open log viewer
- **Reconnect**: Manually reconnect to server
- **Unregister Device**: Remove device from your account
- **Quit**: Exit the application

## 🌐 Server Communication

### WebSocket Protocol

The Link Software communicates with the bixtx.com server via WebSocket:

**Default Server**: `wss://api.bixtx.com/ws`

### Message Types

- `auth` - Authentication with device ID and registration code
- `device_info` - Send device information
- `system_metrics` - Send system metrics
- `screen_frame` - Send screen capture frame
- `command` - Receive and execute commands
- `command_result` - Send command execution result
- `webrtc_offer/answer` - WebRTC signaling
- `webrtc_ice_candidate` - WebRTC ICE candidates

## 📊 System Metrics

The Link Software collects and sends the following metrics every 10 seconds:

- **CPU**: Usage percentage, per-core usage
- **Memory**: Total, used, available, usage percentage
- **Disk**: Per-volume usage and available space
- **Network**: Interface statistics, RX/TX rates
- **Processes**: Total, running, sleeping, blocked

## 🐛 Debugging

### Logs Location

Logs are stored in:
- **Windows**: `%APPDATA%\bixtx.comLink\logs\`
- **macOS**: `~/Library/Application Support/bixtx.comLink/logs/`
- **Linux**: `~/.config/bixtx.comLink/logs/`

### Log Levels

- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages

Change log level in Settings → Advanced → Logging Level

## 🔄 Auto-Update

The Link Software checks for updates every 24 hours and automatically downloads and installs new versions.

To disable auto-update:
1. Open Settings
2. Navigate to Advanced
3. Disable "Auto Update"

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This software is proprietary. All rights reserved by bixtx.com.

## 🆘 Support

- **Documentation**: https://docs.bixtx.com
- **Email**: support@bixtx.com
- **Discord**: https://discord.gg/bixtx

## 🔗 Related Projects

- **Software B (App Platform)**: The main bixtx.com application for web/mobile
- **bixtx.com Server**: Backend infrastructure (private)

---

**Built with ❤️ by the bixtx.com team**
