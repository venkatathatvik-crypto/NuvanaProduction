# Nuvana360 - Progressive Web App (PWA) Guide

## 📱 What is a PWA?

A Progressive Web App (PWA) is a web application that can be installed on your device like a native app. It offers:

- ✅ **Offline Access** - Works without internet connection
- ✅ **Fast Loading** - Cached assets load instantly
- ✅ **App-like Experience** - Looks and feels like a native app
- ✅ **No App Store** - Install directly from your browser
- ✅ **Automatic Updates** - Always get the latest version
- ✅ **Small Size** - Much smaller than traditional apps

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI globally:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory:**
   ```bash
   cd c:\Users\tfort\OneDrive\Documents\nuvana-web\aura-studenthub
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy: `Y`
   - Scope: Select your account
   - Link to existing project: `N`
   - Project name: `nuvana360` (or your choice)
   - Directory: `./` (default)
   - Override settings: `N`

5. **Your app will be live at:** `https://nuvana360.vercel.app` (or similar)

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Build your project:**
   ```bash
   npm run build
   ```

4. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

### Option 3: GitHub Pages + GitHub Actions

1. **Create a GitHub repository** and push your code

2. **Add a workflow file** at `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - uses: actions/setup-node@v2
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

3. **Enable GitHub Pages** in repository settings

---

## 📲 Installing on Your Phone

### For Android (Chrome/Edge)

1. **Open the deployed website** in Chrome or Edge browser
2. **Look for the install prompt** at the bottom of the screen (our custom InstallPWA component)
3. **Click "Install App"** button
4. **OR** tap the menu (⋮) → "Add to Home Screen" or "Install app"
5. **Confirm** the installation
6. **The app icon** will appear on your home screen

### For iPhone/iPad (Safari)

1. **Open the deployed website** in Safari browser
2. **Tap the Share button** (square with arrow pointing up)
3. **Scroll down** and tap "Add to Home Screen"
4. **Customize the name** if desired
5. **Tap "Add"** in the top right
6. **The app icon** will appear on your home screen

### For Desktop (Chrome/Edge/Safari)

1. **Open the deployed website** in your browser
2. **Look for the install icon** in the address bar (usually on the right)
3. **Click the install icon** or use our custom install prompt
4. **Confirm** the installation
5. **The app** will open in its own window

---

## 🛠️ Build Configuration

### Vite Configuration for PWA

If you need to customize the build, update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Ensure service worker is included
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
```

---

## 🔧 Testing PWA Features Locally

1. **Build the production version:**
   ```bash
   npm run build
   ```

2. **Preview the build:**
   ```bash
   npm run preview
   ```

3. **Open Chrome DevTools** (F12)
4. **Go to Application tab** → Manifest / Service Workers
5. **Check:**
   - ✅ Manifest is loaded correctly
   - ✅ Service Worker is registered
   - ✅ Install prompt appears

---

## 📊 PWA Features Checklist

✅ **Manifest.json** - App metadata and icons
✅ **Service Worker** - Offline caching
✅ **HTTPS** - Required for PWA (automatic on Vercel/Netlify)
✅ **Responsive Design** - Works on all screen sizes
✅ **Theme Color** - Purple (#8b5cf6) to match app
✅ **Install Prompt** - Custom install button
✅ **Offline Support** - Cached assets work offline
✅ **App Icons** - Using your logo
✅ **Standalone Display** - Opens like a native app

---

## 🌐 Updating Your PWA

When you make changes:

1. **Redeploy** using your chosen method (Vercel/Netlify)
2. **Service worker** will detect the update
3. **Users** will be prompted to refresh for new version
4. **Automatic** update happens seamlessly

---

## 🔒 Security Notes

- ✅ PWAs require HTTPS (enforced by deployment platforms)
- ✅ Service workers only work on secure origins
- ✅ User data is stored client-side (IndexedDB/LocalStorage)
- ✅ Always validate user input on backend (Supabase)

---

## 📱 Supported Browsers

| Browser | Android | iOS | Desktop |
|---------|---------|-----|---------|
| Chrome  | ✅ Full | ❌  | ✅ Full |
| Safari  | ❌      | ✅ Partial* | ✅ Full |
| Edge    | ✅ Full | ❌  | ✅ Full |
| Firefox | ⚠️ Partial | ❌  | ⚠️ Partial |

*iOS Safari has some PWA limitations but core features work

---

## 🎯 Quick Start Deploy Now

**Fastest way to deploy:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd c:\Users\tfort\OneDrive\Documents\nuvana-web\aura-studenthub
vercel --prod

# 3. Visit the URL shown
# 4. Install on your phone using browser's "Add to Home Screen"
```

**Your app will be live in less than 2 minutes!**

---

## 🆘 Troubleshooting

### Install button doesn't appear?
- Check if site is HTTPS
- Clear browser cache
- Check DevTools → Application → Manifest

### Service Worker not registering?
- Check browser console for errors
- Ensure you're on HTTPS
- Try incognito/private mode

### App not working offline?
- Wait for first cache to complete
- Check DevTools → Application → Cache Storage
- Verify service-worker.js is loaded

---

## 📞 Support

For issues or questions:
- Check browser console for errors
- Test in Chrome DevTools → Lighthouse (PWA audit)
- Verify manifest.json is accessible at `/manifest.json`

---

**Congratulations! Your Nuvana360 app is now installable on any device! 🎉**
