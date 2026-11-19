# Appzora Firestore Security Specification

## 1. Data Invariants
1. **PII Isolation**: `/developers/{developerId}` stores sensitive developer info (name, 11-digit BD mobile, email, passwordHash) and is readable/writable strictly by `request.auth.uid == developerId`. No `list` queries are allowed.
2. **Developer Gate**: A user cannot create an app in `/apps/{appId}` unless their `/developers/{uid}` document exists and has `status == 'verified'`.
3. **Catalog Integrity**: All published apps in `/apps/{appId}` enforce strict field allowlists, string length boundaries, valid categories/appTypes, and server-side timestamps (`request.time`).
4. **Master Gate on Reviews**: A review under `/apps/{appId}/reviews/{reviewId}` cannot be created unless `/apps/{appId}` exists and `status == 'published'`.
5. **Library Ownership**: `/users/{userId}/library/{appId}` is strictly isolated to `request.auth.uid == userId` and requires the target `/apps/{appId}` document to exist.

## 2. The "Dirty Dozen" Attack Payloads (All Must Yield PERMISSION_DENIED)
1. **Blanket Developer PII Read**: Non-owner `get('/developers/other_uid')` -> DENIED.
2. **Developer List Scrape**: `list('/developers')` -> DENIED.
3. **Self-Verify Bypass on Create**: Creating `/developers/uid` with `status: 'verified'` directly -> DENIED (`status` must start as `'pending_verification'`).
4. **Invalid BD Mobile**: Creating `/developers/uid` with `mobile: '12345'` -> DENIED (regex `^01[3-9][0-9]{8}$`).
5. **Unverified Developer App Publish**: Creating `/apps/app1` when `/developers/uid` does not exist or is `'pending_verification'` -> DENIED.
6. **Shadow Ghost Field Injection**: Creating `/apps/app1` with extra key `isOfficialFeatured: true` -> DENIED (`keys().hasOnly(...)`).
7. **Identity Spoofing on App**: Creating `/apps/app1` with `ownerId: 'victim_uid'` -> DENIED (`incoming().ownerId == request.auth.uid`).
8. **Timestamp Spoofing**: Creating `/apps/app1` with `createdAt: '2020-01-01T00:00:00Z'` -> DENIED (`== request.time`).
9. **ID Poisoning**: Writing `/apps/` with a 200-char or `../` ID -> DENIED (`isValidId()`).
10. **Unauthenticated / Unverified Email Write**: Creating `/apps/app1` when `request.auth.token.email_verified == false` -> DENIED.
11. **Value Poisoning on Update**: Updating `/apps/app1` `installCount` by +100 instead of +1 -> DENIED.
12. **Blanket Unfiltered List on Apps**: Listing `/apps` without filtering `status == 'published'` when drafts exist -> DENIED.
