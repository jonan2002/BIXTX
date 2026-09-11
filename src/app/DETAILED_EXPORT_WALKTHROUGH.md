# bixtx.com - Detailed Export Walkthrough

## 🎯 Complete Step-by-Step Export Process

### PART 1: Understanding What You Have

Your bixtx.com application is built with:
- **React** - JavaScript framework for building user interfaces
- **TypeScript** - Adds type safety to JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework
- **Vite** - Modern build tool (faster than Create React App)
- **Radix UI** - Headless UI components

**Current State**: Your app works in Figma Make's environment, but to export it, you need to set it up in a standard React development environment.

---

## PART 2: Setting Up Your Local Environment

### Step 1: Install Node.js (If Not Already Installed)

**Download Node.js**: https://nodejs.org/
- Get the LTS (Long Term Support) version
- This installs both Node.js and npm (package manager)

**Verify installation:**
```bash
node --version    # Should show v18 or higher
npm --version     # Should show v9 or higher
```

---

### Step 2: Create Your Project

Open your terminal/command prompt and run:

```bash
# Navigate to where you want to create the project
cd Desktop  # or wherever you want it

# Create new React + TypeScript project
npm create vite@latest bixtx-ai -- --template react-ts

# This creates a folder called 'bixtx-ai' with basic setup
```

**What this does:**
- Creates a new folder called `bixtx-ai`
- Sets up React with TypeScript
- Configures Vite as the build tool
- Creates basic project structure

---

### Step 3: Navigate to Your Project

```bash
cd bixtx-ai
```

Now you're inside your new project folder.

---

## PART 3: Installing Dependencies

### Understanding package.json

The `package.json` file I created lists ALL the libraries your app needs. Think of it like a shopping list.

**Copy the package.json** I created into your project folder (replacing the existing one).

### Install Everything at Once

```bash
npm install
```

**What happens:**
- npm reads package.json
- Downloads all 40+ libraries
- Creates a `node_modules` folder (this will be LARGE - 200+ MB)
- This takes 2-5 minutes depending on your internet

**Common packages installed:**
- `react` & `react-dom` - Core React
- `lucide-react` - Icons
- `@radix-ui/*` - UI components (dialogs, tabs, etc.)
- `tailwindcss` - Styling
- `sonner` - Toast notifications

---

## PART 4: Creating Configuration Files

### File 1: index.html (in root folder)

Create `index.html` in the root of your project:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>bixtx.com - Supreme Remote Access</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**What this does:**
- The `<div id="root">` is where React mounts your app
- The `<script>` tag loads your React code

---

### File 2: src/main.tsx

Create `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**What this does:**
- Imports React and your App component
- Imports global styles
- Mounts your app to the `#root` div in index.html

---

### File 3: vite.config.ts

Create `vite.config.ts` in the root:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
  },
})
```

**What this does:**
- Configures Vite build tool
- Sets up path aliases (so you can use `@/components` instead of `../../components`)
- Sets development server to port 3000
- Configures production builds to go into `dist` folder

---

### File 4: Update tsconfig.json

Open the existing `tsconfig.json` and add this to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
    // ... keep all other existing settings
  }
}
```

**What this does:**
- Tells TypeScript about the path aliases
- Allows imports like `import { Button } from '@/components/ui/button'`

---

## PART 5: Copying Your Files

### Understanding the Folder Structure

Your project should look like this:

```
bixtx-ai/
├── node_modules/          (created by npm install - DON'T TOUCH)
├── public/                (for images, icons, etc.)
├── src/
│   ├── components/
│   ├── contexts/
│   ├── utils/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Copying Files from Figma Make

You need to copy **all files** from these directories:

#### A. Copy Core Files

1. **Copy `/App.tsx`** 
   - From Figma Make to `src/App.tsx` in your new project

2. **Copy `/styles/globals.css`**
   - To `src/styles/globals.css` in your new project
   - Create the `styles` folder first if it doesn't exist

#### B. Copy Components (23 files)

Copy all these files to `src/components/`:

```
HomePage.tsx
LoginPage.tsx
AdminLoginPage.tsx
Dashboard.tsx
RemoteControl.tsx
SecurityDashboard.tsx
AdminConsole.tsx
ConnectionSetup.tsx
SessionManager.tsx
StorageSettings.tsx
OfflineRecording.tsx
AISecurityPanel.tsx
SystemHealthMonitor.tsx
SecurityDocumentation.tsx
MultiDeviceControl.tsx
WebRTCDashboard.tsx
WebRTCRemoteControl.tsx
RecordingsManager.tsx
NetworkDiscovery.tsx
AddDeviceByIP.tsx
DeviceScreen.tsx
Sidebar.tsx
AdminAlertSystem.tsx
WebRTCSettings.tsx
PermissionGuard.tsx
```

#### C. Copy UI Components (45 files)

Create folder: `src/components/ui/`

Copy ALL files from `/components/ui/` directory.

**Also copy the protected file:**
- Create folder: `src/components/figma/`
- Copy `/components/figma/ImageWithFallback.tsx`

#### D. Copy Context Files (2 files)

Create folder: `src/contexts/`

Copy:
- `ThemeContext.tsx`
- `WebRTCContext.tsx`

#### E. Copy Utility Files (8 files)

Create folder: `src/utils/`

Copy:
- `clipboard.ts`
- `featureDetection.ts`
- `initialization.ts`
- `permissions.ts`
- `securityCompliance.ts`
- `serviceWorker.ts`
- `webrtc.ts`
- `webrtcManager.ts`

---

## PART 6: Running Your App

### Start Development Server

```bash
npm run dev
```

**What happens:**
- Vite starts a local web server
- Your app compiles
- Opens at `http://localhost:3000`
- Hot reload enabled (changes appear instantly)

**You should see:**
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**Open your browser** to `http://localhost:3000` - you should see your bixtx.com app!

---

## PART 7: Building for Production

### Create Production Build

```bash
npm run build
```

**What happens:**
- TypeScript compiles to JavaScript
- Code gets minified (compressed)
- Assets get optimized
- Everything goes into `dist/` folder

**Output:**
```
vite v5.0.8 building for production...
✓ 1234 modules transformed.
dist/index.html                   0.45 kB
dist/assets/index-a1b2c3d4.css   45.23 kB
dist/assets/index-e5f6g7h8.js   234.56 kB
✓ built in 15.32s
```

### The `dist` Folder

After building, you'll have a `dist/` folder containing:
- `index.html` - Your HTML file
- `assets/` - Optimized CSS and JavaScript files

**This is what you deploy!** The `dist` folder is your complete website.

---

## PART 8: Deploying to the Web

### Option 1: Vercel (Easiest - Recommended)

**Step 1:** Go to https://vercel.com and sign up (free)

**Step 2:** Install Vercel CLI
```bash
npm install -g vercel
```

**Step 3:** Deploy
```bash
vercel
```

Follow the prompts:
- Link to your project? Yes
- Which directory? `./` (current directory)
- Build command? `npm run build`
- Output directory? `dist`

**Done!** Vercel gives you a URL like `bixtx-ai.vercel.app`

---

### Option 2: Netlify

**Step 1:** Go to https://netlify.com and sign up

**Step 2:** Install Netlify CLI
```bash
npm install -g netlify-cli
```

**Step 3:** Build your site
```bash
npm run build
```

**Step 4:** Deploy
```bash
netlify deploy --prod --dir=dist
```

**Done!** Netlify gives you a URL.

---

### Option 3: GitHub Pages (Free)

**Step 1:** Push your code to GitHub

**Step 2:** Install gh-pages
```bash
npm install -g gh-pages
```

**Step 3:** Update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/bixtx-ai/', // Your repo name
  // ... rest of config
})
```

**Step 4:** Add to package.json scripts:
```json
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}
```

**Step 5:** Deploy
```bash
npm run deploy
```

**Access at:** `https://yourusername.github.io/bixtx-ai/`

---

### Option 4: Traditional Web Host

**Step 1:** Build
```bash
npm run build
```

**Step 2:** Upload entire `dist` folder to your web host
- Use FTP client (FileZilla)
- Or hosting control panel file manager
- Upload to `public_html` or `www` directory

**Step 3:** Configure server
- Make sure server serves `index.html` for all routes
- Add `.htaccess` file (for Apache):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## PART 9: Troubleshooting Common Issues

### Issue 1: "Module not found" errors

**Cause:** File paths are incorrect

**Solution:**
```bash
# Check if file exists
ls src/components/HomePage.tsx

# Fix import paths in files
# Wrong: import { HomePage } from './HomePage'
# Right: import { HomePage } from './components/HomePage'
```

---

### Issue 2: "Cannot find module '@radix-ui/react-tabs'"

**Cause:** Missing dependency

**Solution:**
```bash
npm install @radix-ui/react-tabs
```

Or reinstall all:
```bash
rm -rf node_modules
npm install
```

---

### Issue 3: Tailwind styles not working

**Cause:** globals.css not imported correctly

**Solution:**
1. Check `src/main.tsx` has: `import './styles/globals.css'`
2. Check `globals.css` exists in `src/styles/`
3. Restart dev server: `Ctrl+C` then `npm run dev`

---

### Issue 4: "PORT 3000 already in use"

**Cause:** Another app using port 3000

**Solution:**
```bash
# Kill process on port 3000 (Mac/Linux)
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- --port 3001
```

---

### Issue 5: Build fails with TypeScript errors

**Cause:** Type errors in code

**Solution:**
```bash
# Check errors
npm run build

# Fix errors one by one, or temporarily:
# Add to tsconfig.json:
"noEmit": true,
"skipLibCheck": true
```

---

## PART 10: Understanding Your File Structure

### What Each Folder Does

**`/src/components/`** - React components
- Main UI building blocks
- Each file is a reusable piece of UI

**`/src/components/ui/`** - Reusable UI components
- Buttons, dialogs, inputs, etc.
- Based on Radix UI primitives

**`/src/contexts/`** - React Context providers
- Global state management
- ThemeContext = dark/light mode
- WebRTCContext = WebRTC connections

**`/src/utils/`** - Helper functions
- Reusable logic
- Not tied to UI
- Can be imported anywhere

**`/src/styles/`** - CSS files
- globals.css = Tailwind config + custom styles

**`/node_modules/`** - Downloaded libraries
- Created by `npm install`
- NEVER edit files here
- NEVER commit to git (huge folder)

**`/dist/`** - Production build output
- Created by `npm run build`
- This is what you deploy
- Gets recreated each build

---

## PART 11: Making Changes

### How to Edit Your App

1. **Find the component** you want to change
   - Homepage? Edit `src/components/HomePage.tsx`
   - Security Dashboard? Edit `src/components/SecurityDashboard.tsx`

2. **Make your changes**
   - Edit the file in your code editor

3. **See changes instantly**
   - If dev server is running (`npm run dev`)
   - Changes appear in browser immediately

4. **Build when done**
   ```bash
   npm run build
   ```

### Example: Changing App Title

**Edit `index.html`:**
```html
<title>My Custom Title</title>
```

**Edit `src/components/HomePage.tsx`:**
Find the heading and change the text.

---

## PART 12: Git Version Control (Optional but Recommended)

### Initialize Git

```bash
git init
git add .
git commit -m "Initial bixtx.com project"
```

### Create .gitignore

Create `.gitignore` file:
```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

### Push to GitHub

```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/yourusername/bixtx-ai.git
git branch -M main
git push -u origin main
```

---

## PART 13: Environment Variables (Optional)

### Create .env file

For API keys, settings, etc:

```bash
# Create .env in root
VITE_APP_NAME=bixtx.com
VITE_API_URL=https://api.example.com
VITE_STUN_SERVER=stun:stun.l.google.com:19302
```

### Use in code

```typescript
const appName = import.meta.env.VITE_APP_NAME
const apiUrl = import.meta.env.VITE_API_URL
```

**Important:**
- Prefix with `VITE_` for Vite to include them
- Don't commit `.env` to git (add to .gitignore)
- Create `.env.example` with dummy values for others

---

## 📋 Final Checklist

- [ ] Node.js installed
- [ ] Project created with Vite
- [ ] Dependencies installed (`npm install`)
- [ ] Configuration files created
- [ ] All component files copied
- [ ] All UI components copied
- [ ] All context files copied
- [ ] All utility files copied
- [ ] Styles copied
- [ ] Dev server runs (`npm run dev`)
- [ ] App loads in browser
- [ ] All pages accessible
- [ ] Production build works (`npm run build`)
- [ ] Deployed to hosting platform
- [ ] Live site tested

---

## 🎉 You're Done!

Your bixtx.com app is now:
- ✅ Running locally
- ✅ Built for production
- ✅ Deployed to the web
- ✅ Ready for users

---

## 📞 Need Help?

Common commands reference:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package-name

# Remove package
npm uninstall package-name

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

**Last Updated:** November 23, 2025
**Difficulty Level:** Beginner to Intermediate
**Estimated Time:** 30-60 minutes for complete setup
