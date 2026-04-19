# Email & Password Reset Testing Guide

This guide explains how to test the new link-free email notifications and the secure OTP password reset flow.

## 1. Monitoring the Queues (Bull Board)
Nuvana uses **BullMQ** to process emails in the background. You can monitor the status of all outgoing emails (including those currently waiting, failed, or completed) via the Bull Board UI.

- **URL**: `http://localhost:3000/admin/queues`
- **What to look for**:
    - The `email-queue` should show jobs being added as you trigger events.
    - You can click on a job to see the `data` (payload) being sent to the template.
    - If a job fails (e.g., bad SMTP config), you can see the error message and retry it manually.

## 2. Test Scenarios

### Scenario A: Forgot Password (OTP Flow)
This tests the generation of the 6-digit code and the new link-free template.

1. **Request Reset**:
   ```bash
   curl -X POST http://localhost:3000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "USER_EMAIL_HERE"}'
   ```
2. **Check Queue**: Go to Bull Board and look for a `send-password-reset` job.
3. **Verify OTP**: 
   - Check the server console logs for a line like: `[TESTING] Password reset OTP for ...: 123456`
   - Alternatively, check the `email-queue` job data in Bull Board.
4. **Complete Reset**:
   ```bash
   curl -X POST http://localhost:3000/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"email": "USER_EMAIL_HERE", "otp": "123456", "newPassword": "SecurePassword123!"}'
   ```

### Scenario B: Login Notification (Security Metadata)
This tests the detection of IP/Device and the branded template.

1. **Perform Login**:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" \
     -d '{"email": "USER_EMAIL_HERE", "password": "USER_PASSWORD_HERE"}'
   ```
2. **Check Queue**: Look for a `send-login-notification` job.
3. **Verify Data**: In Bull Board, ensure `ipAddress` and `device` are populated in the job data.

## 3. Automated Test Script
You can run the following script using `npx ts-node tests/email-security.test.ts` to automate these checks.

(See `tests/email-security.test.ts` for the implementation)
