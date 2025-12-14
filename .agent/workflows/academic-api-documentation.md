# Academic Module API Documentation

## Base URL
```
http://localhost:3000/academic
```

All requests require JWT authentication via `Authorization: Bearer <token>` header.

---

## 1. Grade Levels

### Create Grade
**Endpoint:** `POST /academic/grades`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Grade 10"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Grade 10",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Get All Grades
**Endpoint:** `GET /academic/grades`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Grade 10",
    "school_id": "uuid-string",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Update Grade
**Endpoint:** `PATCH /academic/grades/:id`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Grade 10 Updated"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Grade 10 Updated",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Delete Grade
**Endpoint:** `DELETE /academic/grades/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Grade deleted successfully"
}
```

---

## 2. Classes

### Create Class
**Endpoint:** `POST /academic/classes`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "10-A",
  "grade_level_id": 1
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-string",
  "name": "10-A",
  "school_id": "uuid-string",
  "grade_level_id": 1,
  "grade_levels": {
    "id": 1,
    "name": "Grade 10"
  },
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Get All Classes
**Endpoint:** `GET /academic/classes`  
**Roles:** `school_admin`, `teacher`, `super_admin`, `student`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "name": "10-A",
    "school_id": "uuid-string",
    "grade_level_id": 1,
    "grade_levels": {
      "id": 1,
      "name": "Grade 10"
    },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Update Class
**Endpoint:** `PATCH /academic/classes/:id`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "10-B",
  "grade_level_id": 1
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid-string",
  "name": "10-B",
  "school_id": "uuid-string",
  "grade_level_id": 1,
  "grade_levels": {
    "id": 1,
    "name": "Grade 10"
  },
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Delete Class
**Endpoint:** `DELETE /academic/classes/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Class deleted successfully"
}
```

---

## 3. Master Subjects

### Create Subject
**Endpoint:** `POST /academic/subjects`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Mathematics"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-string",
  "name": "Mathematics",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Get All Subjects
**Endpoint:** `GET /academic/subjects`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "name": "Mathematics",
    "school_id": "uuid-string",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Delete Subject
**Endpoint:** `DELETE /academic/subjects/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Subject deleted successfully"
}
```

---

## 4. Grade Subjects (Subject-Grade Mapping)

### Assign Subjects to Grade
**Endpoint:** `POST /academic/grade-subjects`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "grade_level_id": 1,
  "subject_master_ids": [
    "uuid-subject-1",
    "uuid-subject-2"
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "2 subject(s) assigned to grade",
  "count": 2
}
```

---

### Get All Grade-Subject Mappings
**Endpoint:** `GET /academic/grade-subjects`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "grade_level_id": 1,
    "subject_master_id": "uuid-subject-1",
    "school_id": "uuid-string",
    "subjects_master": {
      "id": "uuid-subject-1",
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

### Get Subjects by Grade
**Endpoint:** `GET /academic/grade-subjects/grade/:gradeId`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "grade_level_id": 1,
    "subject_master_id": "uuid-subject-1",
    "school_id": "uuid-string",
    "subjects_master": {
      "id": "uuid-subject-1",
      "name": "Mathematics"
    }
  }
]
```

---

### Delete Grade-Subject Mapping
**Endpoint:** `DELETE /academic/grade-subjects/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Subject removed from grade successfully"
}
```

---

## 5. Teacher-Class Assignments

### Assign Teacher to Class
**Endpoint:** `POST /academic/teacher-classes`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "teacher_id": "uuid-teacher-id",
  "class_id": "uuid-class-id"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-string",
  "teacher_id": "uuid-teacher-id",
  "class_id": "uuid-class-id",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z",
  "classes": {
    "id": "uuid-class-id",
    "name": "10-A"
  },
  "profiles": {
    "id": "uuid-teacher-id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### Get All Teacher-Class Assignments
**Endpoint:** `GET /academic/teacher-classes`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "teacher_id": "uuid-teacher-id",
    "class_id": "uuid-class-id",
    "school_id": "uuid-string",
    "created_at": "2024-01-01T00:00:00.000Z",
    "classes": {
      "id": "uuid-class-id",
      "name": "10-A"
    },
    "profiles": {
      "id": "uuid-teacher-id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

---

### Get Classes for Teacher
**Endpoint:** `GET /academic/teacher-classes/teacher/:teacherId`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "teacher_id": "uuid-teacher-id",
    "class_id": "uuid-class-id",
    "school_id": "uuid-string",
    "created_at": "2024-01-01T00:00:00.000Z",
    "classes": {
      "id": "uuid-class-id",
      "name": "10-A"
    }
  }
]
```

---

### Delete Teacher-Class Assignment
**Endpoint:** `DELETE /academic/teacher-classes/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Teacher removed from class successfully"
}
```

---

## 6. Teacher-Subject Assignments

### Assign Subjects to Teacher
**Endpoint:** `POST /academic/teacher-subjects`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "teacher_id": "uuid-teacher-id",
  "grade_subject_ids": [
    "uuid-grade-subject-1",
    "uuid-grade-subject-2"
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "2 subject(s) assigned to teacher",
  "count": 2
}
```

---

### Get All Teacher-Subject Assignments
**Endpoint:** `GET /academic/teacher-subjects`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "teacher_id": "uuid-teacher-id",
    "grade_subject_id": "uuid-grade-subject-id",
    "school_id": "uuid-string",
    "assigned_at": "2024-01-01T00:00:00.000Z",
    "grade_subjects": {
      "id": "uuid-grade-subject-id",
      "subjects_master": {
        "name": "Mathematics"
      },
      "grade_levels": {
        "name": "Grade 10"
      }
    }
  }
]
```

---

### Get Subjects for Teacher
**Endpoint:** `GET /academic/teacher-subjects/teacher/:teacherId`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid-string",
    "teacher_id": "uuid-teacher-id",
    "grade_subject_id": "uuid-grade-subject-id",
    "school_id": "uuid-string",
    "assigned_at": "2024-01-01T00:00:00.000Z",
    "grade_subjects": {
      "id": "uuid-grade-subject-id",
      "subjects_master": {
        "id": "uuid-subject-id",
        "name": "Mathematics"
      },
      "grade_levels": {
        "id": 1,
        "name": "Grade 10"
      }
    }
  }
]
```

---

### Delete Teacher-Subject Assignment
**Endpoint:** `DELETE /academic/teacher-subjects/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Subject removed from teacher successfully"
}
```

---

## 7. File Categories

### Create File Category
**Endpoint:** `POST /academic/file-categories`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Textbooks"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Textbooks",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Get All File Categories
**Endpoint:** `GET /academic/file-categories`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Textbooks",
    "school_id": "uuid-string",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Update File Category
**Endpoint:** `PATCH /academic/file-categories/:id`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Reference Books"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Reference Books",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Delete File Category
**Endpoint:** `DELETE /academic/file-categories/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "File category deleted successfully"
}
```

---

## 8. Exam Types

### Create Exam Type
**Endpoint:** `POST /academic/exam-types`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Mid-Term",
  "type": "Internal Assessment"
}
```

**Note:** `type` must be one of: `"Internal Assessment"` or `"School Exam"`

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Mid-Term",
  "type": "Internal Assessment",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Get All Exam Types
**Endpoint:** `GET /academic/exam-types`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Mid-Term",
    "type": "Internal Assessment",
    "school_id": "uuid-string",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Update Exam Type
**Endpoint:** `PATCH /academic/exam-types/:id`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "name": "Mid-Term Updated",
  "type": "School Exam"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Mid-Term Updated",
  "type": "School Exam",
  "school_id": "uuid-string",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

### Delete Exam Type
**Endpoint:** `DELETE /academic/exam-types/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Exam type deleted successfully"
}
```

---

## 9. Timetable

### Get Weekly Timetable for Class
**Endpoint:** `GET /academic/timetable/class/:classId`  
**Roles:** `school_admin`, `teacher`, `super_admin`

**Response:** `200 OK`
```json
{
  "1": {
    "id": "uuid-day-id",
    "class_id": "uuid-class-id",
    "day_of_week": 1,
    "school_id": "uuid-string",
    "timetable_periods": [
      {
        "id": "uuid-period-id",
        "timetable_day_id": "uuid-day-id",
        "period_number": 1,
        "subject_id": "uuid-grade-subject-id",
        "teacher_id": "uuid-teacher-id",
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "room": "Room 101",
        "grade_subjects": {
          "id": "uuid-grade-subject-id",
          "subjects_master": {
            "name": "Mathematics"
          }
        },
        "profiles": {
          "id": "uuid-teacher-id",
          "name": "John Doe"
        }
      }
    ]
  },
  "2": { ... }
}
```

**Note:** Object keys are day_of_week (1=Monday, 2=Tuesday, ..., 7=Sunday)

---

### Create/Update Period
**Endpoint:** `POST /academic/timetable/periods`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "class_id": "uuid-class-id",
  "day_of_week": 1,
  "period_number": 1,
  "subject_id": "uuid-grade-subject-id",
  "teacher_id": "uuid-teacher-id",
  "start_time": "09:00",
  "end_time": "10:00",
  "room": "Room 101"
}
```

**Note:** If a period already exists for the same day and period_number, it will be updated.

**Response:** `201 Created`
```json
{
  "id": "uuid-period-id",
  "timetable_day_id": "uuid-day-id",
  "period_number": 1,
  "subject_id": "uuid-grade-subject-id",
  "teacher_id": "uuid-teacher-id",
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "room": "Room 101",
  "grade_subjects": {
    "id": "uuid-grade-subject-id",
    "subjects_master": {
      "name": "Mathematics"
    }
  },
  "profiles": {
    "id": "uuid-teacher-id",
    "name": "John Doe"
  }
}
```

---

### Update Period
**Endpoint:** `PATCH /academic/timetable/periods/:id`  
**Roles:** `school_admin`, `super_admin`

**Request Body:**
```json
{
  "subject_id": "uuid-other-subject-id",
  "teacher_id": "uuid-other-teacher-id",
  "start_time": "10:00",
  "end_time": "11:00",
  "room": "Room 102"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid-period-id",
  "timetable_day_id": "uuid-day-id",
  "period_number": 1,
  "subject_id": "uuid-other-subject-id",
  "teacher_id": "uuid-other-teacher-id",
  "start_time": "10:00:00",
  "end_time": "11:00:00",
  "room": "Room 102",
  "grade_subjects": {
    "id": "uuid-other-subject-id",
    "subjects_master": {
      "name": "Physics"
    }
  },
  "profiles": {
    "id": "uuid-other-teacher-id",
    "name": "Jane Smith"
  }
}
```

---

### Delete Period
**Endpoint:** `DELETE /academic/timetable/periods/:id`  
**Roles:** `school_admin`, `super_admin`

**Response:** `200 OK`
```json
{
  "message": "Period deleted successfully"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["name should not be empty"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Grade not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Teacher is already assigned to this class",
  "error": "Conflict"
}
```
