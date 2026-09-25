# bixtx Windows Agent

Native Windows agent using Node.js + Windows Service.

## Quick install (one-liner, Admin PowerShell)

```powershell
irm https://bixtx.onrender.com/v1/agent/download/windows.ps1 | iex
```

Or download and review first:
```powershell
Invoke-WebRequest -Uri https://bixtx.onrender.com/v1/agent/download/windows.ps1 -OutFile install.ps1
# review install.ps1
powershell -ExecutionPolicy Bypass -File install.ps1 -EnrollKey YOUR_KEY
```

## Requirements

- Windows 10 / Server 2016+
- Node.js 18+ (download from nodejs.org)
- PowerShell 5.1+ (built into Windows 10)
- Run as Administrator

## Service management

```powershell
Get-Service -Name bixtx-agent
Start-Service -Name bixtx-agent
Stop-Service -Name bixtx-agent
# View logs
Get-EventLog -LogName Application -Source bixtx-agent -Newest 50
```
