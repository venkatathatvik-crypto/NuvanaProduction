---
description: Complete authentication API reference with all endpoints and role-based access control
---

# Authentication API Reference

Complete API documentation for all authentication endpoints including signup, login, session validation, and password management.

## Base URL
```
http://localhost:3000/auth
```

---

## Quick Reference - All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/super-admin/register` | Public | Register super admin |
| POST | `/register` | Required (Admin) | Create user account |
| POST | `/login` | Public | User login with role validation |
| POST | `/reset-password` | Public | Reset user password |
| POST | `/refresh` | Public | Refresh access token |
| POST | `/validate-session` | Required | Validate current session |
| POST | `/session` | Required | Get current user session |
| POST | `/logout` | Required | Logout user |

---

## User Roles

| Role ID | Role Name | School Association |
|---------|-----------|-------------------|
| 1 | `super_admin` | No (school_id = null) |
| 2 | `school_admin` | Yes |
| 3 | `teacher` | Yes |
| 4 | `student` | Yes |

---

## 1. Super Admin Registration

**Endpoint:** `POST /auth/super-admin/register`

**Request:**
```json
{
  "email": "admin@nuvana.com",
  "password": "SecurePass123!",
  "name": "Super Admin",
  "secret": "YOUR_SUPER_ADMIN_SECRET"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@nuvana.com",
    "name": "Super Admin",
    "role": "super_admin"
  },
  "access_token": "...",
  "refresh_token": "..."
}
```

---

## 2. User Registration

**Endpoint:** `POST /auth/register`

**Auth:** Required (super_admin or school_admin only)

**Request:**
```json
{
  "email": "teacher@school.com",
  "name": "John Doe",
  "role_id": 3,
  "school_id": "school-uuid",
  "temporaryPassword": "TempPass123!"
}
```

**Response (201):**
```json
{
  "id": "user-uuid",
  "email": "teacher@school.com",
  "name": "John Doe",
  "role": "teacher",
  "school_id": "school-uuid",
  "is_first_login": true,
  "message": "User created successfully. They must reset password on first login."
}
```

---

## 3. Login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "teacher@school.com",
  "password": "UserPassword123!",
  "expectedRole": "teacher"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "teacher@school.com",
    "name": "John Doe",
    "role": "teacher",
    "school_id": "school-uuid"
  },
  "access_token": "...",
  "refresh_token": "..."
}
```

**Error - Password Reset Required (403):**
```json
{
  "statusCode": 403,
  "message": "Password reset required",
  "code": "RESET_REQUIRED",
  "userId": "user-uuid"
}
```

**Error - Role Mismatch (403):**
```json
{
  "statusCode": 403,
  "message": "You are registered as a teacher. Please use the correct login page.",
  "code": "ROLE_MISMATCH",
  "actualRole": "teacher",
  "expectedRole": "student"
}
```

---

## 4. Validate Session

**Endpoint:** `POST /auth/validate-session`

**Auth:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "user-uuid",
    "email": "teacher@school.com",
    "name": "John Doe",
    "role": "teacher",
    "school_id": "school-uuid",
    "avatar_url": "https://...",
    "is_verified": true,
    "is_first_login": false
  }
}
```

**Use Cases:**
- Frontend session validation on app load
- Verify user role for client-side routing
- Check authentication before sensitive operations

---

## 5. Get Current Session

**Endpoint:** `POST /auth/session`

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "teacher@school.com",
  "name": "John Doe",
  "role": "teacher",
  "school_id": "school-uuid",
  "avatar_url": "https://...",
  "is_verified": true,
  "is_first_login": false
}
```

---

## 6. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refresh_token": "..."
}
```

**Response (200):**
```json
{
  "access_token": "..."
}
```

---

## 7. Logout

**Endpoint:** `POST /auth/logout`

**Auth:** Required (Bearer token)

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 8. Reset Password

**Endpoint:** `POST /auth/reset-password`

**Request:**
```json
{
  "userId": "user-uuid",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successful. You can now login with your new password."
}
```

---

## Role-Based Access Control

### Using Role Information

All session endpoints return `role` and `school_id` for:

**1. Client-Side Routing:**
```typescript
switch(user.role) {
  case 'super_admin': navigate('/super-admin/dashboard'); break;
  case 'school_admin': navigate('/admin/dashboard'); break;
  case 'teacher': navigate('/teacher/dashboard'); break;
  case 'student': navigate('/student/dashboard'); break;
}
```

**2. Feature Access Control:**
```typescript
const canCreateTest = ['teacher', 'school_admin'].includes(user.role);
const canManageSchool = user.role === 'super_admin';
```

**3. Multi-Tenant Data Filtering:**
```typescript
if (user.school_id) {
  const schoolData = await fetchSchoolData(user.school_id);
}
```

---

## Frontend Integration Example

```typescript
// 1. Login
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    expectedRole: 'teacher'
  })
});

const { user, access_token, refresh_token } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);

// 2. Validate session on app load
const validateResponse = await fetch('http://localhost:3000/auth/validate-session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});

const { valid, user: sessionUser } = await validateResponse.json();

if (valid) {
  // Redirect based on role
  navigate(`/${sessionUser.role}/dashboard`);
}

// 3. Handle token expiration
async function apiCall(url, options) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });

  if (response.status === 401) {
    // Refresh token
    const refreshResponse = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: localStorage.getItem('refresh_token')
      })
    });

    const { access_token } = await refreshResponse.json();
    localStorage.setItem('access_token', access_token);

    // Retry request
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${access_token}`
      }
    });
  }

  return response;
}
```

---

## Common Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Invalid/missing token or credentials |
| 403 | Forbidden (role mismatch, password reset required) |
| 404 | User not found |
| 409 | Email already exists |

---

## JWT Token Structure

**Access Token Payload:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "teacher",
  "school_id": "school-uuid",
  "iat": 1702468800,
  "exp": 1702555200
}
```

**Token Expiration:**
- Access Token: Configured via `JWT_ACCESS_TOKEN_EXPIRATION`
- Refresh Token: Configured via `JWT_REFRESH_TOKEN_EXPIRATION`

---

## Notes

- All endpoints use `POST` method
- JWT tokens are stateless (no database session storage)
- Role validation at both login and endpoint access levels
- `school_id` is `null` for super admins
- First-time users must reset password before system access
