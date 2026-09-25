# bixtx Linux Agent

Node.js agent for Linux (Ubuntu 20.04+, Debian 11+, Fedora 38+, Arch).

## Quick install (one-liner)

```bash
curl -sSL https://bixtx.onrender.com/v1/agent/download/linux.sh | sudo bash -s -- --key YOUR_ENROLL_KEY
```

Or download and inspect first:
```bash
curl -o install.sh https://bixtx.onrender.com/v1/agent/download/linux.sh
# review install.sh
sudo bash install.sh --key YOUR_ENROLL_KEY --c2 wss://bixtx.onrender.com/agent
```

## Manual install

```bash
git clone https://github.com/jonan2002/BIXTX.git
cd BIXTX/software-linux
sudo bash install.sh --key YOUR_ENROLL_KEY
```

## Requirements

- Node.js 18+
- npm 9+
- Root access (for systemd service installation)
- Network access to `wss://bixtx.onrender.com/agent`

## Service management

```bash
sudo systemctl status bixtx-agent
sudo journalctl -u bixtx-agent -f
sudo systemctl stop bixtx-agent
sudo systemctl restart bixtx-agent
```
