#!/bin/bash

echo "🔍 Running pre-deployment checks..."

# Check for required files
echo "📋 Verifying required files..."

required_files=(
    "package.json"
    "netlify.toml"
    "svelte.config.js"
    "vite.config.js"
    "tsconfig.json"
    ".env. example"
    "README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run build test
echo "🏗️ Testing build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed.  Please fix errors before deploying."
    exit 1
fi

# Check environment variables
echo "🔐 Checking environment setup..."
if [ !  -f ".env. local" ]; then
    echo "⚠️ Warning: .env.local not found.  Creating from template..."
    cp .env.example .env.local
    echo "📝 Please update .env.local with your actual values"
fi

echo "✅ All checks passed! Ready for deployment."