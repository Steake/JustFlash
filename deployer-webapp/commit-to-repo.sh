#!/bin/bash

# Script to commit the deployment dashboard to Steake/JustFlash repository
# This will create a deployment-dashboard directory at the top level

echo "============================================"
echo "🚀 JustFlash Deployment Dashboard"
echo "   Committing to Steake/JustFlash Repository"
echo "============================================"
echo ""

# Set repository URL
REPO_URL="https://github.com/Steake/JustFlash.git"
DASHBOARD_DIR="deployment-dashboard"

# Step 1: Clone or navigate to repository
echo "📁 Setting up repository structure..."
if [ ! -d "JustFlash/. git" ]; then
    echo "📥 Cloning JustFlash repository..."
    git clone $REPO_URL
    cd JustFlash
else
    echo "📂 Repository exists, updating..."
    cd JustFlash
    git pull origin master
fi

# Step 2: Create deployment dashboard directory
echo "🏗️ Creating deployment dashboard directory..."
mkdir -p $DASHBOARD_DIR

# Step 3: Create all necessary files and directories
echo "📝 Creating project structure..."

# Create directory structure
mkdir -p $DASHBOARD_DIR/src/lib/components/ops
mkdir -p $DASHBOARD_DIR/src/lib/stores
mkdir -p $DASHBOARD_DIR/src/lib/types
mkdir -p $DASHBOARD_DIR/src/routes
mkdir -p $DASHBOARD_DIR/netlify/functions
mkdir -p $DASHBOARD_DIR/docs
mkdir -p $DASHBOARD_DIR/. github/workflows
mkdir -p $DASHBOARD_DIR/public

# Step 4: Create all files
echo "📄 Creating dashboard files..."

# Create package.json
cat > $DASHBOARD_DIR/package.json << 'EOF'
{
  "name": "justflash-deployment-dashboard",
  "version":  "1.0.0",
  "private": true,
  "scripts":  {
    "dev": "vite dev",
    "build":  "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write .",
    "deploy": "netlify deploy --prod"
  },
  "devDependencies": {
    "@netlify/functions": "^2.4.1",
    "@sveltejs/adapter-netlify": "^3.0.1",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "@types/d3": "^7.4.3",
    "@types/eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-svelte": "^2.35.0",
    "postcss": "^8.4.32",
    "prettier": "^3.1.1",
    "prettier-plugin-svelte":  "^3.1.2",
    "svelte": "^4.2.7",
    "svelte-check": "^3.6.0",
    "tailwindcss": "^3.3.0",
    "tslib": "^2.4.1",
    "typescript":  "^5.0.0",
    "vite": "^5.0.3",
    "vitest": "^1.1.3"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "@tanstack/svelte-query":  "^5.17.0",
    "chart.js":  "^4.4.1",
    "chartjs-adapter-date-fns": "^3.0.0",
    "d3": "^7.8.5",
    "date-fns": "^3.0.0",
    "ethers": "^6.9.0",
    "svelte-chartjs": "^3.1.2",
    "svelte-motion": "^0.12.2",
    "viem": "^1.19.0",
    "ws": "^8.16.0",
    "zod": "^3.22.4"
  },
  "type": "module"
}
EOF

# Create netlify.toml
cat > $DASHBOARD_DIR/netlify. toml << 'EOF'
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
EOF

# Create svelte.config.js
cat > $DASHBOARD_DIR/svelte.config.js << 'EOF'
import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      edge: false,
      split: false
    }),
    alias: {
      '$lib': './src/lib',
      '$components': './src/lib/components',
      '$stores': './src/lib/stores',
      '$utils': './src/lib/utils'
    }
  }
};

export default config;
EOF

# Create vite.config.js
cat > $DASHBOARD_DIR/vite.config.js << 'EOF'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: ['chart.js', 'ethers', 'date-fns', 'd3']
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    sourcemap: true
  }
});
EOF

# Create tsconfig. json
cat > $DASHBOARD_DIR/tsconfig.json << 'EOF'
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule":  true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "node",
    "module": "esnext",
    "target": "esnext",
    "lib": ["esnext", "dom", "dom.iterable"],
    "types": ["vite/client"],
    "paths": {
      "$lib":  ["./src/lib"],
      "$lib/*": ["./src/lib/*"]
    }
  }
}
EOF

# Create README.md for dashboard
cat > $DASHBOARD_DIR/README.md << 'EOF'
# JustFlash Deployment Dashboard

A comprehensive mainnet deployment management system for JustFlash protocol.

## Features

- 🚀 Smart contract deployment pipeline
- 📊 Real-time monitoring and analytics
- 🔐 Multi-signature wallet integration
- 📈 Marketing campaign tracker
- 🤝 Business development pipeline
- 🚨 Emergency response system
- 💧 Liquidity operations management
- ⛽ Gas optimization monitoring

## Quick Start

```bash
# Navigate to dashboard directory
cd deployment-dashboard

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build