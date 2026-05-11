# Security Setup Guide

## 🚨 CRITICAL: First-Time Setup

### 1. Secure Your Environment Variables

**IMPORTANT:** The `.env` file contains sensitive credentials and should NEVER be committed to version control.

#### Steps:
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual credentials in `.env`:
   ```env
   VITE_SUPABASE_PROJECT_ID=your_actual_project_id
   VITE_SUPABASE_PUBLISHABLE_KEY=your_actual_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SPREADSHEET_ID=your_spreadsheet_id
   ```

3. Verify `.env` is in `.gitignore`:
   ```bash
   grep -q "^\.env$" .gitignore && echo "✅ .env is ignored" || echo "❌ Add .env to .gitignore"
   ```

### 2. Remove Exposed Credentials from Git History

If `.env` was previously committed, you MUST remove it from git history:

```bash
# Using git filter-branch (for small repos)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Or using BFG Repo-Cleaner (recommended for large repos)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 3. Rotate All Exposed Credentials

If credentials were exposed in git history:

1. **Supabase:**
   - Go to Supabase Dashboard → Settings → API
   - Generate new API keys
   - Update `.env` with new keys
   - Update production environment variables

2. **Google Sheets API:**
   - Go to Google Cloud Console
   - Revoke old API key
   - Create new API key
   - Update `.env` and Supabase secrets

### 4. Update Production Environment Variables

For Vercel deployment:
```bash
vercel env add VITE_SUPABASE_PROJECT_ID
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SPREADSHEET_ID
```

For other platforms, use their respective CLI or dashboard.

---

## 🔒 Security Checklist

### Before Deployment
- [ ] `.env` is in `.gitignore`
- [ ] No secrets in git history
- [ ] All credentials rotated if exposed
- [ ] Production environment variables set
- [ ] CORS configured for production domain
- [ ] Security headers enabled
- [ ] Dependencies updated (`npm audit`)
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured
- [ ] Error messages don't leak info

### Regular Maintenance
- [ ] Run `npm audit` weekly
- [ ] Update dependencies monthly
- [ ] Review access logs monthly
- [ ] Rotate credentials quarterly
- [ ] Security audit annually
- [ ] Backup database weekly
- [ ] Test disaster recovery quarterly

---

## 🛡️ Security Features Implemented

### Authentication
- ✅ Strong password requirements (12+ chars, mixed case, numbers, special chars)
- ✅ Rate limiting (5 attempts per 15 minutes)
- ✅ JWT token expiration (1 hour)
- ✅ Email verification required
- ✅ Admin approval required
- ✅ Bcrypt password hashing

### Frontend Security
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection enabled
- ✅ Referrer policy configured
- ✅ Input validation with Zod
- ✅ Output sanitization

### API Security
- ✅ JWT authentication on all endpoints
- ✅ CORS properly configured
- ✅ Rate limiting on auth endpoints
- ✅ Input validation
- ✅ Error handling (no info leakage)
- ✅ Parameterized queries (SQL injection prevention)

### Data Protection
- ✅ HTTPS enforced
- ✅ Passwords hashed with bcrypt
- ✅ Sensitive data encrypted at rest
- ✅ Secure session management
- ✅ Token expiration

---

## 🔧 Development Security

### Install Security Tools
```bash
# Install security linting
npm install --save-dev eslint-plugin-security

# Install git-secrets (prevents committing secrets)
brew install git-secrets  # macOS
# or
apt-get install git-secrets  # Linux

# Configure git-secrets
git secrets --install
git secrets --register-aws
```

### Run Security Checks
```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for high severity only
npm audit --audit-level=high

# Generate detailed report
npm audit --json > audit-report.json
```

### Pre-commit Hook
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Check for secrets
git secrets --pre_commit_hook -- "$@"

# Run security audit
npm audit --audit-level=high

# Check for .env file
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo "❌ Error: Attempting to commit .env file!"
    exit 1
fi

echo "✅ Security checks passed"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🚨 Emergency Response

### If Credentials Are Exposed

1. **Immediate (within 1 hour):**
   ```bash
   # Revoke all tokens
   # Rotate all credentials
   # Remove from git history
   # Force push (if private repo)
   git push --force --all
   ```

2. **Notify:**
   - Security team
   - All developers
   - Affected users (if applicable)

3. **Document:**
   - What was exposed
   - When it was exposed
   - Who had access
   - Actions taken

### If Breach Detected

1. **Isolate:**
   - Disable affected accounts
   - Block suspicious IPs
   - Enable additional logging

2. **Investigate:**
   - Review access logs
   - Identify attack vector
   - Assess damage

3. **Remediate:**
   - Patch vulnerabilities
   - Reset all credentials
   - Deploy fixes

4. **Report:**
   - Document incident
   - Notify authorities (if required)
   - Update security measures

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Web Security Checklist](https://github.com/virajkulkarni14/WebDeveloperSecurityChecklist)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## 📞 Support

For security issues:
- Email: security@example.com
- Emergency: Call security team directly
- Report vulnerabilities: See SECURITY.md

---

**Remember:** Security is everyone's responsibility. When in doubt, ask!