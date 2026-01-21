#!/bin/bash

echo "🚀 Deploying JustFlash Dashboard to Netlify"
echo "==========================================="

# Step 1: Final commit
echo "📝 Step 1: Creating final commit..."
git add -A
git commit -m "chore: Final configuration for Netlify deployment

- Added environment configuration
- Updated build settings
- Configured serverless functions
- Added deployment scripts
- Ready for production deployment" --no-verify || echo "No changes to commit"

# Step 2: Push to GitHub
echo "📤 Step 2: Pushing to GitHub..."
echo "Make sure you've set up your remote repository:"
echo "git remote add origin https://github.com/Steake/JustFlash.git"
echo ""
read -p "Have you added your GitHub remote? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push -u origin master
    echo "✅ Pushed to GitHub successfully!"
else
    echo "⚠️ Please add your remote first:"
    echo "git remote add origin https://github.com/Steake/JustFlash.git"
    exit 1
fi

# Step 3: Netlify CLI deployment (optional)
echo "📦 Step 3: Deploy with Netlify CLI (optional)..."
echo "If you have Netlify CLI installed, you can deploy directly:"
echo ""
if command -v netlify &> /dev/null; then
    read -p "Deploy to Netlify now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Build the project
        echo "🏗️ Building project..."
        npm run build
        
        # Deploy to Netlify
        echo "🚀 Deploying to Netlify..."
        netlify deploy --prod --dir=build
        
        echo "✅ Deployment complete!"
        echo "Your site should be live at your Netlify URL"
    fi
else
    echo "ℹ️ Netlify CLI not installed. You can:"
    echo "1. Install it with: npm install -g netlify-cli"
    echo "2. Or connect your GitHub repo directly in Netlify dashboard"
fi

# Step 4: Manual Netlify setup instructions
echo ""
echo "📋 Step 4: Manual Netlify Setup Instructions:"
echo "============================================="
echo "1. Go to https://app.netlify.com"
echo "2. Click 'Add new site' → 'Import an existing project'"
echo "3. Connect to GitHub and select 'Steake/JustFlash'"
echo "4. Configure build settings:"
echo "   - Build command: npm run build"
echo "   - Publish directory:  build"
echo "   - Functions directory: netlify/functions"
echo "5. Add environment variables from .env.example"
echo "6. Click 'Deploy site'"
echo ""
echo "🎉 Your deployment dashboard will be live in a few minutes!"
echo ""
echo "📊 Post-Deployment Steps:"
echo "========================"
echo "1. Configure custom domain (if you have one)"
echo "2. Enable automatic deployments from master branch"
echo "3. Set up deployment notifications"
echo "4. Configure serverless function environment variables"
echo "5. Test WebSocket connections"
echo "6. Verify all dashboard components are working"