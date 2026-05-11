# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it by emailing the security team. **Do not create a public GitHub issue.**

### What to Include in Your Report
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Security Best Practices for Developers

### 1. Environment Variables
- **NEVER** commit `.env` files to version control
- Always use `.env.example` as a template
- Rotate credentials immediately if exposed
- Use different credentials for development and production

### 2. Authentication & Authorization
- Passwords must meet complexity requirements (12+ chars, uppercase, lowercase, numbers, special chars)
- JWT tokens expire after 1 hour
- Rate limiting: 5 login attempts per 15 minutes
- Email verification required before login
- Admin approval required for new accounts

### 3. Input Validation
- All user inputs must be validated using Zod schemas
- Sanitize data before display to prevent XSS
- Use parameterized queries (Supabase client handles this)
- Validate file uploads (type, size, content)

### 4. API Security
- All API endpoints require authentication
- Use proper CORS configuration (see `supabase/functions/_shared/cors.ts`)
- Implement rate limiting on all endpoints
- Log all authentication attempts
- Never expose sensitive data in error messages

### 5. Frontend Security
- Content Security Policy (CSP) configured in `index.html`
- Security headers enabled (X-Frame-Options, X-Content-Type-Options, etc.)
- No inline scripts (except where necessary with CSP)
- Sanitize all user-generated content before rendering

### 6. Data Protection
- Passwords hashed with bcrypt (cost factor 10)
- Sensitive data encrypted at rest (Supabase handles this)
- HTTPS enforced for all connections
- No sensitive data in localStorage (tokens only, with expiration)

### 7. Dependencies
- Run `npm audit` regularly
- Update dependencies monthly
- Review security advisories
- Use `npm audit fix` for automatic fixes

---

## Security Checklist for Pull Requests

Before submitting a PR, ensure:

- [ ] No secrets or credentials in code
- [ ] All user inputs validated
- [ ] Error messages don't leak sensitive info
- [ ] Authentication/authorization properly implemented
- [ ] CORS configured correctly
- [ ] Rate limiting in place for new endpoints
- [ ] SQL injection prevented (use Supabase client)
- [ ] XSS prevented (sanitize outputs)
- [ ] CSRF tokens used for state-changing operations
- [ ] Security headers configured
- [ ] Dependencies up to date
- [ ] Code reviewed by at least one other developer

---

## Common Vulnerabilities to Avoid

### ❌ DON'T
```typescript
// Hardcoded secrets
const API_KEY = "sk_live_123456789";

// Weak passwords
const password = "12345678";

// SQL injection vulnerable
const query = `SELECT * FROM users WHERE email = '${email}'`;

// XSS vulnerable
element.innerHTML = userInput;

// CORS allowing all origins
"Access-Control-Allow-Origin": "*"

// Storing sensitive data
localStorage.setItem('password', password);
```

### ✅ DO
```typescript
// Use environment variables
const API_KEY = import.meta.env.VITE_API_KEY;

// Strong passwords with validation
const passwordSchema = z.string()
  .min(12)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

// Use parameterized queries
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);

// Sanitize output
element.textContent = userInput;

// Proper CORS
const allowedOrigins = ['https://yourdomain.com'];
const origin = req.headers.get('origin');
if (allowedOrigins.includes(origin)) {
  headers['Access-Control-Allow-Origin'] = origin;
}

// Store only non-sensitive data
localStorage.setItem('theme', 'dark');
```

---

## Security Tools

### Required Tools
1. **npm audit** - Check for vulnerable dependencies
   ```bash
   npm audit
   npm audit fix
   ```

2. **ESLint Security Plugin** - Static code analysis
   ```bash
   npm install --save-dev eslint-plugin-security
   ```

3. **Git-secrets** - Prevent committing secrets
   ```bash
   git secrets --install
   git secrets --register-aws
   ```

### Recommended Tools
- **OWASP ZAP** - Web application security scanner
- **Snyk** - Continuous security monitoring
- **SonarQube** - Code quality and security
- **Dependabot** - Automated dependency updates

---

## Incident Response Plan

### If a Security Breach Occurs:

1. **Immediate Actions** (Within 1 hour)
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable additional logging
   - Notify security team

2. **Investigation** (Within 24 hours)
   - Identify scope of breach
   - Determine attack vector
   - Document timeline
   - Preserve evidence

3. **Remediation** (Within 48 hours)
   - Patch vulnerabilities
   - Reset all affected credentials
   - Update security measures
   - Deploy fixes

4. **Communication** (Within 72 hours)
   - Notify affected users
   - Report to authorities (if required)
   - Publish incident report
   - Update security documentation

5. **Post-Incident** (Within 1 week)
   - Conduct post-mortem
   - Update security policies
   - Implement preventive measures
   - Train team on lessons learned

---

## Security Updates

### Current Security Measures
- ✅ Rate limiting on authentication endpoints
- ✅ JWT token expiration (1 hour)
- ✅ Password complexity requirements
- ✅ Email verification
- ✅ Admin approval for new accounts
- ✅ Content Security Policy
- ✅ Security headers (X-Frame-Options, etc.)
- ✅ HTTPS enforcement
- ✅ Input validation with Zod
- ✅ Bcrypt password hashing

### Planned Improvements
- [ ] Implement refresh tokens
- [ ] Add 2FA/MFA support
- [ ] Implement session management
- [ ] Add security monitoring/alerting
- [ ] Conduct penetration testing
- [ ] Implement CSRF protection
- [ ] Add API request signing
- [ ] Implement audit logging

---

## Compliance

### Data Protection
- Follow GDPR guidelines for EU users
- Implement data retention policies
- Provide data export functionality
- Honor data deletion requests

### Privacy
- Collect only necessary data
- Encrypt sensitive data
- Implement access controls
- Regular security audits

---

## Contact

For security concerns, contact:
- Security Team: [security@example.com]
- Emergency: [emergency@example.com]

---

**Last Updated:** 2026-05-11  
**Version:** 1.0.0