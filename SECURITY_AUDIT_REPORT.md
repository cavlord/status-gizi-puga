# Security Audit Report
**Date:** 2026-05-11  
**Project:** Status Gizi PUGA  
**Auditor:** Bob (Security Review)

## Executive Summary
This report identifies security vulnerabilities and provides recommendations for the Status Gizi PUGA application. The audit found **3 CRITICAL**, **5 HIGH**, and **4 MEDIUM** priority issues that need immediate attention.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **Exposed Sensitive Credentials in .env File**
**Severity:** CRITICAL  
**File:** `.env`  
**Issue:** The `.env` file contains sensitive Supabase credentials that are committed to the repository.

**Risk:**
- Public API keys exposed in version control
- Potential unauthorized access to Supabase project
- Database compromise if repository is public

**Recommendation:**
- Add `.env` to `.gitignore` immediately
- Rotate all exposed credentials (Supabase keys)
- Use environment variables in production
- Never commit `.env` files to version control

---

### 2. **Hardcoded Spreadsheet ID in Source Code**
**Severity:** CRITICAL  
**File:** `src/lib/googleSheets.ts` (line 3)  
**Issue:** Google Sheets spreadsheet ID is hardcoded in the source code.

```typescript
const SPREADSHEET_ID = '1o-Lok3oWtmGXaN5Q9CeFj4ji9WFOINYW3M_RBNBUw60';
```

**Risk:**
- Exposes internal data structure
- Makes it difficult to change spreadsheets
- Security through obscurity is not effective

**Recommendation:**
- Move to environment variable: `VITE_SPREADSHEET_ID`
- Implement proper access controls on the spreadsheet
- Consider using Supabase database instead of Google Sheets for sensitive data

---

### 3. **Missing .env from .gitignore**
**Severity:** CRITICAL  
**File:** `.gitignore`  
**Issue:** The `.env` file is NOT listed in `.gitignore`, allowing it to be committed.

**Risk:**
- Credentials leak into version control
- Historical commits may contain sensitive data
- Public repositories expose all secrets

**Recommendation:**
- Add `.env` to `.gitignore` immediately
- Remove `.env` from git history using `git filter-branch` or BFG Repo-Cleaner
- Audit git history for exposed secrets

---

## 🟠 HIGH PRIORITY VULNERABILITIES

### 4. **Weak Password Requirements**
**Severity:** HIGH  
**File:** `src/lib/validation.ts` (line 9-12)  
**Issue:** Password validation only requires 8 characters with no complexity requirements.

```typescript
export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(100, 'Password maksimal 100 karakter');
```

**Risk:**
- Weak passwords susceptible to brute force attacks
- No enforcement of special characters, numbers, or uppercase letters
- Increased risk of account compromise

**Recommendation:**
```typescript
export const passwordSchema = z
  .string()
  .min(12, 'Password minimal 12 karakter')
  .max(100, 'Password maksimal 100 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[0-9]/, 'Password harus mengandung angka')
  .regex(/[^A-Za-z0-9]/, 'Password harus mengandung karakter khusus');
```

---

### 5. **JWT Token Stored in localStorage**
**Severity:** HIGH  
**File:** `src/contexts/AuthContext.tsx` (line 26, 122)  
**Issue:** JWT tokens are stored in localStorage, vulnerable to XSS attacks.

**Risk:**
- XSS attacks can steal tokens
- No HttpOnly protection
- Tokens persist across sessions

**Recommendation:**
- Use HttpOnly cookies for token storage (requires backend changes)
- Implement token refresh mechanism
- Add CSRF protection
- Consider using secure session management

---

### 6. **No Content Security Policy (CSP)**
**Severity:** HIGH  
**File:** `index.html`, `vite.config.ts`  
**Issue:** No Content Security Policy headers configured.

**Risk:**
- Vulnerable to XSS attacks
- No protection against inline script injection
- Clickjacking vulnerabilities

**Recommendation:**
- Add CSP meta tag to `index.html`
- Configure security headers in production server
- Implement strict CSP policy

---

### 7. **CORS Allows All Origins**
**Severity:** HIGH  
**File:** Multiple Supabase functions (e.g., `supabase/functions/auth-login/index.ts` line 10)  
**Issue:** CORS headers allow all origins (`*`).

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // ...
};
```

**Risk:**
- Any website can make requests to your API
- CSRF attacks possible
- No origin validation

**Recommendation:**
```typescript
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'http://localhost:8080', // dev only
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}
```

---

### 8. **Insufficient Input Validation**
**Severity:** HIGH  
**File:** `src/lib/googleSheets.ts`, various components  
**Issue:** Limited input sanitization and validation on user inputs.

**Risk:**
- SQL injection (if raw queries used)
- XSS through unsanitized data display
- Data integrity issues

**Recommendation:**
- Implement comprehensive input validation
- Sanitize all user inputs before display
- Use parameterized queries
- Validate data types and ranges

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **Outdated Dependencies**
**Severity:** MEDIUM  
**File:** `package.json`  
**Issue:** Some dependencies may have known vulnerabilities.

**Recommendation:**
- Run `npm audit` to check for vulnerabilities
- Update dependencies regularly
- Use `npm audit fix` to auto-fix issues
- Consider using Dependabot or Renovate

---

### 10. **No Rate Limiting on Client Side**
**Severity:** MEDIUM  
**File:** `src/contexts/AuthContext.tsx`  
**Issue:** While server has rate limiting, client doesn't prevent rapid requests.

**Recommendation:**
- Add client-side rate limiting
- Implement exponential backoff
- Show user-friendly error messages

---

### 11. **Error Messages Leak Information**
**Severity:** MEDIUM  
**File:** Multiple files  
**Issue:** Detailed error messages may leak system information.

**Example:** `src/lib/googleSheets.ts` line 132
```typescript
throw new Error(errorData.error || `Server error: ${response.status}`);
```

**Recommendation:**
- Use generic error messages for users
- Log detailed errors server-side only
- Don't expose stack traces in production

---

### 12. **No Security Headers in Vite Config**
**Severity:** MEDIUM  
**File:** `vite.config.ts`  
**Issue:** Missing security headers configuration.

**Recommendation:**
- Add security headers plugin
- Configure HSTS, X-Frame-Options, X-Content-Type-Options
- Implement in production server configuration

---

## ✅ POSITIVE SECURITY PRACTICES

1. **Rate Limiting Implemented** - Server-side rate limiting on login attempts (5 attempts per 15 minutes)
2. **JWT Token Expiration** - Tokens expire after 1 hour
3. **Password Hashing** - Using bcrypt for password hashing
4. **Email Verification** - Requires email verification before login
5. **Admin Approval** - User accounts require admin approval
6. **Input Validation** - Using Zod for schema validation
7. **Prepared Statements** - Using Supabase client (prevents SQL injection)
8. **HTTPS Enforcement** - Supabase uses HTTPS by default

---

## 📋 IMMEDIATE ACTION ITEMS

### Priority 1 (Do Now):
1. ✅ Add `.env` to `.gitignore`
2. ✅ Remove `.env` from git history
3. ✅ Rotate all exposed Supabase credentials
4. ✅ Move hardcoded spreadsheet ID to environment variable
5. ✅ Strengthen password requirements

### Priority 2 (This Week):
6. ✅ Implement proper CORS configuration
7. ✅ Add Content Security Policy
8. ✅ Review and sanitize all user inputs
9. ✅ Add security headers
10. ✅ Update vulnerable dependencies

### Priority 3 (This Month):
11. Consider migrating from localStorage to HttpOnly cookies
12. Implement comprehensive logging and monitoring
13. Add security testing to CI/CD pipeline
14. Conduct penetration testing
15. Create security documentation for developers

---

## 🔧 RECOMMENDED SECURITY TOOLS

1. **npm audit** - Check for vulnerable dependencies
2. **OWASP ZAP** - Web application security scanner
3. **Snyk** - Continuous security monitoring
4. **ESLint Security Plugin** - Static code analysis
5. **Git-secrets** - Prevent committing secrets

---

## 📚 SECURITY BEST PRACTICES CHECKLIST

- [ ] All secrets in environment variables
- [ ] Strong password policy enforced
- [ ] HTTPS everywhere
- [ ] Content Security Policy configured
- [ ] CORS properly restricted
- [ ] Input validation on all endpoints
- [ ] Output encoding to prevent XSS
- [ ] Rate limiting on all APIs
- [ ] Secure session management
- [ ] Regular security audits
- [ ] Dependency updates automated
- [ ] Security headers configured
- [ ] Error handling doesn't leak info
- [ ] Logging and monitoring in place
- [ ] Backup and recovery plan

---

## 📞 NEXT STEPS

1. Review this report with the development team
2. Prioritize fixes based on severity
3. Create tickets for each vulnerability
4. Implement fixes systematically
5. Re-audit after fixes are deployed
6. Establish ongoing security practices

---

**Report End**