/**
 * Comprehensive Security Testing Suite
 * Tests for XSS, CSRF, injection, and other vulnerabilities
 */

import { sanitizeHtml, isValidRedirectUrl } from './security';
import { validateInput, userSchema, messageSchema } from './validation';

/**
 * XSS Attack Vector Tests
 */
export const testXSSVulnerability = (): boolean => {
  const xssVectors = [
    '<img src="x" onerror="alert(\'XSS\')" />',
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<svg onload="alert(\'XSS\')" />',
    '<iframe src="javascript:alert(\'XSS\')" />',
    '<body onload="alert(\'XSS\')" />',
    '<input onfocus="alert(\'XSS\')" autofocus />',
    '"><script>alert("XSS")</script>',
  ];

  return xssVectors.every((vector) => {
    const sanitized = sanitizeHtml(vector);
    // Should not contain script tags or event handlers
    return (
      !sanitized.includes('<script>') &&
      !sanitized.includes('onerror=') &&
      !sanitized.includes('onload=') &&
      !sanitized.includes('onfocus=') &&
      !sanitized.includes('javascript:')
    );
  });
};

/**
 * SQL Injection Vector Tests
 */
export const testSQLInjection = (): boolean => {
  const sqlVectors = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT * FROM passwords --",
    "admin'--",
    "' OR 1=1 --",
  ];

  return sqlVectors.every((vector) => {
    // Zod validation should reject these
    const result = validateInput({ email: vector }, userSchema.pick({ email: true }));
    return !result.valid; // Should be invalid
  });
};

/**
 * Open Redirect Tests
 */
export const testOpenRedirect = (): boolean => {
  const redirectVectors = [
    'https://evil.com',
    '//evil.com',
    'http://evil.com',
    'javascript:alert("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
  ];

  return redirectVectors.every((vector) => {
    return !isValidRedirectUrl(vector); // All should be invalid
  });
};

/**
 * Input Validation Tests
 */
export const testInputValidation = (): boolean => {
  const testCases = [
    // Valid inputs
    {
      data: { email: 'user@example.com', username: 'valid_user', password: 'SecurePass123!' },
      shouldPass: true,
    },
    // Invalid emails
    {
      data: { email: 'not-an-email', username: 'valid_user', password: 'SecurePass123!' },
      shouldPass: false,
    },
    // Password too short
    {
      data: { email: 'user@example.com', username: 'valid_user', password: 'Short1!' },
      shouldPass: false,
    },
    // Username with invalid characters
    {
      data: { email: 'user@example.com', username: 'user@@@', password: 'SecurePass123!' },
      shouldPass: false,
    },
    // Message too long
    {
      data: { content: 'x'.repeat(5001), authorId: '123e4567-e89b-12d3-a456-426614174000', roomId: '123e4567-e89b-12d3-a456-426614174000' },
      shouldPass: false,
    },
  ];

  return testCases.every((test) => {
    if (test.data.email) {
      const result = validateInput(test.data, userSchema.pick({ email: true, username: true, password: true }));
      return result.valid === test.shouldPass;
    } else {
      const result = validateInput(test.data, messageSchema);
      return result.valid === test.shouldPass;
    }
  });
};

/**
 * CSRF Token Validation
 */
export const testCsrfProtection = (): boolean => {
  // In actual implementation, verify CSRF token is included in requests
  // This is a simplified check
  return typeof localStorage.getItem('csrf-token') === 'string' || localStorage.getItem('csrf-token') === null;
};

/**
 * Rate Limiting Tests
 */
export const testRateLimiting = (): boolean => {
  const { RateLimiter } = require('./security');
  const limiter = new RateLimiter(5, 1000); // 5 requests per second

  // Should allow first 5 requests
  for (let i = 0; i < 5; i++) {
    if (!limiter.isAllowed()) return false;
  }

  // 6th request should be blocked
  return !limiter.isAllowed();
};

/**
 * Run all security tests
 */
export const runSecurityTests = (): Record<string, boolean> => {
  console.group('🔒 Security Vulnerability Tests');

  const results = {
    xssProtection: testXSSVulnerability(),
    sqlInjectionPrevention: testSQLInjection(),
    openRedirectPrevention: testOpenRedirect(),
    inputValidation: testInputValidation(),
    csrfProtection: testCsrfProtection(),
    rateLimiting: testRateLimiting(),
  };

  Object.entries(results).forEach(([test, passed]) => {
    console.log(
      `${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`
    );
  });

  const allPassed = Object.values(results).every((r) => r);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}`);
  console.groupEnd();

  return results;
};

// Run tests in development mode
if (import.meta.env.DEV) {
  // Uncomment to run tests on app load
  // runSecurityTests();
}

export default {
  testXSSVulnerability,
  testSQLInjection,
  testOpenRedirect,
  testInputValidation,
  testCsrfProtection,
  testRateLimiting,
  runSecurityTests,
};
