---
name: code-review-security-audit
description: "Automated code review, vulnerability scanning, input validation, environment variable protection, and security audits."
---

# Code Review & Security Audit Skill

## Security & Quality Audit Checklist

### 1. Code Review Checklist
- Verify signature and prop types before invocation.
- Ensure proper cleanup in hooks and event listeners (`removeEventListener`, `clearInterval`).
- Check for dead code, unused imports, or duplicate dependencies.

### 2. Vulnerability & Sanitization
- Prevent XSS attacks by sanitizing any raw user input rendered in HTML.
- Protect secrets, API keys, and sensitive tokens from being hardcoded or committed to VCS.
- Use secure HTTP headers and CORS configurations.
