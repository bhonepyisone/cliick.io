# 🔐 Secrets Protection Guide

This document outlines the multi-layer protection system to prevent secrets from being exposed on GitHub.

## What Happened

Your `.env` files containing sensitive credentials were accidentally committed to GitHub:
- ✅ **Supabase Service Role Key** - ROTATED
- ✅ **Google Gemini API Key** - ROTATED  
- ✅ **Facebook App Secret** - SHOULD BE ROTATED

## Protection Layers

### 1. `.gitignore` - First Defense Line

**Updated entries in `.gitignore`:**
```
# Environment variables - NEVER commit actual values
.env
.env.local
.env.*.local
.env.production
.env.staging
backend/.env
backend/.env.local
backend/.env.*.local
backend/.env.production
backend/.env.staging

# Secrets and credentials
*.pem
*.key
*.jks
*.p12
*.pfx
*.key.json
secrets/
.secrets/
credentials.json
*.credentials
private_keys/
```

**What it does:** Prevents Git from tracking these files.

### 2. Pre-Commit Hooks - Second Defense Line

**Files created:**
- `.git/hooks/pre-commit` (Bash version for macOS/Linux)
- `.git/hooks/pre-commit.ps1` (PowerShell version for Windows)

**What they do:** 
- Scan staged files for secret patterns before commit
- Block commits containing:
  - `.env` files
  - API keys, secret keys, tokens
  - Service-specific credentials (Supabase, Gemini, Stripe, AWS, Firebase, etc.)
  - Private keys (`.pem`, `.key`, `.jks`, etc.)

**How to activate on Windows:**
```powershell
# Configure Git to use PowerShell for hooks
git config core.hooksPath .git/hooks
git config core.executionPolicy -Scope CurrentUser RemoteSigned

# Make the hook executable
icacls .git\hooks\pre-commit.ps1 /grant:r "%USERNAME%:F"
```

**How to activate on macOS/Linux:**
```bash
# Make the bash hook executable
chmod +x .git/hooks/pre-commit
```

### 3. Environment Variable Best Practices

**DO:**
```javascript
// ✅ CORRECT: Load from environment
const apiKey = process.env.GEMINI_API_KEY;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ CORRECT: Load from .env file (NOT committed)
require('dotenv').config();
```

**DON'T:**
```javascript
// ❌ WRONG: Hardcoded secrets
const apiKey = "AIzaSyBVWomwDA9rH1wpuM22pLpC4NAiTZaU-ck";

// ❌ WRONG: Secrets in code
const secrets = {
  supabaseKey: "sb_secret_xxx",
  geminiKey: "AIzaSy..."
};

// ❌ WRONG: Secrets in config files
module.exports = {
  apiKey: "AIzaSy...",
  secret: "sk_test_..."
};
```

### 4. .env File Structure

**`.env` (LOCAL ONLY - Never commit):**
```bash
# This file contains REAL secrets
# Keep it locally only, add to .gitignore
SUPABASE_URL=https://klfjdplshshqkhjnfzrq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ACTUAL_KEY_HERE
GEMINI_API_KEY=AIzaSy_ACTUAL_KEY_HERE
FACEBOOK_APP_SECRET=EAATwmeXGAQMBQI6_ACTUAL_SECRET_HERE
```

**`.env.example` (COMMITTED - Safe template):**
```bash
# This file is a TEMPLATE only with placeholder values
# Commit this to Git, never commit actual secrets
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_key_here
GEMINI_API_KEY=your_gemini_api_key_here
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

### 5. Folder Structure Best Practice

```
project/
├── .env                    # ❌ NEVER commit - local secrets only
├── .env.example            # ✅ COMMIT - safe template with placeholders
├── backend/
│   ├── .env                # ❌ NEVER commit - local secrets only
│   ├── .env.example        # ✅ COMMIT - safe template
│   └── ...
├── .gitignore              # ✅ COMMIT - includes .env patterns
├── .git/hooks/
│   ├── pre-commit          # ✅ COMMIT - Linux/macOS hook
│   └── pre-commit.ps1      # ✅ COMMIT - Windows hook
└── ...
```

## Workflow Checklist

Before committing secrets or files:

- [ ] Are you committing `.env` files? → **STOP - This is blocked by pre-commit hook**
- [ ] Do your code files contain hardcoded secrets? → **STOP - Use environment variables instead**
- [ ] Is your `.gitignore` including all `.env*` files? → **Check and verify**
- [ ] Are you using `process.env.VARIABLE_NAME` in code? → **YES - This is correct**
- [ ] Is your `.env.example` file using only placeholder values? → **YES - Never use real secrets here**

## How Pre-Commit Hook Works

When you run `git commit`:

1. **Hook automatically runs** before commit is created
2. **Scans all staged files** for:
   - `.env` files → ❌ BLOCKED
   - Secret patterns (api_key, secret_key, etc.) → ❌ BLOCKED if found
   - Hardcoded credentials → ❌ BLOCKED if found
3. **If secrets detected:**
   ```
   ❌ BLOCKED: Potential secret found in backend/server.js
      Pattern: api_key
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚠️  COMMIT BLOCKED - SECRETS DETECTED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
4. **If no secrets found:**
   ```
   🔍 Scanning for exposed secrets...
   ✓ No secrets detected - safe to commit
   ```

## Emergency: Bypass Pre-Commit Hook

**Only use if absolutely necessary (not recommended):**

```bash
git commit --no-verify
```

**Why it's dangerous:** Bypasses all security checks. Only use if you're 100% sure the code is safe.

## Secrets That Should Be Rotated

**Already rotated:**
- ✅ Supabase Service Role Key
- ✅ Google Gemini API Key

**Should rotate (were in exposed commit):**
- ❓ Facebook App Secret (check line 32 in previous `.env`)

**Rotation Steps:**

### Supabase
1. Go to https://app.supabase.com
2. Settings → API → Service Role Key
3. Click "Regenerate" 
4. Update your `.env` file with new key

### Google Gemini
1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials
3. Find your API key → Regenerate
4. Update your `.env` file with new key

### Facebook
1. Go to https://developers.facebook.com
2. Apps → Your App → Settings → Basic
3. Regenerate App Secret
4. Update your `.env` file with new secret

## Continuous Monitoring

### GitHub Secret Scanning
GitHub automatically scans your repository for secrets:
1. Go to your repo Settings → Security & analysis
2. Enable "Secret scanning" 
3. Enable "Push protection" (blocks pushes with secrets)

### Third-party Tools
Consider adding tools to your CI/CD pipeline:
- **TruffleHog** - Scans for secrets in Git history
- **Gitleaks** - Finds secrets in Git repositories
- **git-secrets** - Prevents accidental commits of secrets

## Additional Resources

- [GitHub Secret Scanning Documentation](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP: Secrets Management](https://owasp.org/www-project-secrets-management/)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Environment Variables Best Practices](https://12factor.net/config)

## Questions?

If you see the pre-commit hook blocking a commit:
1. **Remove the secret** from your code/file
2. **Use `.env` file** to store the actual secret
3. **Update `.env.example`** with placeholder if needed
4. Try committing again

The hook is protecting your security. Follow its guidance! 🛡️
