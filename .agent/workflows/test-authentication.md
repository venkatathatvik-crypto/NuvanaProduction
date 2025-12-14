---
description: Test all authentication system flows
---

# Authentication System Testing Workflow

This workflow provides comprehensive testing procedures for all authentication features in the Nuvana360 system.

## Overview

The authentication system consists of:
- **Backend**: NestJS with JWT authentication, Passport strategies, and role guards
- **Frontend**: React with AuthContext, Supabase authentication
- **Database**: PostgreSQL with Prisma ORM
- **User Roles**: Student, Teacher, School Admin, Super Admin
- **Key Features**: Multi-tenant isolation, first-time login password reset, role-based access control

---

## Prerequisites

Before testing, ensure you have:

1. **Backend running**: `cd backend && npm run start:dev`
2. **Frontend running**: `npm run dev`
3. **Database**: PostgreSQL with latest migrations applied
4. **Environment variables**: Properly configured JWT secrets, Supabase credentials
5. **Test accounts**: At least one account for each role

---

## Test Scenarios

### 1. Super Admin Authentication

#### 1.1 Super Admin Registration
**Endpoint**: `POST /auth/super-admin/register`

**Test Steps**:
1. Navigate to `/super-admin-signup`
2. Fill in registration form:
   - Name
   - Email
   - Password
   - Super Admin Secret (from environment variable `SUPER_ADMIN_SECRET`)
3. Submit form

**Expected Results**:
- ✅ Account created successfully
- ✅ User redirected to super admin dashboard (`/super-admin`)
- ✅ JWT tokens (access + refresh) returned
- ✅ Profile has `role_id = 1` and `school_id = null`
- ✅ `is_first_login = false` in database

**Edge Cases to Test**:
- ❌ Invalid super admin secret → Should return 401 Unauthorized
- ❌ Email already exists → Should return 409 Conflict
- ❌ Weak password → Should return validation error

---

#### 1.2 Super Admin Login
**Endpoint**: `POST /auth/login`

**Test Steps**:
1. Navigate to `/super-admin-login`
2. Enter super admin credentials
3. Submit login form

**Expected Results**:
- ✅ Successfully authenticated
- ✅ Redirected to `/super-admin` dashboard
- ✅ JWT tokens returned
- ✅ Session created in AuthContext
- ✅ Profile loaded with role `super_admin`

**Edge Cases to Test**:
- ❌ Wrong password → Should show "Invalid credentials"
- ❌ Non-existent email → Should show "Invalid credentials"
- ❌ Login with student/teacher credentials on super admin page → Should show access denied

---

### 2. School Admin Authentication

#### 2.1 School Admin Creation (by Super Admin)
**Endpoint**: `POST /auth/register`
**Required**: Super admin JWT token

**Test Steps**:
1. Login as super admin
2. Navigate to school admin creation interface
3. Create new school (if needed)
4. Create school admin with:
   - Name
   - Email
   - Temporary password
   - `role_id = 2` (School Admin)
   - Assigned `school_id`

**Expected Results**:
- ✅ School admin account created
- ✅ `is_first_login = true` in database
- ✅ `is_verified = false` in database
- ✅ Email/notification sent with temporary credentials

**Edge Cases to Test**:
- ❌ Missing school_id → Should return 403 Forbidden
- ❌ Email already exists → Should return 409 Conflict
- ❌ Non-super-admin trying to create → Should return 403 Forbidden

---

#### 2.2 School Admin First Login
**Endpoint**: `POST /auth/login`

**Test Steps**:
1. Navigate to `/admin-login`
2. Enter school admin email and temporary password
3. Submit login

**Expected Results**:
- ✅ Login blocked with 403 status
- ✅ Response contains `code: 'RESET_REQUIRED'`
- ✅ Frontend shows password reset prompt
- ✅ User can set new password
- ✅ After reset, `is_first_login = false` and `is_verified = true`

---

#### 2.3 School Admin Normal Login
**Endpoint**: `POST /auth/login`

**Test Steps**:
1. Navigate to `/admin-login`
2. Enter school admin credentials (after password reset)
3. Submit login

**Expected Results**:
- ✅ Successfully authenticated
- ✅ Redirected to `/admin` dashboard
- ✅ Can only see data for their assigned school
- ✅ Cannot access other schools' data (multi-tenant isolation)

---

### 3. Teacher Authentication

#### 3.1 Teacher Creation (by School Admin)
**Endpoint**: `POST /auth/register`
**Required**: School admin or super admin JWT token

**Test Steps**:
1. Login as school admin
2. Navigate to teacher creation interface
3. Create new teacher with:
   - Name
   - Email
   - Temporary password
   - `role_id = 3` (Teacher)
   - Inherits `school_id` from school admin's context

**Expected Results**:
- ✅ Teacher account created
- ✅ `is_first_login = true`
- ✅ Same school_id as creator
- ✅ Notification sent with credentials

---

#### 3.2 Teacher First Login & Password Reset
**Similar to School Admin First Login**

**Test Steps**:
1. Navigate to `/login` (teacher tab)
2. Enter temporary credentials
3. Complete password reset flow
4. Login with new password

**Expected Results**:
- ✅ Password reset required on first login
- ✅ After reset, normal login works
- ✅ Redirected to `/teacher` dashboard

---

#### 3.3 Teacher Role-Based Access
**Test Steps**:
1. Login as teacher
2. Try to access:
   - ✅ Teacher dashboard
   - ✅ Assigned classes
   - ✅ Tests created by them
   - ❌ Admin panel (should be blocked)
   - ❌ Other schools' data (should be filtered)

---

### 4. Student Authentication

#### 4.1 Student Creation (by School Admin/Teacher)
**Endpoint**: `POST /auth/register`

**Test Steps**:
1. Login as school admin
2. Navigate to student creation interface
3. Create student with:
   - Name
   - Email
   - Roll number
   - Class assignment
   - Temporary password
   - `role_id = 4` (Student)

**Expected Results**:
- ✅ Student account created
- ✅ Associated with correct class
- ✅ `is_first_login = true`
- ✅ Student details record created

---

#### 4.2 Student Login Flow
**Test Steps**:
1. Navigate to `/login` (student tab)
2. First login with temporary password
3. Reset password
4. Normal login

**Expected Results**:
- ✅ Password reset on first login
- ✅ Redirected to `/student` dashboard
- ✅ Can only see:
  - Own test submissions
  - Own attendance
  - Own class materials
- ❌ Cannot access other students' data

---

### 5. Password Reset

**Endpoint**: `POST /auth/reset-password`

**Test Steps**:
1. User logs in for first time
2. Receives `RESET_REQUIRED` response
3. Frontend displays password reset form
4. User enters:
   - User ID (from error response)
   - New password
5. Submit reset request

**Expected Results**:
- ✅ Password hash updated in database
- ✅ `is_first_login` set to `false`
- ✅ `is_verified` set to `true`
- ✅ User can now login normally

**Edge Cases**:
- ❌ Invalid user ID → Should return 404
- ❌ Weak new password → Should return validation error

---

### 6. Token Refresh

**Endpoint**: `POST /auth/refresh`

**Test Steps**:
1. Login as any user
2. Extract refresh token from response
3. Wait for access token to expire (or modify expiry in env for testing)
4. Send refresh token to `/auth/refresh`

**Expected Results**:
- ✅ New access token returned
- ✅ Refresh token remains valid
- ✅ Can continue making authenticated requests
- ❌ Invalid refresh token → Should return 401
- ❌ Expired refresh token → Should return 401

---

### 7. Logout

**Frontend**: AuthContext `logout()` function

**Test Steps**:
1. Login as any user
2. Navigate to dashboard
3. Click logout button

**Expected Results**:
- ✅ Supabase session cleared
- ✅ AuthContext state reset
- ✅ Redirected to login page
- ✅ Cannot access protected routes
- ❌ Old tokens should not work

---

### 8. Protected Routes

**Test Steps**:
1. Without logging in, try to access:
   - `/student`
   - `/teacher`
   - `/admin`
   - `/super-admin`

**Expected Results**:
- ❌ All should redirect to appropriate login page
- Students/teachers → `/login`
- School admins → `/admin-login`
- Super admins → `/super-admin-login`

**Role Mismatch Tests**:
1. Login as student, try to access `/teacher` → ❌ Redirected to `/NotFound`
2. Login as teacher, try to access `/admin` → ❌ Redirected to `/NotFound`
3. Login as school admin, try to access `/super-admin` → ❌ Blocked
4. Super admin can access all routes → ✅ Allowed

---

### 9. Multi-Tenant Isolation

**Backend**: School ID filtering in queries

**Test Steps**:
1. Create two schools with separate admins
2. School A admin creates:
   - Teacher A
   - Student A
   - Class A
   - Test A
3. School B admin creates:
   - Teacher B
   - Student B
   - Class B
   - Test B
4. Login as School A admin
5. Verify cannot see:
   - School B's users
   - School B's classes
   - School B's tests

**Expected Results**:
- ✅ All queries filtered by `school_id`
- ✅ RLS policies (if enabled) enforce isolation
- ✅ Cross-school data access blocked
- ❌ Attempting to access other school's data returns 403 or empty results

---

### 10. JWT Auth Guards

**Backend Guards**:
- `JwtAuthGuard`: Validates JWT token
- `RolesGuard`: Validates user role
- `@Public()` decorator: Bypasses authentication
- `@Roles()` decorator: Specifies required roles

**Test Steps**:
1. Test public endpoints (no token required):
   - `POST /auth/login` ✅
   - `POST /auth/super-admin/register` ✅
   - `POST /auth/reset-password` ✅
   - `POST /auth/refresh` ✅

2. Test protected endpoints (token required):
   - `POST /auth/register` ❌ Without token → 401
   - `POST /auth/register` ✅ With super admin token → 201
   - `POST /auth/register` ❌ With student token → 403

3. Test role-based endpoints:
   - Super admin creating user ✅
   - School admin creating user ✅
   - Teacher creating user ❌ Should fail
   - Student creating user ❌ Should fail

---

## Automated Testing (Optional)

### Backend Unit Tests

Create test file: `backend/src/auth/auth.service.spec.ts`

```typescript
describe('AuthService', () => {
  it('should register super admin with valid secret', async () => {
    // Test implementation
  });

  it('should reject super admin with invalid secret', async () => {
    // Test implementation
  });

  it('should require password reset on first login', async () => {
    // Test implementation
  });

  it('should generate valid JWT tokens', async () => {
    // Test implementation
  });

  it('should validate role-based access', async () => {
    // Test implementation
  });
});
```

**Run tests**: `cd backend && npm test`

---

### Frontend E2E Tests

Using Playwright or Cypress:

```typescript
test('complete user registration and login flow', async ({ page }) => {
  // Navigate to signup
  // Fill form
  // Submit
  // Verify redirect
  // Logout
  // Login again
  // Verify dashboard
});
```

---

## Security Checklist

- [ ] Passwords are hashed with bcrypt (10 rounds)
- [ ] JWT secrets are strong and environment-specific
- [ ] Access tokens expire quickly (recommended: 15m)
- [ ] Refresh tokens expire appropriately (recommended: 7d)
- [ ] Tokens are transmitted only via HTTPS in production
- [ ] No sensitive data in JWT payload
- [ ] Role-based access strictly enforced
- [ ] Multi-tenant isolation verified
- [ ] SQL injection prevented by Prisma ORM
- [ ] CORS properly configured
- [ ] Rate limiting enabled (if applicable)

---

## Common Issues & Debugging

### Issue: "Invalid or expired token"
- Check if token is expired
- Verify JWT_SECRET matches between sign and verify
- Check token format (Bearer \u003ctoken\u003e)

### Issue: "Access denied" even with valid credentials
- Verify user's role_id in database
- Check RolesGuard configuration
- Ensure @Roles decorator has correct roles

### Issue: "Password reset not triggered on first login"
- Check `is_first_login` flag in database
- Verify login endpoint checks this flag
- Ensure frontend handles 403 with RESET_REQUIRED code

### Issue: "User can see other schools' data"
- Verify school_id is set correctly
- Check all queries include school_id filter
- Review RLS policies (if using Supabase RLS)
- Verify @Tenant decorator usage

---

## Test Data Setup

### Sample Super Admin
```
Email: superadmin@nuvana.com
Password: SuperAdmin@123
Role: super_admin
School ID: null
```

### Sample School Admin
```
Email: admin@school1.com
Password: (temporary initially)
Role: school_admin
School ID: \u003cuuid-of-school-1\u003e
```

### Sample Teacher
```
Email: teacher@school1.com
Password: (temporary initially)
Role: teacher
School ID: \u003cuuid-of-school-1\u003e
```

### Sample Student
```
Email: student@school1.com
Password: (temporary initially)
Role: student
School ID: \u003cuuid-of-school-1\u003e
Class ID: \u003cuuid-of-class\u003e
```

---

## Conclusion

This workflow covers all authentication scenarios. For successful verification:

1. ✅ All user roles can register and login
2. ✅ First-time password reset works
3. ✅ Role-based access control is enforced
4. ✅ Multi-tenant isolation is maintained
5. ✅ JWT tokens work correctly
6. ✅ Protected routes are secured
7. ✅ Logout clears session properly

If all tests pass, your authentication system is production-ready!
