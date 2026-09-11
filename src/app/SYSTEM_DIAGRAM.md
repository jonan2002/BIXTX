# 🎨 bixtx.com - Visual System Diagrams

This document provides visual representations of the bixtx.com system architecture, data flow, and component interactions.

---

## 🏗️ Complete System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          BIXTX.COM ECOSYSTEM                                │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        USER LAYER                                     │ │
│  │                                                                        │ │
│  │  👤 End Users                                                         │ │
│  │  ├─ Web Browser (Chrome, Firefox, Safari, Edge)                      │ │
│  │  ├─ Mobile Devices (iOS, Android)                                    │ │
│  │  └─ Desktop Computers (Windows, macOS, Linux)                        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    SOFTWARE B (App Platform)                          │ │
│  │                                                                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │ │
│  │  │ Web App     │  │ iOS App     │  │ Android App │                 │ │
│  │  │ (React)     │  │ (React      │  │ (React      │                 │ │
│  │  │             │  │  Native)    │  │  Native)    │                 │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │ │
│  │                                                                        │ │
│  │  Features:                                                            │ │
│  │  • Dashboard & Device Management                                     │ │
│  │  • Real-time Monitoring & Analytics                                  │ │
│  │  • Remote Control Interface                                          │ │
│  │  • Screen Sharing Viewer                                             │ │
│  │  • File Manager                                                      │ │
│  │  • Security Dashboard                                                │ │
│  │  • Multi-device Control                                              │ │
│  │  • User Settings & Configuration                                     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                  BACKEND INFRASTRUCTURE                               │ │
│  │                                                                        │ │
│  │  ┌───────────────────────────────────────────────────────────────┐  │ │
│  │  │  Load Balancer (nginx / HAProxy)                              │  │ │
│  │  └───────────────────────────────────────────────────────────────┘  │ │
│  │                           ▼                                           │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │ │
│  │  │  WebSocket    │  │  REST API     │  │  WebRTC       │           │ │
│  │  │  Server       │  │  Server       │  │  Signaling    │           │ │
│  │  │  (Node.js)    │  │  (Express)    │  │  Server       │           │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │ │
│  │                                                                        │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │ │
│  │  │  PostgreSQL   │  │  Redis Cache  │  │  File Storage │           │ │
│  │  │  Database     │  │  (Sessions)   │  │  (S3)         │           │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │ │
│  │                                                                        │ │
│  │  ┌───────────────────────────────────────────────────────────────┐  │ │
│  │  │  Authentication Service (JWT)                                  │  │ │
│  │  └───────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    SOFTWARE A (Link Software)                         │ │
│  │                                                                        │ │
│  │  ┌───────────────────────────────────────────────────────────────┐  │ │
│  │  │  Electron Application (Cross-platform Desktop Agent)          │  │ │
│  │  └───────────────────────────────────────────────────────────────┘  │ │
│  │                           ▼                                           │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │ │
│  │  │  Core         │  │  Services     │  │  UI Pages     │           │ │
│  │  │  • Device     │  │  • Monitoring │  │  • Registration│          │ │
│  │  │  • Connection │  │  • Screen     │  │  • Settings   │           │ │
│  │  │  • Security   │  │  • Remote     │  │  • Logs       │           │ │
│  │  │  • Config     │  │  • Files      │  │               │           │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘           │ │
│  │                                                                        │ │
│  │  Features:                                                            │ │
│  │  • System Monitoring (CPU, RAM, Disk, Network)                      │ │
│  │  • Remote Control Execution (Mouse, Keyboard)                        │ │
│  │  • Screen Capture & Streaming                                        │ │
│  │  • File System Operations                                            │ │
│  │  • Camera & Microphone Access                                        │ │
│  │  • E2E Encryption (AES-256-GCM)                                      │ │
│  │  • System Tray Integration                                           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                     TARGET DEVICES                                    │ │
│  │                                                                        │ │
│  │  💻 Device 1  |  💻 Device 2  |  🖥️ Device 3  |  📱 Device N         │ │
│  │  (Windows)    |  (macOS)      |  (Linux)      |  (IoT Device)        │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

### Registration Flow
```
┌─────────────┐                                           ┌─────────────┐
│ Software A  │                                           │ Software B  │
│(Link Agent) │                                           │  (App UI)   │
└──────┬──────┘                                           └──────┬──────┘
       │                                                         │
       │ 1. Launch Application                                  │
       │ ┌──────────────────────┐                              │
       ├─►│ Generate Device ID   │                              │
       │ │  LWX-ABC123DEF456    │                              │
       │ └──────────────────────┘                              │
       │                                                         │
       │ 2. Generate Registration Code                          │
       │ ┌──────────────────────┐                              │
       ├─►│ Create 6-digit code  │                              │
       │ │      XYZ123          │                              │
       │ └──────────────────────┘                              │
       │                                                         │
       │ 3. Display Code to User                                │
       │ ╔══════════════════════╗                              │
       │ ║ Registration Code:   ║                              │
       │ ║      XYZ123          ║                              │
       │ ╚══════════════════════╝                              │
       │                                                         │
       │                           4. User enters code          │
       │                              ┌────────────┐            │
       │                              │ Enter Code │◄───────────┤
       │                              │   XYZ123   │            │
       │                              └────────────┘            │
       │                                     │                  │
       │                                     ▼                  │
       │                           ┌──────────────────┐        │
       │                           │ Validate on      │        │
       │                           │ Backend Server   │        │
       │                           └────────┬─────────┘        │
       │                                     │                  │
       │ 5. Registration Successful          │                  │
       │◄────────────────────────────────────┴──────────────────┤
       │                                                         │
       │ 6. Establish WebSocket Connection                      │
       │ ═══════════════════════════════════════════════════════►│
       │                                                         │
       │ 7. Send Device Information                             │
       ├────────────────────────────────────────────────────────►│
       │  {deviceId, platform, specs, ...}                      │
       │                                                         │
       │                              8. Device Appears         │
       │                              ┌────────────────┐        │
       │                              │  💻 Device     │        │
       │                              │  Online ✅     │◄───────┤
       │                              │  CPU: 45%      │        │
       │                              └────────────────┘        │
       │                                                         │
       │ 9. Begin Real-time Monitoring                          │
       ├────────────────────────────────────────────────────────►│
       │ [System Metrics every 10 seconds]                      │
       │                                                         │
```

### Real-Time Monitoring Flow
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Software A  │         │   Backend    │         │ Software B  │
│  (Agent)    │         │   Server     │         │ (Dashboard) │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ Every 10 seconds      │                        │
       │                       │                        │
       │ Collect Metrics       │                        │
       ├─┐                     │                        │
       │ │ CPU Usage: 45%      │                        │
       │ │ RAM Usage: 8GB/16GB │                        │
       │ │ Disk: 250GB/500GB   │                        │
       │ │ Network: 5 Mbps     │                        │
       │◄┘                     │                        │
       │                       │                        │
       │ Encrypt Data          │                        │
       ├─┐                     │                        │
       │ │ AES-256-GCM         │                        │
       │◄┘                     │                        │
       │                       │                        │
       │ Send to Server        │                        │
       ├──────────────────────►│                        │
       │ {type: 'metrics',     │                        │
       │  data: {...},         │                        │
       │  encrypted: true}     │                        │
       │                       │                        │
       │                       │ Forward to Client      │
       │                       ├───────────────────────►│
       │                       │                        │
       │                       │                 Update Dashboard
       │                       │                        ├─┐
       │                       │                        │ │ CPU Chart
       │                       │                        │ │ RAM Chart
       │                       │                        │ │ Disk Chart
       │                       │                        │◄┘
       │                       │                        │
       │      [Loop continues every 10 seconds]         │
       │                       │                        │
```

### Remote Control Flow
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Software A  │         │   Backend    │         │ Software B  │
│  (Executes) │         │   Server     │         │ (User Input)│
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │                       │           User Action  │
       │                       │                        │◄─ 👆
       │                       │                        │
       │                       │  Mouse Move(500, 300)  │
       │                       │◄───────────────────────┤
       │                       │                        │
       │  Execute Mouse Move   │                        │
       │◄──────────────────────┤                        │
       │                       │                        │
       ├─┐ Move cursor to      │                        │
       │ │ position (500, 300) │                        │
       │◄┘                     │                        │
       │                       │                        │
       │  Acknowledge          │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                       │  Forward               │
       │                       ├───────────────────────►│
       │                       │                        │
       │                       │      User Action       │
       │                       │                        │◄─ ⌨️
       │                       │                        │
       │                       │  Keyboard Press 'h'    │
       │                       │◄───────────────────────┤
       │                       │                        │
       │  Execute Keypress     │                        │
       │◄──────────────────────┤                        │
       │                       │                        │
       ├─┐ Type character 'h'  │                        │
       │◄┘                     │                        │
       │                       │                        │
       │  Acknowledge          │                        │
       ├──────────────────────►│                        │
       │                       │                        │
       │                       │  Forward               │
       │                       ├───────────────────────►│
       │                       │                        │
       │   [Continuous real-time control loop]          │
       │                       │                        │
```

---

## 🧩 Software A Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     SOFTWARE A (Link Software)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Application Layer                        │ │
│  │                                                              │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │ │
│  │  │  main.ts     │   │ System Tray  │   │ UI Windows   │   │ │
│  │  │  (Entry)     │───►  Integration  │───►  Management  │   │ │
│  │  └──────────────┘   └──────────────┘   └──────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Service Layer                            │ │
│  │                                                              │ │
│  │  ┌─────────────────┐                                        │ │
│  │  │ Monitoring      │  Orchestrates all services            │ │
│  │  │ Service         │                                        │ │
│  │  └────────┬────────┘                                        │ │
│  │           │                                                  │ │
│  │     ┌─────┴─────┬──────────┬──────────┬──────────┬─────┐  │ │
│  │     ▼           ▼          ▼          ▼          ▼     ▼  │ │
│  │  ┌───────┐  ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────┐  │ │
│  │  │Screen │  │Camera  │ │  Mic   │ │ Remote  │ │ File │  │ │
│  │  │Capture│  │Service │ │Service │ │ Control │ │System│  │ │
│  │  └───────┘  └────────┘ └────────┘ └─────────┘ └──────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Core Layer                               │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Device     │  │ Connection   │  │  Security    │    │ │
│  │  │   Manager    │  │  Manager     │  │  Manager     │    │ │
│  │  │              │  │              │  │              │    │ │
│  │  │ • Info       │  │ • WebSocket  │  │ • AES-256    │    │ │
│  │  │ • Metrics    │  │ • Reconnect  │  │ • E2E        │    │ │
│  │  │ • System     │  │ • Heartbeat  │  │ • Keys       │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                              │ │
│  │  ┌──────────────┐                                          │ │
│  │  │   Config     │  Manages settings and permissions       │ │
│  │  │   Manager    │                                          │ │
│  │  └──────────────┘                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                Infrastructure Layer                         │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Logger     │  │    Native    │  │  File System │    │ │
│  │  │              │  │   Modules    │  │   Access     │    │ │
│  │  │ • File logs  │  │              │  │              │    │ │
│  │  │ • Console    │  │ • robotjs    │  │ • Read/Write │    │ │
│  │  │ • Levels     │  │ • sysinfo    │  │ • List       │    │ │
│  │  └──────────────┘  │ • screenshot │  │ • Delete     │    │ │
│  │                     └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Software B Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   SOFTWARE B (App Platform)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Presentation Layer                       │ │
│  │                                                              │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │ │
│  │  │  Dashboard   │   │   Device     │   │   Remote     │   │ │
│  │  │   Page       │───►   Details    │───►   Control    │   │ │
│  │  └──────────────┘   └──────────────┘   └──────────────┘   │ │
│  │                                                              │ │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │ │
│  │  │  Screen      │   │    File      │   │   Settings   │   │ │
│  │  │   Share      │───►   Manager    │───►    Page      │   │ │
│  │  └──────────────┘   └──────────────┘   └──────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Component Layer                          │ │
│  │                                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  Device Components                                     │ │ │
│  │  │  • DeviceCard  • DeviceGrid  • DeviceStatus           │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  Monitoring Components                                 │ │ │
│  │  │  • CPUChart  • MemoryChart  • DiskChart  • NetChart   │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  Remote Control Components                             │ │ │
│  │  │  • RemoteCanvas  • ControlPanel  • ToolBar            │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  File Manager Components                               │ │ │
│  │  │  • FileList  • FileTree  • FileViewer  • Uploader     │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  UI Components                                         │ │ │
│  │  │  • Button  • Input  • Modal  • Card  • Alert  • ...   │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Service Layer                            │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │  API         │  │  WebSocket   │  │  WebRTC      │    │ │
│  │  │  Service     │  │  Service     │  │  Service     │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐                       │ │
│  │  │  Auth        │  │  Storage     │                       │ │
│  │  │  Service     │  │  Service     │                       │ │
│  │  └──────────────┘  └──────────────┘                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    State Management                         │ │
│  │                                                              │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  React Hooks & Context                                │ │ │
│  │  │  • useAuth  • useDevices  • useWebSocket  • ...       │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 4: Application Security                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • E2E Encryption (AES-256-GCM)                            │ │
│  │  • Screen captures encrypted                               │ │
│  │  │  File transfers encrypted                               │ │
│  │  • Credentials encrypted at rest                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ▼                                     │
│  Layer 3: Transport Security                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • WSS (WebSocket Secure)                                  │ │
│  │  • TLS 1.3                                                 │ │
│  │  • Certificate validation                                  │ │
│  │  • Perfect forward secrecy                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ▼                                     │
│  Layer 2: Authentication & Authorization                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Device ID + Registration Code                           │ │
│  │  • JWT Session tokens                                      │ │
│  │  • Token expiration & renewal                              │ │
│  │  • Permission-based access control                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             ▼                                     │
│  Layer 1: Network Security                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Firewall rules                                          │ │
│  │  • DDoS protection                                         │ │
│  │  • Rate limiting                                           │ │
│  │  • IP whitelisting (optional)                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

Security Flow:
──────────────

  User Action                                            Execution
      ▼                                                      ▼
┌───────────┐    Encrypt     ┌──────────┐    Decrypt  ┌──────────┐
│Software B │───(AES-256)───►│  Server  │───(AES-256)─►│Software A│
└───────────┘                └──────────┘              └──────────┘
      ▲                           │                          │
      │                           │                          │
      │                      ┌────▼────┐                    │
      │                      │ Validate│                    │
      │                      │  Token  │                    │
      │                      └────┬────┘                    │
      │                           │                          │
      │                      ┌────▼────┐                    │
      │                      │  Check  │                    │
      │                      │ Perms   │                    │
      │                      └────┬────┘                    │
      │                           │                          │
      │◄──────────────────────────┴──────────────────────────┘
                          Forward if authorized
```

---

## 📡 Communication Patterns

### WebSocket Message Flow
```
Software A                 Server                 Software B
    │                         │                         │
    │───── Connect ──────────►│                         │
    │                         │                         │
    │◄──── Connected ─────────┤                         │
    │                         │                         │
    │───── auth ─────────────►│                         │
    │                         │                         │
    │◄── auth_success ────────┤                         │
    │                         │                         │
    │─── device_info ────────►│                         │
    │                         │                         │
    │                         │────── Forward ─────────►│
    │                         │                         │
    │─── metrics (10s) ──────►│                         │
    │                         │                         │
    │                         │────── Forward ─────────►│
    │                         │                         │
    │                         │◄───── command ──────────│
    │                         │                         │
    │◄──── command ───────────┤                         │
    │                         │                         │
    │─── result ─────────────►│                         │
    │                         │                         │
    │                         │────── Forward ─────────►│
    │                         │                         │
    │◄──── ping ──────────────┤                         │
    │                         │                         │
    │───── pong ─────────────►│                         │
    │                         │                         │
```

### WebRTC P2P Flow
```
Software A                 Server                 Software B
    │                         │                         │
    │                         │◄─── start_share ────────│
    │                         │                         │
    │◄─── webrtc_offer ───────┤                         │
    │                         │                         │
    │─── webrtc_answer ──────►│                         │
    │                         │                         │
    │                         │─── webrtc_answer ──────►│
    │                         │                         │
    │◄── ice_candidate ───────│◄─── ice_candidate ──────│
    │                         │                         │
    │─── ice_candidate ───────│─── ice_candidate ───────│
    │                         │                         │
    │◄═══════ Direct P2P Connection Established ═══════►│
    │                                                     │
    │══════ Screen Frames (30-60 FPS) ═════════════════►│
    │                                                     │
    │◄════ Control Events (Mouse, Keyboard) ═════════════│
    │                                                     │
```

---

## 📈 Scalability Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      SCALABLE INFRASTRUCTURE                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Users (100,000+)                                              │
│  ▼ ▼ ▼ ▼ ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  CDN (Cloudflare / CloudFront)                           │ │
│  │  • Static assets (Software B)                            │ │
│  │  • Global distribution                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Load Balancer (nginx / HAProxy)                         │ │
│  │  • Round-robin distribution                              │ │
│  │  • Health checks                                         │ │
│  │  • SSL termination                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server Cluster                                │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ...           │ │
│  │  │ WS 1 │  │ WS 2 │  │ WS 3 │  │ WS N │                 │ │
│  │  └──────┘  └──────┘  └──────┘  └──────┘                 │ │
│  │  • Auto-scaling (10,000 conn/server)                     │ │
│  │  • Sticky sessions                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  API Server Cluster                                      │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ...                      │ │
│  │  │ API 1│  │ API 2│  │ API N│                            │ │
│  │  └──────┘  └──────┘  └──────┘                            │ │
│  │  • Stateless                                             │ │
│  │  • Horizontal scaling                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Redis Cluster (Cache & Session Store)                   │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐                           │ │
│  │  │Primary│  │Replica│ │Replica│                           │ │
│  │  └──────┘  └──────┘  └──────┘                           │ │
│  │  • Session management                                    │ │
│  │  • Message queue                                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Cluster (Primary Database)                   │ │
│  │  ┌────────┐  ┌─────────┐  ┌─────────┐                   │ │
│  │  │ Primary│  │ Replica 1│  │ Replica 2│                  │ │
│  │  └────────┘  └─────────┘  └─────────┘                   │ │
│  │  • Multi-AZ deployment                                   │ │
│  │  • Read replicas                                         │ │
│  │  • Automatic failover                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Capacity:                                                      │
│  • 10,000 concurrent connections per WS server                 │
│  • 100,000 messages/second                                     │
│  • 10 Gbps data throughput                                     │
│  • Unlimited devices (horizontally scalable)                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

**Complete visual system documentation created!** 🎨

These diagrams provide a comprehensive visual understanding of:
- System architecture
- Data flows
- Component interactions
- Security layers
- Communication patterns
- Scalability design

---

**Built with ❤️ by the bixtx.com team**  
**November 27, 2024**
