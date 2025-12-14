#!/bin/bash

# Cliick.io Cloud Run Deployment Script

set -e  # Exit on error

echo "🚀 Cliick.io Cloud Run Deployment"
echo "=================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found in current directory"
    echo "Please run this script from the project root"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: No Google Cloud project configured"
    echo "Run: gcloud config set project YOUR-PROJECT-ID"
    exit 1
fi

echo "✅ Project: $PROJECT_ID"
echo ""

# Configuration
SERVICE_NAME="cliick-backend"
REGION="us-central1"
SUPABASE_URL="https://klfjdplshshqkhjnfzrq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZmpkcGxzaHNocWtoam5menJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIwNTA4NSwiZXhwIjoyMDgwNzgxMDg1fQ.xmcIIJT3Dwthr63Eyl23_cUblSfeQQrnt-tXhuOIfDw"
JWT_SECRET="5dddb6df6926d51e47aa3247f4f2c9b1b190d49f4112e105b4217fed6450f16c"
FRONTEND_URL="https://cliickio.vercel.app"

echo "📝 Configuration:"
echo "  Service: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Supabase: $SUPABASE_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# Confirm before deploying
read -p "Ready to deploy? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "🔨 Building and deploying to Cloud Run..."
echo ""

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s \
  --max-instances 100 \
  --set-env-vars \
    NODE_ENV=production,\
    SUPABASE_URL=$SUPABASE_URL,\
    SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,\
    JWT_SECRET=$JWT_SECRET,\
    FRONTEND_URL=$FRONTEND_URL

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')

echo ""
echo "🎉 Backend URL: $SERVICE_URL"
echo ""
echo "📋 Next steps:"
echo "1. Go to Vercel dashboard"
echo "2. Add environment variable: VITE_API_BASE_URL=$SERVICE_URL/api"
echo "3. Redeploy frontend"
echo "4. Test at: https://cliickio.vercel.app"
echo ""
echo "📊 View logs:"
echo "   gcloud run logs read $SERVICE_NAME --region $REGION --limit 50"
echo ""
echo "✨ Deployment complete!"
