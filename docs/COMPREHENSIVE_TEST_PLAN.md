# Comprehensive System Test Plan - Nuvana360

**Version**: 1.0  
**Date**: December 27, 2025  
**Purpose**: Complete functional testing of all features across Admin, Teacher, and Student roles

---

## Table of Contents
1. [Test Environment Setup](#test-environment-setup)
2. [Admin Role Testing](#admin-role-testing)
3. [Teacher Role Testing](#teacher-role-testing)
4. [Student Role Testing](#student-role-testing)
5. [Cross-Role Communication Testing](#cross-role-communication-testing)
6. [Error Handling & Edge Cases](#error-handling--edge-cases)
7. [Test Data Requirements](#test-data-requirements)

---

## Test Environment Setup

### Prerequisites
- ✅ Backend running on `http://localhost:5000`
- ✅ Frontend running on `http://localhost:8080`
- ✅ PostgreSQL database connected
- ✅ Redis cache connected
- ✅ Test school created with admin account

### Test Accounts Required
| Role | Email | Password | Name |
|------|-------|----------|------|
| Super Admin | superadmin@nuvana.com | Test@123 | Super Admin |
| School Admin | admin@greenwood.edu | Test@123 | John Anderson |
| Teacher 1 | sarah.math@greenwood.edu | Test@123 | Sarah Johnson |
| Teacher 2 | mike.physics@greenwood.edu | Test@123 | Mike Williams |
| Student 1 | student1@greenwood.edu | Test@123 | Emma Davis |
| Student 2 | student2@greenwood.edu | Test@123 | Liam Brown |

---

## Admin Role Testing

### 1. Authentication & Profile

#### Test Case 1.1: Admin Login
**Steps:**
1. Navigate to `/admin-login`
2. Enter valid credentials
3. Click "Login"

**Expected Result:**
- ✅ Redirects to `/admin` dashboard
- ✅ Shows welcome message with admin name
- ✅ Displays school name

**Error Cases:**
- ❌ Invalid email → "Invalid credentials"
- ❌ Wrong password → "Invalid credentials"
- ❌ Empty fields → "Please fill all fields"

#### Test Case 1.2: First Login Password Reset
**Steps:**
1. Login with new admin account (is_first_login = true)
2. Should redirect to password reset

**Expected Result:**
- ✅ Forced to `/reset-password`
- ✅ Can set new password
- ✅ is_first_login set to false

---

### 2. Academic Setup

#### Test Case 2.1: Grade Management
**Steps:**
1. Navigate to Admin → Academic Setup → Grades tab
2. Add grade: "Grade 10"
3. Edit grade name to "Grade 10 - Science"
4. Delete grade

**Expected Result:**
- ✅ Grade created successfully
- ✅ Grade updated in real-time
- ✅ Warning shown: "This will delete all classes and unassign students"
- ✅ Grade deleted, classes removed
- ✅ Classes cache invalidated

**Error Cases:**
- ❌ Empty grade name → "Please enter grade name"
- ❌ Duplicate grade → "Grade already exists"

#### Test Case 2.2: Class Management
**Steps:**
1. Navigate to Classes tab
2. Select grade "Grade 10"
3. Add class: "10-A"
4. Delete class

**Expected Result:**
- ✅ Class created successfully
- ✅ Warning shown: "All students will be unassigned"
- ✅ Class deleted
- ✅ Students unassigned (class_id = null)
- ✅ Assignments cache invalidated

**CSV Import Test:**
1. Upload `classes_import.csv`
2. Verify progress bar
3. Check error reporting

**Expected Result:**
- ✅ Valid rows imported
- ✅ Invalid rows shown with errors
- ✅ Progress tracking accurate

#### Test Case 2.3: Subject Management
**Steps:**
1. Navigate to Subjects tab
2. Add subject: "Mathematics"
3. Assign to Grade 10
4. Remove from grade
5. Delete subject

**Expected Result:**
- ✅ Subject created
- ✅ Assigned to grade
- ✅ Removed from grade
- ✅ Subject deleted
- ✅ Grade-subjects cache invalidated

---

### 3. Members Management

#### Test Case 3.1: Teacher Creation
**Steps:**
1. Navigate to Admin → Members → Teachers tab
2. Click "Add Teacher"
3. Fill form:
   - Name: "Sarah Johnson"
   - Email: "sarah.math@greenwood.edu"
   - Role: Teacher
4. Submit

**Expected Result:**
- ✅ Teacher created
- ✅ Appears in Members list immediately
- ✅ Appears in Assignments page
- ✅ Email sent with temporary password
- ✅ is_first_login = true

**CSV Import Test:**
1. Upload `teachers_import.csv`
2. Verify bulk creation

**Expected Result:**
- ✅ All valid teachers created
- ✅ Duplicate emails rejected
- ✅ Progress shown

#### Test Case 3.2: Student Creation
**Steps:**
1. Navigate to Students tab
2. Add student with all details
3. Verify in Members and Assignments

**Expected Result:**
- ✅ Student created
- ✅ Roll number assigned
- ✅ Parent contact saved
- ✅ Appears in both pages

---

### 4. Assignments

#### Test Case 4.1: Assign Students to Class
**Steps:**
1. Navigate to Admin → Assignments → Assign Students tab
2. Select class "10-A"
3. Select multiple students
4. Click "Assign"

**Expected Result:**
- ✅ Students assigned to class
- ✅ UI updates immediately
- ✅ Members page shows class
- ✅ No manual refresh needed

#### Test Case 4.2: Assign Teacher to Class
**Steps:**
1. Navigate to Assign Teachers tab
2. Select teacher
3. Select multiple classes
4. Assign

**Expected Result:**
- ✅ Teacher assigned to classes
- ✅ Appears in teacher's dashboard
- ✅ Can view class students

#### Test Case 4.3: Assign Subjects to Teacher
**Steps:**
1. Select teacher
2. Select class
3. Select subjects
4. Assign

**Expected Result:**
- ✅ Teacher can create tests for those subjects
- ✅ Appears in teacher's subject list

---

### 5. Timetable Management

#### Test Case 5.1: Manual Period Entry
**Steps:**
1. Navigate to Admin → Timetable
2. Select class "10-A"
3. Select day "Monday"
4. Add period:
   - Period: 1
   - Subject: Mathematics
   - Teacher: Sarah Johnson
   - Time: 09:00 - 09:45
   - Room: Room 101
5. Save

**Expected Result:**
- ✅ Period created
- ✅ Appears in timetable view
- ✅ Students can see in their timetable
- ✅ Teacher can see in their timetable

#### Test Case 5.2: CSV Import
**Steps:**
1. Switch to CSV Import tab
2. Upload `timetable_import.csv`
3. Monitor progress

**Expected Result:**
- ✅ Valid periods imported
- ✅ Sunday entries skipped automatically
- ✅ Invalid teachers/subjects reported
- ✅ Time format errors shown
- ✅ Timetable updates immediately

**Error Cases:**
- ❌ Invalid day → Error shown
- ❌ Invalid time format → "Use HH:MM format"
- ❌ Teacher not found → "Teacher 'X' not found"
- ❌ Subject not assigned → "Subject 'X' not found for this class"

---

### 6. Exam & File Settings

#### Test Case 6.1: Exam Types
**Steps:**
1. Navigate to Admin → Exam & File Settings → Exam Types
2. Add exam type: "Mid-Term"
3. Select type: "School Exam"
4. Edit and delete

**Expected Result:**
- ✅ Exam type created
- ✅ Available in test creation
- ✅ Updates reflected immediately

#### Test Case 6.2: File Categories
**Steps:**
1. Navigate to File Categories tab
2. Add category: "Assignments"
3. Verify in teacher file upload

**Expected Result:**
- ✅ Category created
- ✅ Teachers can select it

---

## Teacher Role Testing

### 1. Dashboard

#### Test Case T1.1: Teacher Dashboard Load
**Steps:**
1. Login as teacher
2. View dashboard

**Expected Result:**
- ✅ Shows assigned classes
- ✅ Shows upcoming tests
- ✅ Shows recent announcements
- ✅ Quick stats displayed

---

### 2. Test Management

#### Test Case T2.1: Create Test
**Steps:**
1. Navigate to Teacher → Tests → Create Test
2. Fill form:
   - Title: "Chapter 1 - Algebra"
   - Class: 10-A
   - Subject: Mathematics
   - Exam Type: Mid-Term
   - Duration: 60 minutes
   - Due Date: Tomorrow
3. Add questions:
   - MCQ with 4 options
   - Essay question
   - Short answer
4. Publish test

**Expected Result:**
- ✅ Test created
- ✅ Appears in teacher's test list
- ✅ Students can see in their tests
- ✅ Can't submit before due date

#### Test Case T2.2: Grade Test
**Steps:**
1. Wait for student submission
2. Navigate to Test Details
3. Grade essay questions
4. Publish results

**Expected Result:**
- ✅ Can view student answers
- ✅ Auto-graded MCQs
- ✅ Manual grading for essays
- ✅ Results visible to students

---

### 3. Attendance

#### Test Case T3.1: Mark Attendance
**Steps:**
1. Navigate to Teacher → Attendance
2. Select class and date
3. Mark students:
   - Present
   - Absent
   - Late
4. Submit

**Expected Result:**
- ✅ Attendance saved
- ✅ Students can view in their attendance
- ✅ Analytics updated

---

### 4. Announcements

#### Test Case T4.1: Create Announcement
**Steps:**
1. Navigate to Teacher → Announcements
2. Create announcement:
   - Title: "Holiday Notice"
   - Message: "School closed tomorrow"
   - Mark as urgent
   - Select classes: 10-A, 10-B
3. Post

**Expected Result:**
- ✅ Announcement created
- ✅ Students in selected classes see it
- ✅ Urgent badge shown
- ✅ Notification sent

---

### 5. File Upload

#### Test Case T5.1: Upload Study Material
**Steps:**
1. Navigate to Teacher → Files
2. Upload file:
   - Title: "Chapter 1 Notes"
   - Category: Study Material
   - Class: 10-A
   - Subject: Mathematics
   - File: PDF
3. Upload

**Expected Result:**
- ✅ File uploaded
- ✅ Students can download
- ✅ Download count tracked

---

### 6. Voice Notes

#### Test Case T6.1: Upload Voice Note
**Steps:**
1. Navigate to Teacher → Voice Upload
2. Record or upload audio
3. Add metadata
4. Submit

**Expected Result:**
- ✅ Voice note uploaded
- ✅ Students can listen
- ✅ Duration displayed

---

### 7. Analytics

#### Test Case T7.1: View Class Analytics
**Steps:**
1. Navigate to Teacher → Analytics
2. Select class
3. View performance charts

**Expected Result:**
- ✅ Class average shown
- ✅ Subject-wise performance
- ✅ Attendance trends
- ✅ Top performers listed

---

## Student Role Testing

### 1. Dashboard

#### Test Case S1.1: Student Dashboard
**Steps:**
1. Login as student
2. View dashboard

**Expected Result:**
- ✅ Shows upcoming tests
- ✅ Shows recent announcements
- ✅ Shows attendance summary
- ✅ Shows performance stats

---

### 2. Tests

#### Test Case S2.1: Take Test
**Steps:**
1. Navigate to Student → Tests
2. Click on available test
3. Start test
4. Answer questions
5. Submit

**Expected Result:**
- ✅ Timer starts
- ✅ Can answer all questions
- ✅ Can't go back after submission
- ✅ Results shown (if published)

---

### 3. Marks

#### Test Case S3.1: View Marks
**Steps:**
1. Navigate to Student → Marks
2. Filter by subject/exam type

**Expected Result:**
- ✅ All test scores shown
- ✅ Subject-wise breakdown
- ✅ Exam type filtering works
- ✅ Graphs displayed

---

### 4. Attendance

#### Test Case S4.1: View Attendance
**Steps:**
1. Navigate to Student → Attendance
2. View calendar

**Expected Result:**
- ✅ All attendance records shown
- ✅ Present/Absent/Late marked
- ✅ Attendance percentage calculated

---

### 5. Timetable

#### Test Case S5.1: View Timetable
**Steps:**
1. Navigate to Student → Timetable
2. View weekly schedule

**Expected Result:**
- ✅ All periods shown
- ✅ Teacher names displayed
- ✅ Room numbers shown
- ✅ Current period highlighted

---

### 6. Books/Files

#### Test Case S6.1: Download Files
**Steps:**
1. Navigate to Student → Books
2. Browse by subject
3. Download file

**Expected Result:**
- ✅ All uploaded files shown
- ✅ Can filter by subject
- ✅ Download works
- ✅ Download count increments

---

### 7. AI Tutor

#### Test Case S7.1: Use AI Tutor
**Steps:**
1. Navigate to Student → AI Tutor
2. Select mode: Explain
3. Ask question
4. Upload PDF (optional)

**Expected Result:**
- ✅ AI responds with explanation
- ✅ PDF content used in response
- ✅ Math formulas rendered
- ✅ Subject-specific answers

---

## Cross-Role Communication Testing

### Test Case C1: Announcement Flow
**Steps:**
1. Teacher creates announcement for Class 10-A
2. Student in 10-A logs in

**Expected Result:**
- ✅ Student sees announcement on dashboard
- ✅ Notification received
- ✅ Urgent announcements highlighted

### Test Case C2: Test Flow
**Steps:**
1. Teacher creates and publishes test
2. Student takes test
3. Teacher grades test
4. Student views results

**Expected Result:**
- ✅ Complete flow works
- ✅ Real-time updates
- ✅ No data loss

### Test Case C3: File Sharing Flow
**Steps:**
1. Teacher uploads file for Class 10-A
2. Student downloads file

**Expected Result:**
- ✅ File appears immediately
- ✅ Download count updates
- ✅ File accessible

---

## Error Handling & Edge Cases

### 1. Network Errors
- ❌ Backend down → "Unable to connect to server"
- ❌ Slow network → Loading spinners shown
- ❌ Timeout → "Request timed out, please try again"

### 2. Validation Errors
- ❌ Invalid email format → "Please enter valid email"
- ❌ Weak password → "Password must be at least 8 characters"
- ❌ Required fields empty → Field-specific errors

### 3. Permission Errors
- ❌ Student accessing admin page → Redirect to login
- ❌ Teacher accessing another teacher's data → "Access denied"

### 4. Data Integrity
- ❌ Delete grade with classes → Warning shown, cascade delete
- ❌ Delete class with students → Students unassigned
- ❌ Delete teacher with tests → Tests remain, teacher marked as "Deleted"

### 5. Cache Invalidation
- ✅ All mutations invalidate relevant caches
- ✅ UI updates without manual refresh
- ✅ Cross-page data consistency

---

## Test Data Requirements

See separate files:
- `DUMMY_DATA_USERS.csv` - Sample users
- `DUMMY_DATA_CLASSES.csv` - Sample classes
- `DUMMY_DATA_TIMETABLE.csv` - Sample timetable
- `DUMMY_DATA_ANNOUNCEMENTS.md` - Sample announcements
- `DUMMY_DATA_TESTS.md` - Sample test questions

---

## Test Execution Checklist

### Pre-Testing
- [ ] Database reset to clean state
- [ ] All test accounts created
- [ ] Sample data loaded
- [ ] Backend and frontend running
- [ ] Redis cache cleared

### Admin Testing
- [ ] All 15 admin pages tested
- [ ] CRUD operations verified
- [ ] CSV imports tested
- [ ] Cache invalidation verified
- [ ] Error messages checked

### Teacher Testing
- [ ] All 14 teacher pages tested
- [ ] Test creation flow complete
- [ ] Attendance marking works
- [ ] File uploads successful
- [ ] Analytics displaying correctly

### Student Testing
- [ ] All 12 student pages tested
- [ ] Test taking flow complete
- [ ] Marks viewing works
- [ ] AI Tutor functional
- [ ] File downloads work

### Cross-Role Testing
- [ ] Announcement flow tested
- [ ] Test flow end-to-end
- [ ] File sharing verified
- [ ] Real-time updates confirmed

### Error Handling
- [ ] All error cases tested
- [ ] Edge cases handled
- [ ] Validation working
- [ ] Permissions enforced

---

## Sign-Off

**Tester Name**: ___________________  
**Date**: ___________________  
**Status**: ☐ Pass ☐ Fail ☐ Partial  
**Notes**: ___________________
