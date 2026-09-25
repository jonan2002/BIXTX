# bixtx macOS Agent

Node.js agent for macOS 12+ (Monterey and later), installed as a launchd daemon.

## Quick install (one-liner)

```bash
curl -sSL https://bixtx.onrender.com/v1/agent/download/macos.sh | sudo bash -s -- --key YOUR_ENROLL_KEY
```

Or download and inspect first:
```bash
curl -o install.sh https://bixtx.onrender.com/v1/agent/download/macos.sh
# review install.sh
sudo bash install.sh --key YOUR_ENROLL_KEY --c2 wss://bixtx.onrender.com/agent
```

## Requirements

- macOS 12+ (Monterey or later)
- Node.js 18+ (`brew install node`)
- Root access
- Network access to `wss://bixtx.onrender.com/agent`

## Service management

```bash
sudo launchctl list com.bixtx.agent
sudo launchctl stop com.bixtx.agent
sudo launchctl start com.bixtx.agent
tail -f /var/log/bixtx-agent.log
```
