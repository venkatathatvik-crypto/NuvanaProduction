# Assignment Page - Comprehensive Test Cases

## 📋 Prerequisites

Before testing, ensure you have:
1. ✅ Created test data using the provided CSV files
2. ✅ At least 4 grade levels (Grade 9, 10, 11, 12)
3. ✅ At least 8 classes (2 per grade: A and B sections)
4. ✅ At least 5 subjects (Mathematics, Physics, Chemistry, English, Biology)
5. ✅ Assigned subjects to grade levels
6. ✅ 15 students created from `test_students.csv`
7. ✅ 5 teachers created from `test_teachers.csv`

---

## 🧪 Test Suite 1: Student-Class Assignment

### Test Case 1.1: Assign Single Student to Class
**Steps:**
1. Go to Assignments page → Student-Class tab
2. Search for "Aarav Sharma" in student search
3. Click on Aarav to select him
4. Select class "10-A" from available classes
5. Click "Assign Now"
6. Confirm in the dialog

**Expected Result:**
- ✅ Confirmation dialog shows: "You are about to assign 1 student(s) to 10-A"
- ✅ Results modal shows 1 successful assignment
- ✅ Aarav appears in View & Manage tab under Student-Class Assignments
- ✅ Aarav shows "10-A" badge in his profile

---

### Test Case 1.2: Assign Multiple Students to Same Class
**Steps:**
1. Select "Unassigned Only" filter
2. Select 3 unassigned students (Diya, Arjun, Ananya)
3. Select class "10-B"
4. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Preview shows "3 assignments"
- ✅ Results modal shows 3 successful assignments
- ✅ All 3 students appear in View & Manage with "10-B" badge

---

### Test Case 1.3: Try to Reassign Already Assigned Student
**Steps:**
1. Select Aarav Sharma (already in 10-A)
2. Try to assign to 10-B
3. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Results modal shows 1 skipped
- ✅ Skip reason: "Already in 10-A. Remove from current class first."
- ✅ Aarav remains in 10-A (unchanged)

---

### Test Case 1.4: Assign All Remaining Students
**Steps:**
1. Click "Select All" button in Available Students
2. Select appropriate classes for each batch
3. Assign students to fill all classes

**Expected Result:**
- ✅ All 15 students successfully assigned
- ✅ No unassigned students remain
- ✅ View & Manage shows all 15 student assignments

---

## 🧪 Test Suite 2: Teacher-Class Assignment

### Test Case 2.1: Assign Single Teacher to Single Class
**Steps:**
1. Go to Teacher-Class tab
2. Search for "Rajesh Kumar"
3. Select Rajesh
4. Select class "10-A"
5. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Confirmation: "1 teacher(s) × 1 class(es)"
- ✅ Results show 1 successful assignment
- ✅ Rajesh appears in View & Manage → Teacher-Class section with "10-A"

---

### Test Case 2.2: Assign One Teacher to Multiple Classes
**Steps:**
1. Select "Priya Sharma"
2. Select classes: "9-A", "9-B", "10-A"
3. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Preview shows "1 teacher(s) × 3 class(es) = 3 assignments"
- ✅ Results show 3 successful assignments
- ✅ Priya appears 3 times in View & Manage (once per class)

---

### Test Case 2.3: Assign Multiple Teachers to Multiple Classes
**Steps:**
1. Select teachers: Amit, Sneha, Vikram
2. Select classes: "11-A", "11-B"
3. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Preview: "3 teachers × 2 classes = 6 assignments"
- ✅ Results show 6 successful assignments
- ✅ Each teacher assigned to both classes

---

### Test Case 2.4: Try Duplicate Teacher-Class Assignment
**Steps:**
1. Select Rajesh Kumar (already in 10-A)
2. Try to assign to 10-A again
3. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Results show 1 skipped
- ✅ Skip reason: "Already assigned to this class"
- ✅ No duplicate created

---

## 🧪 Test Suite 3: Teacher-Subject Assignment (NEW - Grade-Specific)

### Test Case 3.1: Assign Teacher to Subject for Specific Grade
**Steps:**
1. Go to Teacher-Subject tab
2. Search and select "Rajesh Kumar"
3. **Select grade level: "Grade 10"** (NEW FEATURE)
4. Select subject: "Mathematics"
5. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Preview shows: "1 Subject × 1 Grade"
- ✅ Results show successful assignment
- ✅ View & Manage shows: "Rajesh Kumar → Mathematics → Grade 10"
- ✅ Rajesh is NOT assigned to Math for other grades

---

### Test Case 3.2: Assign Teacher to Multiple Grades for Same Subject
**Steps:**
1. Select "Priya Sharma"
2. **Select grades: "Grade 9", "Grade 10", "Grade 11"**
3. Select subject: "Physics"
4. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Preview: "1 Subject × 3 Grades"
- ✅ Results show 3 successful assignments
- ✅ View & Manage shows Priya with Physics for each grade separately

---

### Test Case 3.3: Assign Teacher to Multiple Subjects for Multiple Grades
**Steps:**
1. Select "Amit Patel"
2. **Select grades: "Grade 11", "Grade 12"**
3. Select subjects: "Chemistry", "Physics"
4. Click "Assign Now" → Confirm

**Expected Result:**
- ✅ Preview: "2 Subjects × 2 Grades = 4 assignments"
- ✅ Results show 4 successful assignments
- ✅ Amit teaches both subjects for both grades

---

### Test Case 3.4: Try Assigning Without Grade Selection
**Steps:**
1. Select a teacher
2. Select a subject
3. **Do NOT select any grade level**
4. Try to click "Assign Now"

**Expected Result:**
- ✅ Button is disabled
- ✅ Error toast: "Select at least one grade level"
- ✅ Info banner explains grade selection is required

---

## 🧪 Test Suite 4: View & Manage Tab (NEW FEATURE)

### Test Case 4.1: View All Student-Class Assignments
**Steps:**
1. Go to View & Manage tab
2. Scroll through Student-Class Assignments section

**Expected Result:**
- ✅ All 15 assigned students are listed
- ✅ Each shows: Name, Email, Class badge
- ✅ Each has a "Remove" button
- ✅ Empty state shows if no assignments

---

### Test Case 4.2: Remove Student from Class
**Steps:**
1. In View & Manage → Student-Class section
2. Find "Aarav Sharma" (in 10-A)
3. Click "Remove" button
4. Confirm in browser dialog

**Expected Result:**
- ✅ Confirmation dialog: "Remove Aarav Sharma from 10-A?"
- ✅ Success toast: "Aarav Sharma removed from class"
- ✅ Aarav disappears from View & Manage list
- ✅ Aarav appears in "Unassigned Only" filter in Student-Class tab

---

### Test Case 4.3: Remove Teacher from Class
**Steps:**
1. In View & Manage → Teacher-Class section
2. Find "Rajesh Kumar → 10-A"
3. Click "Remove"
4. Confirm

**Expected Result:**
- ✅ Success toast: "Teacher removed from class"
- ✅ Assignment disappears from list
- ✅ Rajesh can be reassigned to 10-A

---

### Test Case 4.4: Remove Teacher from Subject
**Steps:**
1. In View & Manage → Teacher-Subject section
2. Find "Priya Sharma → Physics → Grade 10"
3. Click "Remove"
4. Confirm

**Expected Result:**
- ✅ Success toast: "Teacher removed from subject"
- ✅ Assignment disappears
- ✅ Priya's other grade assignments remain intact
- ✅ Only Grade 10 Physics is removed

---

## 🧪 Test Suite 5: UI/UX Validation

### Test Case 5.1: Search Functionality
**Steps:**
1. Test search in each tab
2. Search for partial names, emails
3. Clear search and verify reset

**Expected Result:**
- ✅ Search filters results in real-time
- ✅ Case-insensitive search works
- ✅ Clearing search shows all results

---

### Test Case 5.2: Empty States
**Steps:**
1. Remove all assignments
2. Check each section in View & Manage
3. Check empty selection states

**Expected Result:**
- ✅ Friendly empty state messages with icons
- ✅ Helpful tips displayed
- ✅ No broken UI or errors

---

### Test Case 5.3: Assignment Preview Counter
**Steps:**
1. Select different combinations
2. Watch the assignment counter badge

**Expected Result:**
- ✅ Counter updates in real-time
- ✅ Shows correct count based on selections
- ✅ Singular/plural text correct ("1 assignment" vs "2 assignments")

---

### Test Case 5.4: Results Modal Details
**Steps:**
1. Perform mixed assignment (some succeed, some skip)
2. Review results modal

**Expected Result:**
- ✅ Green section for successful assignments
- ✅ Yellow section for skipped with specific reasons
- ✅ Red section for failed with error messages
- ✅ Scrollable if many results

---

## 🧪 Test Suite 6: Edge Cases & Error Handling

### Test Case 6.1: No Selection Assignment Attempt
**Steps:**
1. Click "Assign Now" without selecting anything

**Expected Result:**
- ✅ Button is disabled OR
- ✅ Error toast with clear message

---

### Test Case 6.2: Network Error Simulation
**Steps:**
1. Disconnect internet
2. Try to assign
3. Reconnect and retry

**Expected Result:**
- ✅ Error toast with network error message
- ✅ Selections remain intact
- ✅ Can retry after reconnection

---

### Test Case 6.3: Rapid Clicking Prevention
**Steps:**
1. Click "Assign Now"
2. Rapidly click again during processing

**Expected Result:**
- ✅ Button shows loading state
- ✅ Button is disabled during processing
- ✅ No duplicate assignments created

---

## 📊 Test Summary Checklist

After completing all tests, verify:

- [ ] All 15 students successfully assigned to classes
- [ ] All 5 teachers assigned to multiple classes
- [ ] All teachers assigned to subjects with specific grades
- [ ] View & Manage tab shows all assignments correctly
- [ ] Remove functionality works for all assignment types
- [ ] No multi-class mode toggle visible
- [ ] Grade-level selection required for teacher-subject
- [ ] Confirmation dialogs appear for all bulk operations
- [ ] Detailed results modals show success/skip/fail
- [ ] Search works across all tabs
- [ ] Empty states display correctly
- [ ] No console errors
- [ ] Responsive design works on mobile

---

## 🎯 Success Criteria

**All tests PASS if:**
1. ✅ Students can only be in ONE class at a time
2. ✅ Teachers can be assigned to MULTIPLE classes
3. ✅ Teacher-subject assignments are GRADE-SPECIFIC
4. ✅ View & Manage tab displays ALL current assignments
5. ✅ Remove buttons work without errors
6. ✅ Confirmation dialogs prevent accidental operations
7. ✅ Results modals provide clear, detailed feedback
8. ✅ UI is intuitive and matches school workflows

---

## 🐛 Bug Reporting Template

If you find issues, report using this format:

```
**Test Case:** [Number and Name]
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:** 
**Actual:** 
**Screenshots:** [if applicable]
**Console Errors:** [if any]
```

---

## 📝 Notes

- **Multi-class mode removed:** Students can only be in one class (standard school practice)
- **Grade-specific subjects:** Teachers assigned to specific grades, not all grades
- **View & Manage:** New tab provides full visibility and management
- **Improved feedback:** Detailed results instead of generic toasts
- **Confirmation dialogs:** Prevent accidental bulk operations

Happy Testing! 🎉
