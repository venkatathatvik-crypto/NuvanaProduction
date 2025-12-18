# Analytics API Documentation

## Overview
This document outlines the backend module structure, APIs, data requirements, and mathematical formulas for implementing comprehensive analytics for both Student and Teacher dashboards.

---

## Table of Contents
1. [Student Analytics](#student-analytics)
2. [Teacher Analytics](#teacher-analytics)
3. [Mathematical Formulas](#mathematical-formulas)
4. [Database Schema Reference](#database-schema-reference)
5. [API Endpoints](#api-endpoints)

---

## Student Analytics

### UI Components Analysis

#### 1. **Stats Summary Cards** (4 cards)
- **Overall Score**: Average percentage across all graded tests
- **Tests Taken**: Total count of graded test submissions
- **Best Subject**: Subject with highest average score
- **Attendance Percentage**: Overall attendance rate

#### 2. **Subject Performance Radar Chart**
- Shows performance across all subjects
- Data: Subject name, Score percentage, Full marks

#### 3. **Progress Trend Area Chart**
- Monthly progression of average scores
- Data: Month name, Score percentage

#### 4. **Strengths & Weaknesses Cards**
- **Strengths**: Subjects/topics with mastery ≥ 80%
- **Weaknesses**: Subjects/topics with mastery < 60%

#### 5. **Chapter & Topic Performance**
- **Chapter Performance**: Bar chart showing average scores per chapter
- **Topic Performance**: Bar chart showing average scores per topic
- Includes: Name, Average score, Total questions, Related chapters (for topics)

---

## Teacher Analytics

### UI Components Analysis

#### Tab 1: **Class Insights**
1. **Class Performance Trend** (Line Chart)
   - Average scores and attendance over last 6 months
   - Data: Month, Average Score (%), Attendance Rate (%)

2. **Subject Averages** (Bar Chart)
   - Overall class performance by subject
   - Data: Subject name, Class Average (%)

3. **Attendance vs. Marks Correlation** (Scatter Chart)
   - Pearson correlation between attendance and test scores
   - Data: Attendance (%), Marks (%)

#### Tab 2: **Chapter & Topics**
1. **Chapter Performance** (Bar Chart)
   - Average scores by chapter for the class
   - Data: Chapter name, Average score (%), Total questions

2. **Topic Performance** (Bar Chart)
   - Average scores by topic for the class
   - Data: Topic name, Average score (%), Total questions, Related chapters

3. **Weak Areas Identification**
   - Chapters/Topics with average < 60%

#### Tab 3: **Student Analysis**
1. **Class Subject Performance Overview** (Radar Chart)
   - Class average across all subjects

2. **Student Performance List**
   - Top Performers (sorted by avgScore)
   - Needs Attention (avgScore < 60%)
   - Data: Student name, Average score, Attendance percentage

3. **Individual Student Analytics** (when student selected)
   - Subject performance radar
   - Strengths and weaknesses

#### Tab 4: **Test Metrics**
1. **Recent Test Performance** (Area Chart)
   - Class average vs. top performer for each test
   - Data: Test name, Class Average (%), Top Score (%)

2. **Question Type Distribution** (Pie Chart)
   - Breakdown of question types across all tests
   - Data: Question type, Count

---

## Mathematical Formulas

### 1. Topic & Chapter Mastery (Strength/Weakness)

**Formula for Student-Topic Mastery:**
```
M_{s,t} = (Σ Earned Points_{s,t} / Σ Possible Points_{s,t}) × 100
```

**Where:**
- `M_{s,t}` = Mastery percentage for student `s` and topic `t`
- `Earned Points_{s,t}` = Sum of marks obtained for all questions in topic `t`
- `Possible Points_{s,t}` = Sum of maximum marks for all questions in topic `t`

**Logic:**
- For MCQ questions: Check if `selected_option == correct_option`, if yes, award full marks
- For Subjective questions: Use teacher's graded marks from `student_answers.marks_obtained`
- If `M_{s,t} ≥ 80%`: Topic is a **Strength**
- If `M_{s,t} < 60%`: Topic is a **Weakness**

**Same formula applies for Chapter-level mastery** (replace topic with chapter).

---

### 2. Group Analytics (Class-wide Weaknesses)

**Formula for Class Mean Mastery (CMM):**
```
CMM_t = (Σ_{i=1}^{n} M_{i,t}) / n
```

**Where:**
- `CMM_t` = Class Mean Mastery for topic `t`
- `M_{i,t}` = Individual mastery of student `i` for topic `t`
- `n` = Number of students who took tests containing topic `t`

**Logic:**
- If `CMM_t < 50%`: Entire class is struggling with Topic `t` → **Class Weakness**
- If `CMM_t > 80%`: Class is strong in Topic `t` → **Class Strength**

---

### 3. Attendance Correlation (Pearson Correlation Coefficient)

**Formula:**
```
r = Σ(x_i - x̄)(y_i - ȳ) / √[Σ(x_i - x̄)² × Σ(y_i - ȳ)²]
```

**Where:**
- `r` = Pearson correlation coefficient
- `x_i` = Attendance percentage for student `i`
- `y_i` = Average test marks percentage for student `i`
- `x̄` = Mean attendance percentage
- `ȳ` = Mean test marks percentage

**Interpretation:**
- `r ≈ 1`: Perfect positive correlation (Higher attendance = Higher marks)
- `r ≈ 0`: No correlation (Attendance has no impact on marks)
- `r ≈ -1`: Perfect negative correlation (Rare: Higher attendance = Lower marks)

**Data Points Required:**
- For each student in the class:
  - `X`: Attendance percentage (from `attendance` table)
  - `Y`: Average test marks percentage (from `test_submissions`)

---

## Database Schema Reference

### Key Tables

#### `tests`
- `id` (UUID)
- `class_id` (UUID)
- `school_id` (UUID)
- `title` (String)
- `due_date` (DateTime)
- `exam_type_id` (Int) → Links to `exam_types`

#### `questions`
- `id` (UUID)
- `test_id` (UUID)
- `question_text` (String)
- `question_type` (Enum: MCQ, Essay, Short_Answer, Very_Short_Answer)
- `marks` (Int)
- `chapter` (String?)
- `topic` (String?)

#### `question_options`
- `id` (UUID)
- `question_id` (UUID)
- `option_text` (String)
- `is_correct` (Boolean)

#### `student_answers`
- `id` (UUID)
- `submission_id` (UUID) → Links to `test_submissions`
- `question_id` (UUID)
- `selected_option_id` (UUID?) → For MCQ
- `answer_text` (String?) → For subjective
- `marks_obtained` (Decimal?) → Teacher graded marks

#### `test_submissions`
- `id` (UUID)
- `test_id` (UUID)
- `student_id` (UUID)
- `submitted_at` (DateTime)
- `total_marks_obtained` (Decimal)
- `is_graded` (Boolean)

#### `attendance`
- `id` (UUID)
- `student_id` (UUID)
- `attendance_date` (Date)
- `status` (Enum: present, absent)
- `school_id` (UUID)

#### `grade_subjects`
- `id` (UUID)
- `grade_level_id` (Int)
- `subject_id` (UUID) → Links to `subjects_master`

#### `subjects_master`
- `id` (UUID)
- `name` (String)

---

## API Endpoints

### Backend Module: `analytics`

### Student Analytics APIs

#### 1. GET `/analytics/student/:studentId/stats-summary`
**Description:** Get overall statistics summary for a student

**Request:**
- Path Parameter: `studentId` (UUID)

**Response:**
```json
{
  "overallPercentage": 85,
  "totalTests": 12,
  "bestSubject": "Mathematics",
  "attendancePercentage": 92
}
```

**Calculation Logic:**
- `overallPercentage`: Average of all graded test submissions
- `totalTests`: Count of `test_submissions` where `is_graded = true`
- `bestSubject`: Subject with highest average from subject performance
- `attendancePercentage`: From attendance service

---

#### 2. GET `/analytics/student/:studentId/subject-performance`
**Description:** Get performance breakdown by subject

**Request:**
- Path Parameter: `studentId` (UUID)

**Response:**
```json
[
  {
    "subject": "Mathematics",
    "score": 450,
    "fullMark": 500,
    "percentage": 90
  },
  {
    "subject": "Science",
    "score": 380,
    "fullMark": 500,
    "percentage": 76
  }
]
```

**Calculation Logic:**
- Group `test_submissions` by subject (via `tests` → `grade_subjects` → `subjects_master`)
- For each subject:
  - Sum `total_marks_obtained` from all graded submissions
  - Sum total possible marks from all questions in those tests
  - Calculate percentage

---

#### 3. GET `/analytics/student/:studentId/progress-trend`
**Description:** Get monthly progress trend

**Request:**
- Path Parameter: `studentId` (UUID)

**Response:**
```json
[
  {
    "month": "Jan",
    "score": 75
  },
  {
    "month": "Feb",
    "score": 82
  },
  {
    "month": "Mar",
    "score": 88
  }
]
```

**Calculation Logic:**
- Group `test_submissions` by month (from `submitted_at`)
- For each month:
  - Calculate average percentage: `(total_marks_obtained / total_possible_marks) × 100`
  - Return last 6 months

---

#### 4. GET `/analytics/student/:studentId/strengths-weaknesses`
**Description:** Get strengths and weaknesses based on topic/chapter mastery

**Request:**
- Path Parameter: `studentId` (UUID)

**Response:**
```json
{
  "strengths": [
    {
      "subject": "Mathematics",
      "desc": "Excellent performance - 92% average",
      "topic": "Algebra",
      "mastery": 95
    }
  ],
  "weaknesses": [
    {
      "subject": "Science",
      "desc": "Room for improvement - 55% average",
      "topic": "Physics",
      "mastery": 45
    }
  ]
}
```

**Calculation Logic:**
- Calculate mastery for each topic using formula: `M_{s,t} = (Σ Earned Points / Σ Possible Points) × 100`
- **Strengths**: Topics/chapters where `M_{s,t} ≥ 80%`
- **Weaknesses**: Topics/chapters where `M_{s,t} < 60%`
- Group by subject for display

---

#### 5. GET `/analytics/student/:studentId/chapter-topic-analytics`
**Description:** Get detailed chapter and topic performance breakdown

**Request:**
- Path Parameter: `studentId` (UUID)

**Response:**
```json
{
  "chapters": [
    {
      "name": "Algebra Basics",
      "avgScore": 85,
      "totalQuestions": 25,
      "mastery": 85
    }
  ],
  "topics": [
    {
      "name": "Linear Equations",
      "avgScore": 90,
      "totalQuestions": 15,
      "chapters": ["Algebra Basics", "Advanced Algebra"],
      "mastery": 90
    }
  ]
}
```

**Calculation Logic:**
- For each chapter:
  - Filter questions by `chapter` field
  - Calculate mastery: `M_{s,chapter} = (Σ marks_obtained / Σ marks) × 100`
  - Count total questions
- For each topic:
  - Filter questions by `topic` field
  - Calculate mastery: `M_{s,topic} = (Σ marks_obtained / Σ marks) × 100`
  - Collect all chapters that contain this topic
  - Count total questions

---

### Teacher Analytics APIs

#### 6. GET `/analytics/class/:classId/performance-trend`
**Description:** Get class performance trend over time

**Request:**
- Path Parameter: `classId` (UUID)

**Response:**
```json
[
  {
    "month": "Jan",
    "avgScore": 72,
    "attendance": 88
  },
  {
    "month": "Feb",
    "avgScore": 75,
    "attendance": 90
  }
]
```

**Calculation Logic:**
- Group all graded `test_submissions` for students in the class by month
- For each month:
  - `avgScore`: Average of all student percentages
  - `attendance`: Calculate from `attendance` table for students in class
- Return last 6 months

---

#### 7. GET `/analytics/class/:classId/subject-averages`
**Description:** Get class average performance by subject

**Request:**
- Path Parameter: `classId` (UUID)

**Response:**
```json
[
  {
    "subject": "Mathematics",
    "avg": 78
  },
  {
    "subject": "Science",
    "avg": 72
  }
]
```

**Calculation Logic:**
- For each subject:
  - Get all graded submissions for tests in that subject
  - Calculate average percentage across all students
  - Return sorted by average (descending)

---

#### 8. GET `/analytics/class/:classId/attendance-vs-marks`
**Description:** Get attendance vs marks correlation data

**Request:**
- Path Parameter: `classId` (UUID)

**Response:**
```json
[
  {
    "studentId": "uuid-1",
    "studentName": "John Doe",
    "attendance": 92,
    "marks": 85,
    "correlation": 0.75
  }
]
```

**Calculation Logic:**
- For each student in the class:
  - Calculate `attendance`: From `attendance` table (present days / total days) × 100
  - Calculate `marks`: Average percentage from all graded `test_submissions`
- Calculate Pearson correlation coefficient using the formula
- Return array of individual data points + overall correlation

---

#### 9. GET `/analytics/class/:classId/chapter-topic-analytics`
**Description:** Get class-wide chapter and topic performance

**Request:**
- Path Parameter: `classId` (UUID)
- Query Parameter (optional): `subjectId` (UUID) - Filter by specific subject

**Response:**
```json
{
  "chapters": [
    {
      "name": "Algebra Basics",
      "avgScore": 72,
      "totalQuestions": 150,
      "classMastery": 72
    }
  ],
  "topics": [
    {
      "name": "Linear Equations",
      "avgScore": 75,
      "totalQuestions": 80,
      "chapters": ["Algebra Basics"],
      "classMastery": 75
    }
  ]
}
```

**Calculation Logic:**
- For each chapter:
  - Calculate Class Mean Mastery: `CMM_chapter = (Σ M_{i,chapter}) / n`
  - Count total questions across all tests
- For each topic:
  - Calculate Class Mean Mastery: `CMM_topic = (Σ M_{i,topic}) / n`
  - Collect related chapters
  - Count total questions
- Identify weak areas: `CMM < 50%` → Class Weakness

---

#### 10. GET `/analytics/class/:classId/students-with-scores`
**Description:** Get list of students with their average scores and attendance

**Request:**
- Path Parameter: `classId` (UUID)

**Response:**
```json
[
  {
    "id": "uuid-1",
    "name": "John Doe",
    "avgScore": 85,
    "attendancePercentage": 92
  }
]
```

**Calculation Logic:**
- For each student in the class:
  - `avgScore`: Average percentage from all graded `test_submissions`
  - `attendancePercentage`: From attendance service
- Sort by `avgScore` (descending)

---

#### 11. GET `/analytics/class/:classId/recent-tests-metrics`
**Description:** Get metrics for recent tests

**Request:**
- Path Parameter: `classId` (UUID)
- Query Parameter (optional): `limit` (number, default: 10)

**Response:**
```json
[
  {
    "test": "Math Test 1",
    "avg": 75,
    "top": 95
  }
]
```

**Calculation Logic:**
- Get last N tests for the class
- For each test:
  - `avg`: Average percentage across all students
  - `top`: Highest percentage achieved

---

#### 12. GET `/analytics/class/:classId/question-type-distribution`
**Description:** Get distribution of question types across all tests

**Request:**
- Path Parameter: `classId` (UUID)

**Response:**
```json
[
  {
    "name": "MCQ",
    "value": 150
  },
  {
    "name": "Essay",
    "value": 30
  },
  {
    "name": "Short Answer",
    "value": 45
  }
]
```

**Calculation Logic:**
- Count questions by `question_type` for all tests in the class
- Map enum values to display names

---

#### 13. GET `/analytics/student/:studentId/for-teacher`
**Description:** Get individual student analytics for teacher view

**Request:**
- Path Parameter: `studentId` (UUID)
- Query Parameter: `classId` (UUID)

**Response:**
```json
{
  "radar": [
    {
      "subject": "Mathematics",
      "A": 85,
      "B": 100
    }
  ],
  "strengths": [
    {
      "subject": "Mathematics",
      "desc": "Strong understanding - 85% average"
    }
  ],
  "weaknesses": [
    {
      "subject": "Science",
      "desc": "Room for improvement - 55% average"
    }
  ]
}
```

**Calculation Logic:**
- Same as student analytics but formatted for teacher view
- Includes subject performance radar data

---

## Implementation Notes

### Data Aggregation Strategy

1. **For Topic/Chapter Mastery:**
   ```sql
   -- Pseudo-logic
   FOR each topic/chapter:
     earned_points = SUM(
       CASE 
         WHEN question_type = 'MCQ' AND selected_option = correct_option 
         THEN question.marks
         WHEN question_type != 'MCQ' 
         THEN student_answers.marks_obtained
         ELSE 0
       END
     )
     possible_points = SUM(question.marks)
     mastery = (earned_points / possible_points) × 100
   ```

2. **For Class Mean Mastery:**
   ```sql
   -- Pseudo-logic
   FOR each topic/chapter:
     student_masteries = []
     FOR each student in class:
       mastery = calculate_student_mastery(student, topic)
       student_masteries.append(mastery)
     class_mean_mastery = AVG(student_masteries)
   ```

3. **For Attendance Correlation:**
   ```javascript
   // Pseudo-code
   const dataPoints = students.map(student => ({
     x: calculateAttendancePercentage(student),
     y: calculateAverageMarksPercentage(student)
   }));
   
   const meanX = dataPoints.reduce((sum, p) => sum + p.x, 0) / dataPoints.length;
   const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
   
   const numerator = dataPoints.reduce((sum, p) => 
     sum + (p.x - meanX) * (p.y - meanY), 0
   );
   const denominatorX = Math.sqrt(
     dataPoints.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0)
   );
   const denominatorY = Math.sqrt(
     dataPoints.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0)
   );
   
   const correlation = numerator / (denominatorX * denominatorY);
   ```

---

## Error Handling

All endpoints should:
- Return `404` if student/class not found
- Return `403` if user doesn't have access
- Return `500` for server errors
- Return empty arrays/objects if no data available (not errors)

---

## Authentication & Authorization

- All endpoints require JWT authentication
- Student endpoints: Only accessible by the student themselves or their teachers
- Teacher endpoints: Only accessible by teachers assigned to the class
- Use `@Tenant()` decorator for school_id isolation

---

## Performance Considerations

1. **Caching:** Consider caching calculated analytics for 1 hour
2. **Pagination:** For large datasets, implement pagination
3. **Database Indexes:** Ensure indexes on:
   - `test_submissions.student_id`
   - `test_submissions.test_id`
   - `student_answers.submission_id`
   - `student_answers.question_id`
   - `attendance.student_id`
   - `questions.test_id`
   - `questions.chapter`
   - `questions.topic`

---

## Next Steps

1. Review and approve this documentation
2. Create backend module structure (`backend/src/analytics/`)
3. Implement DTOs for request/response validation
4. Implement service methods with Prisma queries
5. Implement controller endpoints
6. Update frontend services to use new APIs
7. Test with real data

