#!/bin/bash

echo "Verifying project structure..."

# Required directories
directories=(
  "src/lib/components"
  "src/lib/stores"
  "src/lib/types"
  "src/lib/utils"
  "src/routes"
  "netlify/functions"
  "docs"
  ". github/workflows"
)

# Required files
files=(
  "package.json"
  "netlify.toml"
  "svelte.config.js"
  "vite.config.js"
  "tsconfig.json"
  "tailwind.config.js"
  "postcss.config.js"
  "README.md"
)

# Create missing directories
for dir in "${directories[@]}"; do
  if [ !  -d "$dir" ]; then
    echo "Creating directory: $dir"
    mkdir -p "$dir"
  fi
done

# Check for missing files
missing_files=()
for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    missing_files+=("$file")
  fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
  echo "✅ All required files present"
else
  echo "⚠️ Missing files:"
  printf '%s\n' "${missing_files[@]}"
fi