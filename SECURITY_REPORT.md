# Security Vulnerability Report - The Rooms Hotel Management Platform

**Date:** June 9, 2026  
**Reviewer:** Security Engineer  
**OWASP Top 10 Coverage:** A01-A10

---

## CRITICAL Vulnerabilities

### C1: File Upload - No File Type Validation

**Location:** [`apps/admin/src/lib/minio.ts:21-59`](apps/admin/src/lib/minio.ts:21)

**Severity:** CRITICAL

**Description:**
The `uploadRoomPhoto` and `uploadRoomTypeImage` functions accept any file type without validation. The only sanitization performed is replacing spaces and removing some special characters from the filename.

```typescript
// Line 29: Weak filename sanitization
const safeName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
```

**Attack Scenario:**
1. Attacker uploads a malicious PHP shell disguised as an image (e.g., `shell.php.jpg`)
2. File is stored with public-read policy
3. Attacker accesses the file directly and executes the shell

**Impact:**
- Remote Code Execution (RCE)
- Complete system compromise
- Data breach

**Recommendation:**
```typescript
// Add file type validation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(fileBuffer: Buffer, mimeType: string) {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error('File type not allowed');
  }
  if (fileBuffer.length > MAX_SIZE) {
    throw new Error('File too large');
  }
  // Verify magic bytes match extension
}
```

---

### C2: Path Traversal in File Upload

**Severity:** CRITICAL

**Description:**
The filename sanitization can be bypassed with URL encoding or double encoding.

```typescript
// Regex: /[^a-zA-Z0-9._-]/g  - This doesn't prevent:
// - URL encoded paths (%2e%2e%2f = ../)
// - Double encoding
```

**Attack Scenario:**
1. Upload filename: `..%2F..%2F..%2Fetc%2Fpasswd`
2. After URL decoding: `../../../etc/passwd`
3. File written outside intended bucket

**Recommendation:**
```typescript
// Strict filename validation - reject anything not alphanumeric
const safeName = fileName
  .replace(/\.\./g, '') // Remove all ..
  .replace(/[^a-zA-Z0-9._-]/g, '')
  .substring(0, 255); // Max length

if (safeName !== fileName) {
  throw new Error('Invalid filename');
}
```

---

### C3: IDOR - Access Booking Data Across Properties

**Severity:** CRITICAL

**Description:**
The multi-property system lacks property-based access control enforcement in API routes. A user with access to Property A can access bookings from Property B by manipulating the `propertyId`.

**Location:** All booking API routes

**Attack Scenario:**
1. User is logged into Front Office for Property A
2. User modifies API request to access booking from Property B
3. No property validation in query layer

**Recommendation:**
```typescript
// Add property-based access control
async function verifyPropertyAccess(userId: string, propertyId: string, role: string) {
  if (role === 'SUPER_ADMIN') return true;
  
  const access = await db.userPropertyAccess.findFirst({
    where: { userId, propertyId }
  });
  return !!access;
}

// Use in every API route
const propertyId = booking.propertyId;
await verifyPropertyAccess(session.user.id, propertyId, session.user.role);
```

---

## HIGH Vulnerabilities

### H1: JWT Token Tampering - Missing Signature Verification

**Location:** [`packages/auth/auth.config.ts:18-33`](packages/auth/auth.config.ts:18)

**Severity:** HIGH

**Description:**
The `verifyMagicToken` function uses HMAC-SHA256 for token verification. However, the JWT implementation uses a custom format that doesn't follow JWT standards. If NextAuth JWT is tampered, the system may accept it.

**Current Implementation:**
```typescript
function verifyMagicToken(token: string, email: string): boolean {
  const dotIndex = token.lastIndexOf(".")
  const payload = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)
  const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  if (sig !== expectedSig) return false
  // ...
}
```

**Attack Scenario:**
1. Attacker captures a magic link token
2. Attacker modifies the payload to extend expiration
3. Attacker re-signs with known secret (if secret is weak)

**Recommendation:**
```typescript
// Use proper JWT library
import jwt from 'jsonwebtoken';

function verifyMagicToken(token: string, email: string): boolean {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    return decoded.email === email && decoded.exp > Date.now();
  } catch {
    return false;
  }
}
```

---

### H2: Race Condition in Booking Creation

**Location:** [`apps/web/src/app/api/bookings/route.ts:150-209`](apps/web/src/app/api/bookings/route.ts:150)

**Severity:** HIGH

**Description:**
The booking creation process has a Time-of-Check-Time-of-Use (TOCTOU) race condition. Two concurrent requests can book the same room for overlapping dates before either transaction completes.

**Attack Scenario:**
1. User A and User B both request Room 101 for June 15-17
2. Both requests pass availability check simultaneously
3. Both bookings are created
4. Double booking occurs

**Recommendation:**
```typescript
// Use serializable transaction
const booking = await prisma.$transaction(async (tx) => {
  // Lock the room row
  await tx.$executeRaw`
    SELECT * FROM rooms WHERE id = ${roomId} FOR UPDATE
  `;
  
  // Check availability within transaction
  const existing = await tx.booking.findFirst({
    where: {
      roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      checkIn: { lt: checkOutDate },
      checkOut: { gt: checkInDate },
    }
  });
  
  if (existing) throw new Error('Room no longer available');
  
  return tx.booking.create({ /* ... */ });
}, {
  isolationLevel: 'Serializable'
});
```

---

### H3: No Rate Limiting on Authentication Endpoints

**Severity:** HIGH

**Description:**
The magic link and password authentication endpoints have no rate limiting, making them vulnerable to brute force attacks.

**Attack Scenario:**
1. Attacker floods magic link request endpoint
2. Legitimate users don't receive their links
3. Or attacker attempts password brute force on credential endpoint

**Recommendation:**
```typescript
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  const { success, remaining, reset } = await limiter.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
}
```

---

## MEDIUM Vulnerabilities

### M1: Missing Input Sanitization - XSS in Special Requests

**Severity:** MEDIUM

**Description:**
The `specialRequests` field in booking creation accepts any string without sanitization. Stored XSS is possible if this field is displayed without escaping.

**Location:** [`apps/web/src/app/api/bookings/route.ts:270`](apps/web/src/app/api/bookings/route.ts:270)

**Attack Scenario:**
1. Attacker books a room with `specialRequests: "<script>alert('XSS')</script>"`
2. Admin views booking details
3. Script executes in admin's browser

**Recommendation:**
```typescript
// Sanitize input
import DOMPurify from 'isomorphic-dompurify';

const sanitizedRequests = DOMPurify.sanitize(data.specialRequests, {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
});
```

---

### M2: Payment Status Not Verified - Replay Attack

**Severity:** MEDIUM

**Description:**
The booking creation doesn't verify payment status with the payment gateway. An attacker could create a booking with `paymentStatus: 'COMPLETED'` without actually paying.

**Location:** [`apps/web/src/app/api/bookings/route.ts:254-278`](apps/web/src/app/api/bookings/route.ts:254)

**Attack Scenario:**
1. Attacker intercepts a valid booking request
2. Modifies `paymentStatus` to 'COMPLETED'
3. Server accepts the booking without actual payment verification

**Recommendation:**
```typescript
// Verify payment with gateway before confirming
const payment = await verifyPaymentWithGateway(paymentId, expectedAmount);
if (!payment || payment.status !== 'SUCCESS') {
  return badRequest('Payment verification failed');
}
```

---

### M3: Magic Link Token Never Expires in Dev Mode

**Severity:** MEDIUM

**Description:** In non-production environments, the magic link verification can be bypassed entirely:

```typescript
// Line 60-64
if (token) {
  if (!verifyMagicToken(token, email)) return null;
} else if (process.env.NODE_ENV === "production") {
  return null;
}
// Dev mode: allows login without token!
```

**Impact:**
- Authentication bypass in development
- Accidental production deployment with this code

**Recommendation:**
Remove the development bypass in production checks:
```typescript
if (!token) {
  return null; // Always require token
}
```

---

## LOW Vulnerabilities

### L1: Default MinIO Credentials

**Severity:** LOW

**Location:** [`apps/admin/src/lib/minio.ts:12-13`](apps/admin/src/lib/minio.ts:12)

**Description:**
Default MinIO credentials are used as fallbacks:
```typescript
const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
```

**Recommendation:**
Fail fast if credentials aren't configured:
```typescript
if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
  throw new Error('MinIO credentials not configured');
}
```

---

### L2: Missing Security Headers

**Severity:** LOW

**Description:**
No security headers (CSP, HSTS, X-Frame-Options) are set at the application level.

**Recommendation:**
Add to `next.config.js`:
```javascript
headers: [
  {
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  },
],
```

---

### L3: No SQL Injection Prevention Testing

**Severity:** LOW (if Prisma is properly used)

**Description:**
While the codebase uses Prisma which provides SQL injection protection, the raw SQL usage in `bookingQueries.ts` should be audited.

**Recommendation:**
Audit all `$executeRaw` and `$queryRaw` usages to ensure no SQL injection vectors.

---

## Summary Table

| ID | Vulnerability | Severity | OWASP Category |
|----|---------------|----------|----------------|
| C1 | No file type validation | CRITICAL | A03:2021 - Injection |
| C2 | Path traversal in uploads | CRITICAL | A03:2021 - Injection |
| C3 | IDOR across properties | CRITICAL | A01:2021 - Broken Access Control |
| H1 | JWT tampering possible | HIGH | A02:2021 - Cryptographic Failures |
| H2 | Race condition in booking | HIGH | A04:2021 - Insecure Design |
| H3 | No rate limiting | HIGH | A07:2021 - Authentication Failures |
| M1 | XSS in special requests | MEDIUM | A03:2021 - Injection |
| M2 | Payment replay attack | MEDIUM | A04:2021 - Insecure Design |
| M3 | Dev mode auth bypass | MEDIUM | A07:2021 - Authentication Failures |
| L1 | Default credentials | LOW | A07:2021 - Credentials |
| L2 | Missing security headers | LOW | A05:2021 - Security Misconfiguration |
| L3 | Raw SQL audit needed | LOW | A03:2021 - Injection |

---

## Recommended Priority Fixes

1. **Immediate (This Week):**
   - Add file type validation to upload functions
   - Add path traversal prevention
   - Implement property-based access control
   - Remove development authentication bypass

2. **Short-term (This Sprint):**
   - Add rate limiting to auth endpoints
   - Fix race condition with serializable transactions
   - Verify payment with gateway before booking confirmation
   - Add input sanitization for XSS prevention

3. **Medium-term:**
   - Implement proper JWT with standard library
   - Add security headers
   - Fail fast on missing credentials
   - Audit raw SQL queries