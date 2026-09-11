# 🚀 bixtx.com - Quick Start Guide

**Get started with bixtx.com in under 5 minutes!**

---

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 16.x or higher installed
- npm 8.x or higher installed
- Git installed
- A code editor (VS Code recommended)

---

## 🎯 Quick Setup

### Option 1: For Developers (Full Setup)

#### Step 1: Clone & Setup Software A (Link Software)

```bash
# Navigate to software-a directory
cd software-a

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev
```

The Link Software will launch with a system tray icon. Click "Show Registration Code" to see your 6-digit code.

#### Step 2: Setup Software B (App Platform)

```bash
# Navigate to software-b directory (in a new terminal)
cd software-b

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

#### Step 3: Connect the Two

1. In Software B (web interface):
   - Click "Add Device" or "Link Device"
   - Enter the 6-digit code from Software A
   - Click "Register Device"

2. Wait for confirmation (5-10 seconds)

3. Your device will appear in the dashboard! 🎉

---

### Option 2: For End Users (Simple Installation)

#### Install Software A on Device to Monitor

**Windows**:
```bash
# Download and run installer
bixtx.com-Link-Setup-1.0.0.exe
```

**macOS**:
```bash
# Download and mount DMG
bixtx.com-Link-1.0.0.dmg
# Drag to Applications folder
```

**Linux (Ubuntu/Debian)**:
```bash
# Download and install DEB package
sudo dpkg -i bixtx-link_1.0.0_amd64.deb
```

#### Use Software B to Control

**Web**:
- Visit: `https://app.bixtx.com`
- Create account or login
- Click "Add Device"
- Enter registration code from Software A

**Mobile**:
- Download "bixtx.com" from App Store or Google Play
- Login to your account
- Tap "Add Device"
- Enter registration code

---

## 🎮 Basic Usage

### View Device Status

1. Open Software B (web or mobile)
2. Navigate to Dashboard
3. See all your devices with real-time status:
   - 🟢 Online - Device is connected
   - 🔴 Offline - Device is disconnected
   - ⚠️ Warning - High resource usage

### Monitor System Metrics

1. Click on any device card
2. View real-time metrics:
   - CPU usage graph
   - Memory usage
   - Disk space
   - Network activity

### Remote Control

1. Click on a device
2. Click "Remote Control" button
3. Control the device with your mouse and keyboard
4. Click "Stop Control" when done

### Screen Sharing

1. Click on a device
2. Click "Screen Share" button
3. View live screen feed
4. Click "Stop Sharing" when done

### File Management

1. Click on a device
2. Click "Files" button
3. Browse files and folders
4. Download, upload, or delete files
5. Drag & drop for easy transfers

---

## ⚙️ Configuration

### Software A Settings

Right-click the system tray icon → "Settings"

**Permissions**:
- ✅ Remote Control - Allow keyboard/mouse control
- ✅ Screen Capture - Allow screen streaming
- ✅ Camera Access - Allow webcam access
- ✅ Microphone Access - Allow mic access
- ✅ File Access - Allow file operations

**General**:
- Auto Start - Launch on system startup
- Notifications - Show system notifications

**Advanced**:
- Server URL - WebSocket server address
- Logging Level - debug, info, warn, error

### Software B Settings

Click your profile → "Settings"

**Account**:
- Profile information
- Email preferences
- Password change

**Devices**:
- Manage connected devices
- View device permissions
- Unregister devices

**Security**:
- Two-factor authentication
- Session management
- Activity log

---

## 🔐 Security Best Practices

### Device Registration
✅ **DO**: Keep registration codes private  
✅ **DO**: Register devices only on trusted networks  
✅ **DO**: Revoke access when device is no longer needed  
❌ **DON'T**: Share registration codes publicly  
❌ **DON'T**: Leave devices registered on public computers

### Remote Access
✅ **DO**: End sessions when done  
✅ **DO**: Lock your device when away  
✅ **DO**: Use strong account passwords  
❌ **DON'T**: Access sensitive data on public WiFi  
❌ **DON'T**: Save passwords in the application

### Permissions
✅ **DO**: Only grant necessary permissions  
✅ **DO**: Review permissions regularly  
✅ **DO**: Disable features you don't use  
❌ **DON'T**: Grant all permissions by default  
❌ **DON'T**: Ignore permission requests

---

## 🐛 Troubleshooting

### Device Won't Connect

**Problem**: Software A shows "Disconnected"

**Solutions**:
1. Check internet connection
2. Right-click tray icon → "Reconnect"
3. Verify server URL in Settings
4. Check firewall settings
5. View logs for errors

### Registration Code Not Working

**Problem**: Code rejected when registering

**Solutions**:
1. Generate a new code in Software A
2. Ensure you're logged into Software B
3. Check that code hasn't expired (24 hours)
4. Verify system time is accurate

### Screen Sharing Not Working

**Problem**: Black screen or no video

**Solutions**:
1. **macOS**: Grant Screen Recording permission
   - System Preferences → Security & Privacy → Privacy → Screen Recording
2. **Windows**: Run as administrator (if needed)
3. **Linux**: Install portal packages:
   ```bash
   sudo apt-get install xdg-desktop-portal xdg-desktop-portal-gtk
   ```
4. Restart Software A

### High CPU/Memory Usage

**Problem**: Software A using too many resources

**Solutions**:
1. Lower screen capture quality in Settings
2. Reduce capture frame rate
3. Stop screen sharing when not needed
4. Close other resource-intensive apps
5. Check logs for errors

### Permission Denied (macOS)

**Problem**: Features not working on Mac

**Solutions**:
1. Grant required permissions:
   - Screen Recording
   - Accessibility
   - Camera (if using)
   - Microphone (if using)
2. System Preferences → Security & Privacy → Privacy
3. Restart Software A after granting permissions

---

## 📱 Platform-Specific Notes

### Windows
- Runs in system tray (bottom-right corner)
- May require Windows Defender exception
- Administrator rights needed for some features

### macOS
- Runs in menu bar (top-right corner)
- Requires multiple permission grants on first run
- May show "unidentified developer" warning (right-click → Open)

### Linux
- Runs in system tray
- Wayland users: X11 mode recommended for screen sharing
- Some features require additional packages

---

## 🎓 Learning Resources

### Documentation
- **Full Documentation**: `/README.md` in each software folder
- **API Reference**: `/software-a/API_DOCUMENTATION.md`
- **Development Guide**: `/software-a/DEVELOPMENT_GUIDE.md`
- **Integration Guide**: `/SYSTEM_INTEGRATION.md`

### Video Tutorials (Coming Soon)
- Getting started with bixtx.com
- Remote control best practices
- File management tips
- Security & privacy guide

### Community
- **Discord**: https://discord.gg/bixtx
- **Forum**: https://community.bixtx.com
- **Support**: support@bixtx.com

---

## 🔄 Next Steps

### For Users
1. ✅ Install and register your first device
2. ✅ Explore the dashboard and features
3. ✅ Set up additional devices
4. ✅ Configure permissions and settings
5. ✅ Join the community

### For Developers
1. ✅ Set up development environment
2. ✅ Review architecture documentation
3. ✅ Explore the codebase
4. ✅ Build and test modifications
5. ✅ Contribute improvements

---

## 💡 Quick Tips

### Keyboard Shortcuts (Software B Web)
- `Ctrl/Cmd + K` - Quick device search
- `Ctrl/Cmd + 1-9` - Switch between devices
- `Ctrl/Cmd + R` - Refresh device list
- `Ctrl/Cmd + S` - Open settings
- `Esc` - Exit full-screen mode

### Pro Tips
1. **Organize Devices**: Use custom names and tags
2. **Create Groups**: Group devices by location or type
3. **Set Alerts**: Get notified of issues
4. **Schedule Tasks**: Automate routine operations
5. **Export Logs**: Keep records for audit purposes

---

## 📊 Features Overview

| Feature | Software A | Software B | Status |
|---------|-----------|-----------|--------|
| Device Monitoring | ✅ Collects | ✅ Displays | Live |
| Remote Control | ✅ Executes | ✅ Sends | Live |
| Screen Sharing | ✅ Captures | ✅ Displays | Live |
| File Management | ✅ Provides | ✅ Manages | Live |
| Camera Access | ✅ Framework | ✅ Viewer | Dev |
| Microphone Access | ✅ Framework | ✅ Listener | Dev |
| E2E Encryption | ✅ Built-in | ✅ Built-in | Live |
| Multi-device | ✅ Supported | ✅ Supported | Live |

---

## 🆘 Getting Help

### Self-Help
1. Check this Quick Start Guide
2. Review full documentation
3. Search community forum
4. Check FAQ section

### Contact Support
- **Email**: support@bixtx.com
- **Response Time**: Within 24 hours
- **Include**: 
  - Software version
  - Operating system
  - Error messages
  - Log files (if applicable)

### Community Support
- **Discord**: Real-time chat with community
- **Forum**: Post detailed questions
- **GitHub**: Report bugs and feature requests

---

## 🎉 You're All Set!

Congratulations! You now have bixtx.com up and running. 

Start monitoring and controlling your devices with confidence! 🚀

---

**Questions?** Visit our [complete documentation](/COMPLETE_PROJECT_OVERVIEW.md) or reach out to support@bixtx.com

**Built with ❤️ by the bixtx.com team**
