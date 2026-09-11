# bixtx Link Software - Installation Guide

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Windows Installation](#windows-installation)
3. [macOS Installation](#macos-installation)
4. [Linux Installation](#linux-installation)
5. [First-Time Setup](#first-time-setup)
6. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **CPU**: Dual-core processor (2 GHz or higher)
- **RAM**: 512 MB available
- **Storage**: 100 MB free disk space
- **Network**: Broadband internet connection
- **Operating System**:
  - Windows 10 or later (64-bit)
  - macOS 10.15 (Catalina) or later
  - Ubuntu 18.04 or later / Compatible Linux distributions

### Recommended Requirements
- **CPU**: Quad-core processor (2.5 GHz or higher)
- **RAM**: 1 GB available
- **Storage**: 500 MB free disk space (for logs and cache)
- **Network**: High-speed internet (10 Mbps+ for video streaming)

## Windows Installation

### Method 1: Using the Installer (Recommended)

1. **Download the Installer**
   - Download `bixtx.com-Link-Setup-1.0.0.exe` from the official website
   - Or from: https://download.bixtx.com/link/windows/latest

2. **Run the Installer**
   - Double-click the downloaded `.exe` file
   - If prompted by Windows Defender SmartScreen, click "More info" → "Run anyway"

3. **Installation Wizard**
   - Accept the license agreement
   - Choose installation location (default: `C:\Program Files\bixtx.com Link`)
   - Select "Create desktop shortcut" if desired
   - Click "Install"

4. **Complete Installation**
   - Wait for installation to complete
   - Check "Launch bixtx.com Link" and click "Finish"

### Method 2: Portable Version

1. Download `bixtx.com-Link-Portable-1.0.0.zip`
2. Extract to your preferred location
3. Run `bixtx.com-Link.exe`

### Windows Permissions

The installer will request the following permissions:
- **Network Access**: Required for server communication
- **System Tray**: For background operation
- **Accessibility API**: For remote control features (optional)

## macOS Installation

### Method 1: Using the DMG (Recommended)

1. **Download the DMG**
   - Download `bixtx.com-Link-1.0.0.dmg` from the official website
   - Or from: https://download.bixtx.com/link/macos/latest

2. **Mount the DMG**
   - Double-click the downloaded `.dmg` file
   - The bixtx.com Link installer window will open

3. **Install Application**
   - Drag the "bixtx.com Link" icon to the Applications folder
   - Wait for the copy to complete
   - Eject the DMG

4. **First Launch**
   - Open Applications folder
   - Double-click "bixtx.com Link"
   - If prompted with "unidentified developer" warning:
     - Right-click the app → "Open" → "Open" (or use Cmd+Click)
     - Or: System Preferences → Security & Privacy → "Open Anyway"

### macOS Permissions

On first launch, macOS will request permissions:

1. **Screen Recording** (Required for screen sharing)
   - System Preferences → Security & Privacy → Privacy → Screen Recording
   - Check "bixtx.com Link"

2. **Accessibility** (Required for remote control)
   - System Preferences → Security & Privacy → Privacy → Accessibility
   - Click the lock to make changes
   - Check "bixtx.com Link"

3. **Camera** (Optional)
   - Will prompt when camera access is needed

4. **Microphone** (Optional)
   - Will prompt when microphone access is needed

### Method 2: Using Homebrew

```bash
# Add bixtx.com tap
brew tap bixtx/tap

# Install bixtx.com Link
brew install --cask bixtx-link
```

## Linux Installation

### Ubuntu/Debian (DEB Package)

1. **Download the DEB Package**
```bash
wget https://download.bixtx.com/link/linux/bixtx-link_1.0.0_amd64.deb
```

2. **Install the Package**
```bash
sudo dpkg -i bixtx-link_1.0.0_amd64.deb
sudo apt-get install -f  # Install dependencies
```

3. **Launch Application**
```bash
bixtx-link
```

### Fedora/RHEL (RPM Package)

1. **Download the RPM Package**
```bash
wget https://download.bixtx.com/link/linux/bixtx-link-1.0.0.x86_64.rpm
```

2. **Install the Package**
```bash
sudo rpm -i bixtx-link-1.0.0.x86_64.rpm
```

### Arch Linux (AUR)

```bash
yay -S bixtx-link
```

### Universal (AppImage)

1. **Download the AppImage**
```bash
wget https://download.bixtx.com/link/linux/bixtx.com-Link-1.0.0.AppImage
```

2. **Make it Executable**
```bash
chmod +x bixtx.com-Link-1.0.0.AppImage
```

3. **Run the Application**
```bash
./bixtx.com-Link-1.0.0.AppImage
```

### Linux Permissions

Some features may require additional permissions:

```bash
# Screen recording (for Wayland)
sudo usermod -a -G video $USER

# Input control
sudo usermod -a -G input $USER
```

Log out and log back in for group changes to take effect.

## First-Time Setup

### Device Registration

1. **Launch bixtx.com Link**
   - The application will run in the system tray
   - A registration window will appear automatically

2. **Get Registration Code**
   - A 6-digit code will be displayed (e.g., `ABC123`)
   - This code is valid for 24 hours

3. **Register on bixtx.com App**
   - Open the bixtx.com app (Software B) on your phone or web browser
   - Log in to your account
   - Navigate to "Devices" → "Add Device"
   - Enter the 6-digit code
   - Click "Register Device"

4. **Confirmation**
   - Wait for confirmation (usually takes 5-10 seconds)
   - The registration window will close automatically
   - System tray icon will show "Connected" status

### Initial Configuration

1. **Configure Permissions**
   - Right-click system tray icon → "Settings"
   - Review and adjust permissions:
     - Remote Control
     - Screen Capture
     - Camera Access
     - Microphone Access
     - File Access

2. **Set Auto-Start** (Optional)
   - In Settings → General
   - Enable "Auto Start" to launch on system startup

3. **Review Server Settings**
   - Settings → Advanced
   - Verify server URL: `wss://api.bixtx.com/ws`
   - Change only if using a custom server

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to server

**Solutions**:
1. Check your internet connection
2. Verify firewall isn't blocking the application
3. Try changing server URL in Settings → Advanced
4. Check logs for detailed error messages

### Registration Failed

**Problem**: Registration code not working

**Solutions**:
1. Ensure you're entering the code correctly (case-sensitive)
2. Generate a new code (click "Generate New Code")
3. Check that the device clock is accurate
4. Verify your bixtx.com app is logged in

### High CPU Usage

**Problem**: Application using too much CPU

**Solutions**:
1. Check if screen capture is active (disable if not needed)
2. Lower screen capture quality in Settings
3. Close other resource-intensive applications
4. Check logs for errors

### Permission Denied (macOS)

**Problem**: Features not working on macOS

**Solutions**:
1. Grant required permissions in System Preferences
2. Restart the application after granting permissions
3. For Accessibility: System Preferences → Security & Privacy → Privacy → Accessibility

### Screen Capture Not Working (Linux)

**Problem**: Screen sharing not functioning

**Solutions**:
1. For Wayland: Switch to X11 or install portal packages
```bash
# Ubuntu/Debian
sudo apt-get install xdg-desktop-portal xdg-desktop-portal-gtk

# Fedora
sudo dnf install xdg-desktop-portal xdg-desktop-portal-gtk
```

2. Grant screen recording permissions
3. Restart the application

### Application Not Starting

**Problem**: Application crashes on startup

**Solutions**:
1. Check system requirements
2. View logs:
   - Windows: `%APPDATA%\bixtx.comLink\logs\`
   - macOS: `~/Library/Application Support/bixtx.comLink/logs/`
   - Linux: `~/.config/bixtx.comLink/logs/`
3. Try reinstalling the application
4. Contact support with log files

## Uninstallation

### Windows
1. Control Panel → Programs → Uninstall a program
2. Select "bixtx.com Link" → Uninstall
3. Or run: `C:\Program Files\bixtx.com Link\Uninstall.exe`

### macOS
1. Quit bixtx.com Link
2. Open Applications folder
3. Drag "bixtx.com Link" to Trash
4. Empty Trash
5. Remove config files (optional):
```bash
rm -rf ~/Library/Application\ Support/bixtx.comLink
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get remove bixtx-link
```

### Linux (Fedora/RHEL)
```bash
sudo rpm -e bixtx-link
```

## Getting Help

If you encounter issues not covered in this guide:

- **Documentation**: https://docs.bixtx.com/link/troubleshooting
- **Support Email**: support@bixtx.com
- **Community Forum**: https://community.bixtx.com
- **Discord**: https://discord.gg/bixtx

---

**Last Updated**: November 2024  
**Version**: 1.0.0
