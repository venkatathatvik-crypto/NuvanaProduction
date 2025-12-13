# Nuvana Production - API Documentation

## Table of Contents

1. [Authentication API](#authentication-api)
2. [Users API](#users-api)
3. [Academic API](#academic-api)
4. [Schools API](#schools-api)
5. [AI API](#ai-api)

---

## Authentication API

### Base URL

```
POST /auth
```

### 1. Register Super Admin

**Endpoint:** `POST /auth/super-admin/register`  
**Authentication:** Public (No JWT required)  
**Status Code:** 201 Created

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123",
  "name": "Super Admin Name",
  "secret": "super_admin_secret_key"
}
```

**Request DTO:**

```typescript
class RegisterSuperAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  secret: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@example.com",
  "name": "Super Admin Name",
  "role": "super_admin",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Register User

**Endpoint:** `POST /auth/register`  
**Authentication:** Required (JWT Token)  
**Roles:** super_admin, school_admin  
**Status Code:** 201 Created

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "User Name",
  "role_id": 2,
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "temporaryPassword": "TempPassword123"
}
```

**Request DTO:**

```typescript
class RegisterUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  role_id: number;

  @IsUUID()
  @IsOptional()
  school_id?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  temporaryPassword: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "email": "user@example.com",
  "name": "User Name",
  "role_id": 2,
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

### 3. Login

**Endpoint:** `POST /auth/login`  
**Authentication:** Public (No JWT required)  
**Status Code:** 200 OK

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "UserPassword123",
  "expectedRole": "super_admin"
}
```

**Request DTO:**

```typescript
class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  expectedRole?: string;
}
```

**Response Body:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "User Name",
    "role": "super_admin",
    "school_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 4. Reset Password

**Endpoint:** `POST /auth/reset-password`  
**Authentication:** Public (No JWT required)  
**Status Code:** 200 OK

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "newPassword": "NewPassword123"
}
```

**Request DTO:**

```typescript
class ResetPasswordDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
```

**Response Body:**

```json
{
  "message": "Password reset successfully",
  "success": true
}
```

---

### 5. Refresh Token

**Endpoint:** `POST /auth/refresh`  
**Authentication:** Public (No JWT required)  
**Status Code:** 200 OK

**Request Headers:**

```
Content-Type: application/json
```

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Body:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 6. Validate Session

**Endpoint:** `POST /auth/validate-session`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{}
```

**Response Body:**

```json
{
  "valid": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "User Name",
    "role": "super_admin",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "avatar_url": null,
    "is_verified": true,
    "is_first_login": false
  }
}
```

---

### 7. Get Current Session

**Endpoint:** `POST /auth/session`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{}
```

**Response DTO:**

```typescript
class SessionResponseDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
  school_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_first_login: boolean;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "User Name",
  "role": "super_admin",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "avatar_url": null,
  "is_verified": true,
  "is_first_login": false
}
```

---

### 8. Logout

**Endpoint:** `POST /auth/logout`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{}
```

**Response Body:**

```json
{
  "message": "Logged out successfully"
}
```

---

## Users API

### Base URL

```
/users
```

### 1. Get All Users

**Endpoint:** `GET /users`  
**Authentication:** Required (JWT Token)  
**Query Parameters:**

- `role_id` (optional): Filter by role ID

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "User Name",
    "role_id": 2,
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "avatar_url": null,
    "is_verified": true,
    "is_first_login": false,
    "created_at": "2025-12-14T10:30:00Z",
    "student_details": {
      "roll_number": "A001",
      "admission_date": "2025-12-14T00:00:00Z",
      "parent_contact": "+1234567890"
    },
    "teacher_details": null
  }
]
```

---

### 2. Get User by ID

**Endpoint:** `GET /users/:id`  
**Authentication:** Required (JWT Token)  
**Parameters:**

- `id` (path): User ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "User Name",
  "role_id": 2,
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "avatar_url": null,
  "is_verified": true,
  "is_first_login": false,
  "created_at": "2025-12-14T10:30:00Z",
  "student_details": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "roll_number": "A001",
    "admission_date": "2025-12-14T00:00:00Z",
    "parent_contact": "+1234567890",
    "class_id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

---

### 3. Update User Profile

**Endpoint:** `PATCH /users/:id`  
**Authentication:** Required (JWT Token)  
**Roles:** super_admin, school_admin, teacher  
**Parameters:**

- `id` (path): User ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Request DTO:**

```typescript
class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "Updated Name",
  "avatar_url": "https://example.com/avatar.jpg",
  "updated_at": "2025-12-14T11:00:00Z"
}
```

---

### 4. Create/Update Student Details

**Endpoint:** `POST /users/:id/student-details`  
**Authentication:** Required (JWT Token)  
**Roles:** super_admin, school_admin  
**Parameters:**

- `id` (path): Profile ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "roll_number": "A001",
  "admission_date": "2025-12-14T00:00:00Z",
  "parent_contact": "+1234567890",
  "class_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Request DTO:**

```typescript
class CreateStudentDetailsDto {
  @IsString()
  @IsOptional()
  roll_number?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  admission_date?: Date;

  @IsString()
  @IsOptional()
  parent_contact?: string;

  @IsUUID()
  @IsOptional()
  class_id?: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "roll_number": "A001",
  "admission_date": "2025-12-14T00:00:00Z",
  "parent_contact": "+1234567890",
  "class_id": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

### 5. Create/Update Teacher Details

**Endpoint:** `POST /users/:id/teacher-details`  
**Authentication:** Required (JWT Token)  
**Roles:** super_admin, school_admin  
**Parameters:**

- `id` (path): Profile ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "bio": "Experienced Mathematics Teacher",
  "specialization": "Advanced Mathematics",
  "joining_date": "2025-12-14T00:00:00Z"
}
```

**Request DTO:**

```typescript
class CreateTeacherDetailsDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  joining_date?: Date;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "profile_id": "550e8400-e29b-41d4-a716-446655440000",
  "bio": "Experienced Mathematics Teacher",
  "specialization": "Advanced Mathematics",
  "joining_date": "2025-12-14T00:00:00Z",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

### 6. Delete User

**Endpoint:** `DELETE /users/:id`  
**Authentication:** Required (JWT Token)  
**Roles:** super_admin, school_admin  
**Parameters:**

- `id` (path): User ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
{
  "message": "User deleted successfully",
  "success": true
}
```

---

## Academic API

### Base URL

```
/academic
```

All Academic API endpoints require JWT authentication and role-based access control.

---

### Grade Levels Management

#### 1. Create Grade Level

**Endpoint:** `POST /academic/grades`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Grade 10"
}
```

**Request DTO:**

```typescript
class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Response Body:**

```json
{
  "id": 1,
  "name": "Grade 10",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

#### 2. Get All Grade Levels

**Endpoint:** `GET /academic/grades`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": 1,
    "name": "Grade 10",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Grade 11",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:31:00Z"
  }
]
```

---

#### 3. Update Grade Level

**Endpoint:** `PATCH /academic/grades/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Grade ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Grade 10-A"
}
```

**Request DTO:**

```typescript
class UpdateGradeDto {
  @IsString()
  @IsOptional()
  name?: string;
}
```

**Response Body:**

```json
{
  "id": 1,
  "name": "Grade 10-A",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "updated_at": "2025-12-14T11:00:00Z"
}
```

---

#### 4. Delete Grade Level

**Endpoint:** `DELETE /academic/grades/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Grade ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
{
  "message": "Grade deleted successfully",
  "success": true
}
```

---

### Classes Management

#### 1. Create Class

**Endpoint:** `POST /academic/classes`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Class 10-A",
  "grade_level_id": 1
}
```

**Request DTO:**

```typescript
class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  grade_level_id: number;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Class 10-A",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "grade_level_id": 1,
  "grade_levels": {
    "id": 1,
    "name": "Grade 10"
  },
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

#### 2. Get All Classes

**Endpoint:** `GET /academic/classes`  
**Roles:** school_admin, teacher, super_admin, student

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Class 10-A",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "grade_level_id": 1,
    "grade_levels": {
      "id": 1,
      "name": "Grade 10"
    },
    "created_at": "2025-12-14T10:30:00Z"
  }
]
```

---

#### 3. Update Class

**Endpoint:** `PATCH /academic/classes/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Class ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Class 10-B",
  "grade_level_id": 2
}
```

**Request DTO:**

```typescript
class UpdateClassDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  grade_level_id?: number;
}
```

---

#### 4. Delete Class

**Endpoint:** `DELETE /academic/classes/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Class ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### Subjects Management

#### 1. Create Subject

**Endpoint:** `POST /academic/subjects`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Mathematics"
}
```

**Request DTO:**

```typescript
class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Mathematics",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

#### 2. Get All Subjects

**Endpoint:** `GET /academic/subjects`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Mathematics",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:30:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "name": "English",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:31:00Z"
  }
]
```

---

#### 3. Delete Subject

**Endpoint:** `DELETE /academic/subjects/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Subject ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### Grade Subjects Management

#### 1. Assign Subjects to Grade

**Endpoint:** `POST /academic/grade-subjects`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "grade_level_id": 1,
  "subject_master_ids": [
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

**Request DTO:**

```typescript
class AssignSubjectsToGradeDto {
  @IsInt()
  @IsNotEmpty()
  grade_level_id: number;

  @IsArray()
  @IsUUID("4", { each: true })
  subject_master_ids: string[];
}
```

**Response Body:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "grade_level_id": 1,
    "subject_master_id": "550e8400-e29b-41d4-a716-446655440002",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "subjects_master": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Mathematics"
    },
    "grade_levels": {
      "id": 1,
      "name": "Grade 10"
    }
  }
]
```

---

#### 2. Get All Grade Subjects

**Endpoint:** `GET /academic/grade-subjects`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "grade_level_id": 1,
    "subject_master_id": "550e8400-e29b-41d4-a716-446655440002",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "subjects_master": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Mathematics"
    },
    "grade_levels": {
      "id": 1,
      "name": "Grade 10"
    }
  }
]
```

---

#### 3. Get Subjects by Grade

**Endpoint:** `GET /academic/grade-subjects/grade/:gradeId`  
**Roles:** school_admin, teacher, super_admin  
**Parameters:**

- `gradeId` (path): Grade ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

#### 4. Delete Grade Subject

**Endpoint:** `DELETE /academic/grade-subjects/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Grade Subject ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### Teacher-Class Assignments

#### 1. Assign Teacher to Class

**Endpoint:** `POST /academic/teacher-classes`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "teacher_id": "550e8400-e29b-41d4-a716-446655440005",
  "class_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Request DTO:**

```typescript
class AssignTeacherToClassDto {
  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsUUID()
  @IsNotEmpty()
  class_id: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440006",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440005",
  "class_id": "550e8400-e29b-41d4-a716-446655440001",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-14T10:30:00Z",
  "classes": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Class 10-A"
  },
  "profiles": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "Teacher Name",
    "email": "teacher@example.com"
  }
}
```

---

#### 2. Get All Teacher Classes

**Endpoint:** `GET /academic/teacher-classes`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

#### 3. Get Classes by Teacher

**Endpoint:** `GET /academic/teacher-classes/teacher/:teacherId`  
**Roles:** school_admin, teacher, super_admin  
**Parameters:**

- `teacherId` (path): Teacher ID (UUID)

---

#### 4. Delete Teacher Class Assignment

**Endpoint:** `DELETE /academic/teacher-classes/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Teacher Class ID (UUID)

---

### Teacher-Subject Assignments

#### 1. Assign Subjects to Teacher

**Endpoint:** `POST /academic/teacher-subjects`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "teacher_id": "550e8400-e29b-41d4-a716-446655440005",
  "grade_subject_ids": ["550e8400-e29b-41d4-a716-446655440004"]
}
```

**Request DTO:**

```typescript
class AssignSubjectsToTeacherDto {
  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsArray()
  @IsUUID("4", { each: true })
  grade_subject_ids: string[];
}
```

---

#### 2. Get All Teacher Subjects

**Endpoint:** `GET /academic/teacher-subjects`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

#### 3. Get Subjects by Teacher

**Endpoint:** `GET /academic/teacher-subjects/teacher/:teacherId`  
**Roles:** school_admin, teacher, super_admin  
**Parameters:**

- `teacherId` (path): Teacher ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

#### 4. Delete Teacher Subject Assignment

**Endpoint:** `DELETE /academic/teacher-subjects/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Teacher Subject ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### File Categories Management

#### 1. Create File Category

**Endpoint:** `POST /academic/file-categories`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Study Materials"
}
```

**Request DTO:**

```typescript
class CreateFileCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Response Body:**

```json
{
  "id": 1,
  "name": "Study Materials",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

#### 2. Get All File Categories

**Endpoint:** `GET /academic/file-categories`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": 1,
    "name": "Study Materials",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:30:00Z"
  },
  {
    "id": 2,
    "name": "Assignments",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:31:00Z"
  }
]
```

---

#### 3. Update File Category

**Endpoint:** `PATCH /academic/file-categories/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): File Category ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Course Materials"
}
```

**Request DTO:**

```typescript
class UpdateFileCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;
}
```

---

#### 4. Delete File Category

**Endpoint:** `DELETE /academic/file-categories/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): File Category ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### Exam Types Management

#### 1. Create Exam Type

**Endpoint:** `POST /academic/exam-types`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Mid Term",
  "type": "School_Exam"
}
```

**Request DTO:**

```typescript
class CreateExamTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;
}

enum ExamTypeCategory {
  INTERNAL_ASSESSMENT = "Internal_Assessment",
  SCHOOL_EXAM = "School_Exam",
}
```

**Response Body:**

```json
{
  "id": 1,
  "name": "Mid Term",
  "type": "School_Exam",
  "school_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

#### 2. Get All Exam Types

**Endpoint:** `GET /academic/exam-types`  
**Roles:** school_admin, teacher, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": 1,
    "name": "Mid Term",
    "type": "School_Exam",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:30:00Z"
  }
]
```

---

#### 3. Update Exam Type

**Endpoint:** `PATCH /academic/exam-types/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Exam Type ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Mid Semester",
  "type": "Internal_Assessment"
}
```

**Request DTO:**

```typescript
class UpdateExamTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ExamTypeCategory)
  @IsOptional()
  type?: ExamTypeCategory;
}
```

---

#### 4. Delete Exam Type

**Endpoint:** `DELETE /academic/exam-types/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Exam Type ID (integer)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

### Timetable Management

#### 1. Get Weekly Timetable

**Endpoint:** `GET /academic/timetable/class/:classId`  
**Roles:** school_admin, teacher, super_admin  
**Parameters:**

- `classId` (path): Class ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
{
  "1": {
    "id": "550e8400-e29b-41d4-a716-446655440007",
    "class_id": "550e8400-e29b-41d4-a716-446655440001",
    "day_of_week": 1,
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "timetable_periods": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440008",
        "timetable_day_id": "550e8400-e29b-41d4-a716-446655440007",
        "period_number": 1,
        "subject_id": "550e8400-e29b-41d4-a716-446655440004",
        "teacher_id": "550e8400-e29b-41d4-a716-446655440005",
        "start_time": "09:00",
        "end_time": "10:00",
        "room": "A101",
        "grade_subjects": {
          "id": "550e8400-e29b-41d4-a716-446655440004",
          "subjects_master": {
            "name": "Mathematics"
          }
        },
        "profiles": {
          "id": "550e8400-e29b-41d4-a716-446655440005",
          "name": "Teacher Name"
        }
      }
    ]
  }
}
```

---

#### 2. Create or Update Period

**Endpoint:** `POST /academic/timetable/periods`  
**Roles:** school_admin, super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "class_id": "550e8400-e29b-41d4-a716-446655440001",
  "day_of_week": 1,
  "period_number": 1,
  "subject_id": "550e8400-e29b-41d4-a716-446655440004",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440005",
  "start_time": "09:00",
  "end_time": "10:00",
  "room": "A101"
}
```

**Request DTO:**

```typescript
class CreatePeriodDto {
  @IsUUID()
  @IsNotEmpty()
  class_id: string;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsNotEmpty()
  day_of_week: number; // 1=Monday, 7=Sunday

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  period_number: number;

  @IsUUID()
  @IsNotEmpty()
  subject_id: string; // This is grade_subjects.id

  @IsUUID()
  @IsNotEmpty()
  teacher_id: string;

  @IsString()
  @IsNotEmpty()
  start_time: string; // HH:MM format

  @IsString()
  @IsNotEmpty()
  end_time: string; // HH:MM format

  @IsString()
  @IsOptional()
  room?: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "timetable_day_id": "550e8400-e29b-41d4-a716-446655440007",
  "period_number": 1,
  "subject_id": "550e8400-e29b-41d4-a716-446655440004",
  "teacher_id": "550e8400-e29b-41d4-a716-446655440005",
  "start_time": "09:00",
  "end_time": "10:00",
  "room": "A101"
}
```

---

#### 3. Update Period

**Endpoint:** `PATCH /academic/timetable/periods/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Period ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "period_number": 2,
  "start_time": "10:00",
  "end_time": "11:00"
}
```

**Request DTO:**

```typescript
class UpdatePeriodDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  period_number?: number;

  @IsUUID()
  @IsOptional()
  subject_id?: string;

  @IsUUID()
  @IsOptional()
  teacher_id?: string;

  @IsString()
  @IsOptional()
  start_time?: string;

  @IsString()
  @IsOptional()
  end_time?: string;

  @IsString()
  @IsOptional()
  room?: string;
}
```

---

#### 4. Delete Period

**Endpoint:** `DELETE /academic/timetable/periods/:id`  
**Roles:** school_admin, super_admin  
**Parameters:**

- `id` (path): Period ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Schools API

### Base URL

```
/schools
```

All Schools API endpoints require JWT authentication with super_admin role.

### 1. Create School

**Endpoint:** `POST /schools`  
**Roles:** super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "ABC High School",
  "admin_profile_id": "550e8400-e29b-41d4-a716-446655440009"
}
```

**Request DTO:**

```typescript
class CreateSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsOptional()
  admin_profile_id?: string;
}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "ABC High School",
  "admin_profile_id": "550e8400-e29b-41d4-a716-446655440009",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

### 2. Onboard School

**Endpoint:** `POST /schools/onboard`  
**Roles:** super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "XYZ School",
  "admin_email": "admin@xyzschool.com",
  "admin_password": "AdminPassword123",
  "admin_name": "School Admin"
}
```

**Request DTO:**

```typescript
class OnboardSchoolDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  admin_email: string;

  @IsString()
  @IsNotEmpty()
  admin_password: string;

  @IsString()
  @IsNotEmpty()
  admin_name: string;
}
```

**Response Body:**

```json
{
  "school": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "XYZ School",
    "created_at": "2025-12-14T10:30:00Z"
  },
  "admin": {
    "id": "550e8400-e29b-41d4-a716-446655440009",
    "email": "admin@xyzschool.com",
    "name": "School Admin",
    "role": "school_admin"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. Get All Schools

**Endpoint:** `GET /schools`  
**Roles:** super_admin

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "ABC High School",
    "admin_profile_id": "550e8400-e29b-41d4-a716-446655440009",
    "created_at": "2025-12-14T10:30:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "name": "XYZ School",
    "admin_profile_id": "550e8400-e29b-41d4-a716-446655440012",
    "created_at": "2025-12-14T10:31:00Z"
  }
]
```

---

### 4. Get School by ID

**Endpoint:** `GET /schools/:id`  
**Roles:** super_admin  
**Parameters:**

- `id` (path): School ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "ABC High School",
  "admin_profile_id": "550e8400-e29b-41d4-a716-446655440009",
  "created_at": "2025-12-14T10:30:00Z"
}
```

---

### 5. Update School

**Endpoint:** `PATCH /schools/:id`  
**Roles:** super_admin  
**Parameters:**

- `id` (path): School ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "ABC Public High School"
}
```

**Request DTO:**

```typescript
class UpdateSchoolDto extends PartialType(CreateSchoolDto) {}
```

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "ABC Public High School",
  "admin_profile_id": "550e8400-e29b-41d4-a716-446655440009",
  "updated_at": "2025-12-14T11:00:00Z"
}
```

---

### 6. Delete School

**Endpoint:** `DELETE /schools/:id`  
**Roles:** super_admin  
**Parameters:**

- `id` (path): School ID (UUID)

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Response Body:**

```json
{
  "message": "School deleted successfully",
  "success": true
}
```

---

## AI API

### Base URL

```
/ai
```

All AI API endpoints require JWT authentication.

### Available Task Types

- `EXPLAIN` - Explain a concept
- `SOLVE` - Solve a problem
- `DOUBT` - Answer student doubts
- `SUMMARY` - Summarize content
- `EXPAND` - Expand on a topic
- `STUDY_PLAN` - Generate a study plan
- `PREDICT` - Predict exam performance
- `MOCK_TEST` - Generate mock test
- `LIFE_SKILL` - Life skills guidance

---

### 1. Explain Endpoint

**Endpoint:** `POST /ai/explain`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "How does photosynthesis work?",
  "subject": "Biology",
  "topic": "Photosynthesis",
  "classBand": "high",
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "additionalContext": {}
}
```

**Response Body:**

```json
{
  "title": "Understanding Photosynthesis",
  "keyPoints": [
    "Photosynthesis is the process by which plants convert light energy into chemical energy",
    "It occurs in two stages: light-dependent and light-independent reactions",
    "The process produces glucose and oxygen"
  ],
  "explanation": "Photosynthesis is a vital biological process that occurs in plants and some microorganisms...",
  "personalizedFeedback": "Great question! This is an important concept at your level.",
  "followUpQuestion": "Can you describe where photosynthesis occurs within the plant cell?",
  "rawResponse": "...",
  "metadata": {}
}
```

---

### 2. Solve Endpoint

**Endpoint:** `POST /ai/solve`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "Solve: 2x + 5 = 15",
  "subject": "Mathematics",
  "topic": "Algebra",
  "classBand": "middle"
}
```

**Response Body:**

```json
{
  "title": "Solving Linear Equation",
  "keyPoints": [
    "Subtract 5 from both sides: 2x = 10",
    "Divide by 2: x = 5",
    "Always perform same operation on both sides"
  ],
  "explanation": "To solve 2x + 5 = 15, we need to isolate x...",
  "personalizedFeedback": "Good problem! Let me show you the step-by-step solution.",
  "followUpQuestion": "Can you verify the answer by substituting x = 5 back into the original equation?"
}
```

---

### 3. Doubt Endpoint

**Endpoint:** `POST /ai/doubt`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "I don't understand why water boils at 100°C",
  "subject": "Physics",
  "topic": "Heat and Temperature"
}
```

**Response Body:**

```json
{
  "title": "Understanding Boiling Point",
  "explanation": "Water molecules at the surface have enough energy to escape into the gas phase at 100°C...",
  "personalizedFeedback": "This is a common doubt! Let me clarify..."
}
```

---

### 4. Summary Endpoint

**Endpoint:** `POST /ai/summary`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "The entire chapter on the French Revolution",
  "subject": "History",
  "topic": "French Revolution"
}
```

**Response Body:**

```json
{
  "title": "French Revolution Summary",
  "keyPoints": [
    "Period: 1789-1799",
    "Main causes: Financial crisis, Enlightenment ideas, food shortages",
    "Major outcomes: End of feudalism, Declaration of Rights, republic formed"
  ],
  "explanation": "The French Revolution was a period of social upheaval..."
}
```

---

### 5. Expand Endpoint

**Endpoint:** `POST /ai/expand`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "Democracy",
  "subject": "Social Studies",
  "topic": "Government Systems"
}
```

---

### 6. Study Plan Endpoint

**Endpoint:** `POST /ai/studyplan`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "Create a study plan for Mathematics",
  "subject": "Mathematics",
  "classBand": "high",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Body:**

```json
{
  "title": "Personalized Math Study Plan",
  "keyPoints": [
    "Week 1: Algebra fundamentals and equations",
    "Week 2: Quadratic equations and graphs",
    "Week 3: Polynomials and factorization",
    "Week 4: Trigonometry basics",
    "Week 5: Revision and practice problems"
  ],
  "explanation": "This study plan is tailored to your learning pace and level...",
  "personalizedFeedback": "Based on your academic profile, here's a customized plan."
}
```

---

### 7. Predict Endpoint

**Endpoint:** `POST /ai/predict`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "Predict my exam performance",
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "subject": "Mathematics"
}
```

**Response Body:**

```json
{
  "title": "Exam Performance Prediction",
  "explanation": "Based on your recent assignments and test scores...",
  "personalizedFeedback": "You're showing strong progress in algebra!"
}
```

---

### 8. Mock Test Endpoint

**Endpoint:** `POST /ai/mocktest`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "Generate a mock test on Calculus",
  "subject": "Mathematics",
  "topic": "Calculus",
  "classBand": "advanced"
}
```

---

### 9. Life Skill Endpoint

**Endpoint:** `POST /ai/lifeskill`  
**Authentication:** Required (JWT Token)  
**Status Code:** 200 OK

**Request Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "query": "How to manage stress during exams",
  "studentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Body:**

```json
{
  "title": "Exam Stress Management",
  "keyPoints": [
    "Practice relaxation techniques: deep breathing, meditation",
    "Maintain a healthy sleep schedule",
    "Exercise regularly",
    "Break study sessions into manageable chunks",
    "Positive self-talk and visualization"
  ],
  "explanation": "Managing stress is crucial for academic success...",
  "personalizedFeedback": "Here are evidence-based strategies to help you manage exam anxiety."
}
```

---

### AI Request DTO

```typescript
class AiRequestDto {
  @IsEnum(AiTaskType)
  taskType: AiTaskType;

  @IsString()
  @IsNotEmpty()
  query: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  classBand?: string; // e.g., 'primary', 'middle', 'high', 'advanced'

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsOptional()
  additionalContext?: any;
}
```

---

### AI Response DTO

```typescript
class AiResponseDto {
  title: string;
  keyPoints: string[];
  explanation: string;
  personalizedFeedback?: string;
  followUpQuestion?: string;
  rawResponse?: string;
  metadata?: any;
}
```

---

## Authentication Headers

All protected endpoints require the following header:

```
Authorization: Bearer <access_token>
```

Example:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE2MzUyNzQ4MDAsImV4cCI6MTYzNTI3ODQwMH0.signature
```

---

## Error Responses

### Common Error Responses

**400 Bad Request:**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

**401 Unauthorized:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized access",
  "error": "Unauthorized"
}
```

**403 Forbidden:**

```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

**404 Not Found:**

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

**500 Internal Server Error:**

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. It is recommended to implement rate limiting in production.

---

## Pagination

Some list endpoints may support pagination via query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

---

## CORS Configuration

CORS is enabled for all origins. In production, configure allowed origins in the main.ts file.

---

## Version Information

**API Version:** 1.0.0  
**Backend Framework:** NestJS  
**Database:** PostgreSQL  
**Last Updated:** December 14, 2025

---

## Support

For API support and issues, please contact the development team or create an issue in the project repository.
