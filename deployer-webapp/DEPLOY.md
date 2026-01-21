# Deploying to Netlify

## Prerequisites
- Git repository pushed to GitHub
- Netlify account (free tier is sufficient)
- Environment variables configured

## Step 1: Push to GitHub
```bash
# If not already initialized
git init

# Add all files
git add . 

# Commit
git commit -m "Deploy JustFlash Deployment Dashboard to Netlify"

# Add remote (replace with your repository)
git remote add origin https://github.com/Steake/JustFlash. git

# Push to master
git push -u origin master
```

## Step 2: Connect to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub"
4. Authorize Netlify to access your GitHub
5. Select the `JustFlash` repository
6. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**:  `build`
   - **Functions directory**: `netlify/functions`

## Step 3: Environment Variables

In Netlify dashboard:
1. Go to Site Settings → Environment Variables
2. Add the following variables: 

```env
PUBLIC_RPC_URL=your_alchemy_or_infura_url
PUBLIC_CHAIN_ID=1
PUBLIC_NETWORK_NAME=mainnet
VITE_WS_URL=wss://your-websocket-url
```

## Step 4: Custom Domain (Optional)

1. Go to Domain Settings
2. Add custom
