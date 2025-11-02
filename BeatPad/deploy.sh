#!/bin/bash

echo "🚀 Deploying Beat Pad to Vercel..."
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel"
    echo "Please run: vercel login"
    echo ""
    exit 1
fi

# Deploy
echo "📦 Deploying to production..."
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo "Your Beat Pad is now live!"

