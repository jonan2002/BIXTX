🔴 Critical Mismatches (Will Break at Runtime)
Native Modules +  --ignore-scripts  = Crash
package.json:  better-sqlite3 ,  screenshot-desktop ,  keylogger  (all native  .node  binaries)
Installers:  npm install --production --ignore-scripts 
 --ignore-scripts  skips  node-gyp rebuild . These modules will be uncompiled on the target. The agent will crash with  Cannot find module  or  Module did not self-register  on first SQLite query, screenshot, or keylogger init.
Fix: Pre-compile on your build machine, then ship the  .node  binaries alongside. Or remove  --ignore-scripts  (accepts supply-chain risk). Or switch to  pkg  binaries (see #2).
Installers Assume Source Install; package.json Is Built for  pkg  Binaries
package.json: Extensive  pkg  scripts ( build ,  build:win ,  build:mac ,  build:linux ,  build:arm )
Installers: Copy  src/  and run  npm install  on target
This is a workflow mismatch. The package.json is designed to produce standalone binaries. The installers ignore that and do a full source-based install.
You have three deployment models. Pick one:
Sheets
Model
What You Ship
Installer Change Needed
A. Source install (current)
 src/ ,  package.json ,  node_modules/ 
Remove all  pkg / obfuscate / bytenode  from package.json to avoid confusion
B. pkg binary (recommended)
 dist/bixtx-agent-{linux,win,mac}  binary +  .env 
Installer copies binary from  dist/ , no  npm install , no  node_modules 
C. Obfuscated source
 dist-obf/  directory
Installer copies  dist-obf/  instead of  src/ , then  npm install    Recommendation: Go with Model B (pkg binary). It solves the native module compilation problem, hides source code, and eliminates the Node.js runtime dependency on the target.
 postinstall  Script Skipped
package.json:  "postinstall": "node-gyp rebuild 2>/dev/null || true" 
Installers:  --ignore-scripts  blocks this
If you keep source install,  better-sqlite3  will not have its native bindings compiled. The  postinstall  is there for a reason.
PM2 vs Native Process Managers
package.json:  pm2:start ,  pm2:stop ,  pm2:reload ,  pm2:status ,  logs 
Bash installer: systemd/launchd
PS installer: NSSM/Scheduled Task
If an admin runs  npm run pm2:start  after your installer, two process managers fight over the same agent. systemd will restart it, PM2 will restart it, logs will duplicate.
Fix: Remove all PM2 scripts from  package.json  (for production). Keep them only in a separate  dev-package.json  if needed for development.
 install-service  Script Ignored
package.json:  "install-service": "node src/persistence/install.js" 
Installers: Do their own service installation inline
If  src/persistence/install.js  exists in your source tree, the installer copies it to the target. A future  npm run install-service  could create a second, conflicting service.
Fix: Either:
 
Remove  "install-service"  from  package.json  scripts, OR
 
Have the bash/PS installer call  node src/persistence/install.js  instead of doing it inline, OR
 
Add  src/persistence/  to the rsync/Copy-Item exclude list
🟠 High Severity
Dual Logging Conflict
package.json:  winston-daily-rotate-file  (writes to  logs/  with daily rotation)
Bash installer:  StandardOutput=append:/var/log/bixtx-agent.log  (grows forever)
PS installer:  AppStdout / AppStderr  to single file (grows forever)
You now have two independent log systems:
 
systemd/NSSM capturing stdout/stderr → unrotated file
 
winston inside the app → rotated files in  logs/ 
Fix: In the systemd unit, remove  StandardOutput=append:  and use  StandardOutput=journal  instead. Let winston handle all file logging. The app should log to  $AGENT_DIR/logs/  and winston-daily-rotate-file manages rotation.
For Windows (NSSM), set  AppStdout / AppStderr  to  NUL  and let winston handle files internally.
 android  in  os  Array
package.json:  "os": ["win32", "darwin", "linux", "android"] 
Node.js does not run natively on Android. The Android agent is a separate Kotlin project. This field will cause  npm install  to fail or warn on Android if someone tries.
Fix: Remove  "android"  from the  os  array.
🟡 Medium Severity
Missing Copy Exclusions
package.json: Contains  tests/ ,  coverage/ ,  jest.config.js ,  .eslintrc ,  package.json ,  package-lock.json 
Installers: Only exclude  install.sh ,  .md ,  .git ,  node_modules ,  dist 
The installer copies development artefacts to production targets.
Fix: Add to both installers:  # Bash
--exclude='package.json' \
--exclude='package-lock.json' \
--exclude='tests' \
--exclude='coverage' \
--exclude='jest.config.*' \
--exclude='.eslintrc*' \
--exclude='.gitignore' \
--exclude='tsconfig.json'
PowerShell
$exclude = @('install.sh','install.ps1','.env.example','*.md','.git',
             'node_modules','dist','dist-obf','package.json','package-lock.json',
             'tests','coverage','jest.config.*','.eslintrc*','.gitignore')
 .env  Written Before  npm install  — Fine, But Fragile
The  .env  is written before  dotenv  is installed. This is okay because  .env  is only read at runtime. However, if the agent crashes during  npm install  (e.g., disk full), the  .env  with secrets is already on disk.
Fix: Move  .env  write to after  npm install  succeeds, inside the  try  block.      Recommended package.json Cleanup
If you stick with source install (Model A), clean up  package.json  to match what the installers actually do:  {
  "name": "bixtx-link-agent",
  "version": "4.7.2",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "NODE_ENV=development LOG_LEVEL=debug node src/index.js",
    "lint": "eslint src/ --ext .js --max-warnings 0",
    "test": "jest --testTimeout=10000 --forceExit",
    "clean": "rm -rf coverage node_modules"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "better-sqlite3": "^9.4.3",
    "clipboardy": "^4.0.0",
    "dotenv": "^16.4.5",
    "keylogger": "^1.0.2",
    "node-cron": "^3.0.3",
    "node-machine-id": "^1.1.12",
    "screenshot-desktop": "^1.15.0",
    "systeminformation": "^5.22.11",
    "uuid": "^10.0.0",
    "winston": "^3.14.2",
    "winston-daily-rotate-file": "^5.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "eslint": "^8.57.0",
    "jest": "^29.7.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "os": ["win32", "darwin", "linux"]
}
If you switch to pkg binaries (Model B), keep the  pkg ,  build:* , and  obfuscate  scripts, but modify the installers to copy from  dist/  instead of  src/ .
Bottom line: The installers and  package.json  are currently built for different deployment models. Pick one model, then align both files to it.     5 Critical Fixes Required
Sheets
#
Fix
File
1
Remove PM2 scripts — conflicts with systemd/NSSM
 package.json 
2
Remove  install-service  script — conflicts with bash/PS installers
 package.json 
3
Remove  "android"  from  os  — Node doesn't run on Android
 package.json 
4
Add copy exclusions — stop shipping tests, coverage, package.json to targets
 install.sh  +  install.ps1 
5
Fix native modules — either pre-compile  .node  binaries or remove  --ignore-scripts 
Build process
Corrected package.json (Source Install Model)
This version matches what your installers actually do. Removed:  pkg ,  bytenode ,  obfuscate ,  pm2 ,  install-service ,  rotate-logs ,  postinstall .   {
  "name": "bixtx-link-agent",
  "version": "4.7.2",
  "description": "bixtx.com Link Agent — Silent background monitoring and remote access agent.",
  "main": "src/index.js",
  "bin": {
    "bixtx-agent": "src/index.js"
  },
  "scripts": {
    "start": "node src/index.js",
    "dev": "NODE_ENV=development LOG_LEVEL=debug node src/index.js",
    "lint": "eslint src/ --ext .js --max-warnings 0",
    "audit:deps": "npm audit --audit-level=moderate",
    "test": "jest --testTimeout=10000 --forceExit",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "clean": "rm -rf coverage node_modules"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "better-sqlite3": "^9.4.3",
    "clipboardy": "^4.0.0",
    "dotenv": "^16.4.5",
    "keylogger": "^1.0.2",
    "node-cron": "^3.0.3",
    "node-machine-id": "^1.1.12",
    "screenshot-desktop": "^1.15.0",
    "systeminformation": "^5.22.11",
    "uuid": "^10.0.0",
    "winston": "^3.14.2",
    "winston-daily-rotate-file": "^5.0.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "node-gyp": "^10.1.0"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"],
    "coverageDirectory": "coverage"
  },
  "eslintConfig": {
    "env": { "node": true, "es2022": true },
    "rules": { "no-console": "warn", "no-unused-vars": "error" }
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "os": ["win32", "darwin", "linux"]
}
rsync -a \
  --exclude='install.sh' \
  --exclude='install.ps1' \
  --exclude='.env.example' \
  --exclude='*.md' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='dist-obf' \
  --exclude='package.json' \
  --exclude='package-lock.json' \
  --exclude='tests' \
  --exclude='coverage' \
  --exclude='jest.config.*' \
  --exclude='.eslintrc*' \
  --exclude='.gitignore' \
  --exclude='tsconfig.json' \
  "$SRC_DIR/" "$AGENT_DIR/"
$exclude = @(
  'install.sh','install.ps1','.env.example','*.md','.git',
  'node_modules','dist','dist-obf',
  'package.json','package-lock.json',
  'tests','coverage','jest.config.*','.eslintrc*','.gitignore','tsconfig.json'
)
Get-ChildItem -Path $srcDir -Exclude $exclude | Copy-Item -Recurse -Force -Destination $AgentDir

Pre-compile on your build machine, then ship the  .node  files in  src/  alongside the JS

Remove  --ignore-scripts  (security risk — allows arbitrary post-install code)

Switch to  pkg  binaries