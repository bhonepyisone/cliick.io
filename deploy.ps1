# Cliick.io Cloud Run Deployment Script (PowerShell)
param(
    [switch]$AutoYes = $false
)

Write-Host "🚀 Cliick.io Cloud Run Deployment" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI not installed" -ForegroundColor Red
    Write-Host "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check if Dockerfile exists
if (-not (Test-Path "Dockerfile")) {
    Write-Host "❌ Error: Dockerfile not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the project root"
    exit 1
}

# Get project ID
$projectId = gcloud config get-value project 2>$null
if (-not $projectId) {
    Write-Host "❌ Error: No Google Cloud project configured" -ForegroundColor Red
    Write-Host "Run: gcloud config set project YOUR-PROJECT-ID"
    exit 1
}

Write-Host "✅ Project: $projectId" -ForegroundColor Green
Write-Host ""

# Configuration
$serviceName = "cliick-backend"
$region = "us-central1"
$supabaseUrl = "https://klfjdplshshqkhjnfzrq.supabase.co"
$supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZmpkcGxzaHNocWtoam5menJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIwNTA4NSwiZXhwIjoyMDgwNzgxMDg1fQ.xmcIIJT3Dwthr63Eyl23_cUblSfeQQrnt-tXhuOIfDw"
$jwtSecret = "5dddb6df6926d51e47aa3247f4f2c9b1b190d49f4112e105b4217fed6450f16c"
$frontendUrl = "https://cliickio.vercel.app"

Write-Host "📝 Configuration:" -ForegroundColor Yellow
Write-Host "  Service: $serviceName"
Write-Host "  Region: $region"
Write-Host "  Supabase: $supabaseUrl"
Write-Host "  Frontend: $frontendUrl"
Write-Host ""

# Confirm before deploying
if (-not $AutoYes) {
    $response = Read-Host "Ready to deploy? (y/n)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔨 Building and deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host ""

# Build environment variables string
$envVars = @(
    "NODE_ENV=production",
    "SUPABASE_URL=$supabaseUrl",
    "SUPABASE_SERVICE_ROLE_KEY=$supabaseServiceRoleKey",
    "JWT_SECRET=$jwtSecret",
    "FRONTEND_URL=$frontendUrl"
) -join ','

# Deploy to Cloud Run
& gcloud run deploy $serviceName `
  --source . `
  --platform managed `
  --region $region `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --timeout 60s `
  --max-instances 100 `
  --set-env-vars $envVars

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Getting service URL..." -ForegroundColor Cyan

# Get service URL
$serviceUrl = gcloud run services describe $serviceName --region $region --format='value(status.url)'

Write-Host ""
Write-Host "🎉 Backend URL: $serviceUrl" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Vercel dashboard"
Write-Host "2. Add environment variable: VITE_API_BASE_URL=$serviceUrl/api"
Write-Host "3. Redeploy frontend"
Write-Host "4. Test at: https://cliickio.vercel.app"
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Yellow
Write-Host "   gcloud run logs read $serviceName --region $region --limit 50"
Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
