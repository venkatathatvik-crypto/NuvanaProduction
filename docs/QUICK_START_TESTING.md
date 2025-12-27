# Quick Start Testing Guide - Nuvana360

## 🚀 Getting Started in 5 Minutes

### Step 1: Setup Test Environment (2 min)
```bash
# Start backend
cd backend
npm run start:dev

# Start frontend (new terminal)
cd ..
npm run dev
```

**Verify:**
- ✅ Backend running on `http://localhost:5000`
- ✅ Frontend running on `http://localhost:8080`
- ✅ Database connected
- ✅ Redis connected

---

### Step 2: Create Test School (1 min)

1. Navigate to `http://localhost:8080/superadmin-signup`
2. Create super admin account
3. Login and create school: **"Greenwood High School"**
4. Create school admin: `admin@greenwood.edu` / `Test@123`

---

### Step 3: Load Dummy Data (2 min)

#### Option A: Manual (Recommended for first-time)
1. Login as admin
2. Go to **Academic Setup**
3. Add grades: Grade 9, Grade 10
4. Add classes: 9-A, 10-A, 10-B
5. Add subjects: Mathematics, Physics, Chemistry, Biology, English

#### Option B: CSV Import (Faster)
1. Use files from `docs/` folder:
   - `DUMMY_DATA_CLASSES.csv`
   - `DUMMY_DATA_TIMETABLE.csv`

---

## 📋 Quick Test Checklist

### Admin Tests (15 min)
- [ ] Create 2 teachers using `DUMMY_DATA_USERS.csv`
- [ ] Create 5 students using `DUMMY_DATA_USERS.csv`
- [ ] Assign students to Class 10-A
- [ ] Assign teacher to Class 10-A
- [ ] Import timetable using CSV
- [ ] Delete a grade (verify cascade)
- [ ] Delete a class (verify student unassignment)

### Teacher Tests (10 min)
- [ ] Login as teacher
- [ ] Create announcement (use `DUMMY_DATA_ANNOUNCEMENTS.md`)
- [ ] Mark attendance for class
- [ ] Create test (use `DUMMY_DATA_TESTS.md`)
- [ ] Upload a file
- [ ] View analytics

### Student Tests (10 min)
- [ ] Login as student
- [ ] View announcements
- [ ] View timetable
- [ ] Take a test
- [ ] View marks
- [ ] Use AI Tutor
- [ ] Download files

### Cross-Role Tests (5 min)
- [ ] Teacher posts announcement → Student sees it
- [ ] Teacher creates test → Student takes it → Teacher grades it
- [ ] Teacher uploads file → Student downloads it

---

## 🎯 Priority Test Scenarios

### Scenario 1: Complete Test Flow (High Priority)
```
1. Teacher creates test with 5 questions
2. Publish test
3. Student takes test
4. Auto-grading for MCQs
5. Teacher grades essays
6. Student views results
```

**Expected Time**: 10 minutes  
**Critical**: Tests end-to-end functionality

---

### Scenario 2: Timetable CSV Import (High Priority)
```
1. Admin uploads DUMMY_DATA_TIMETABLE.csv
2. Verify progress tracking
3. Check error handling (Sunday entries)
4. Verify students can see timetable
5. Verify teachers can see their schedule
```

**Expected Time**: 5 minutes  
**Critical**: Tests bulk operations

---

### Scenario 3: Cache Invalidation (High Priority)
```
1. Admin deletes a grade
2. Verify classes list updates immediately
3. Admin deletes a class
4. Verify students unassigned
5. No manual refresh needed
```

**Expected Time**: 3 minutes  
**Critical**: Tests real-time updates

---

## 🐛 Common Issues & Solutions

### Issue 1: "Teacher not found" in CSV import
**Cause**: Teacher email doesn't match  
**Solution**: Ensure exact email match (case-sensitive)

### Issue 2: Classes not updating after grade deletion
**Cause**: Cache not invalidated  
**Solution**: Check backend logs, verify Redis connection

### Issue 3: Students can't see announcements
**Cause**: Not assigned to class  
**Solution**: Assign students to class first

### Issue 4: Test submission fails
**Cause**: Missing required fields  
**Solution**: Ensure all questions answered

---

## 📊 Test Data Summary

| Data Type | File | Records | Usage |
|-----------|------|---------|-------|
| Users | `DUMMY_DATA_USERS.csv` | 26 | 1 admin, 10 teachers, 15 students |
| Classes | `DUMMY_DATA_CLASSES.csv` | 8 | Grades 9-12 with sections |
| Timetable | `DUMMY_DATA_TIMETABLE.csv` | 54 | Full week for 10-A and 10-B |
| Announcements | `DUMMY_DATA_ANNOUNCEMENTS.md` | 10 | Various types and urgency |
| Tests | `DUMMY_DATA_TESTS.md` | 5 | Different subjects and question types |

---

## ⚡ Speed Testing Tips

### 1. Use Browser DevTools
- **Network Tab**: Check API response times
- **Console**: Look for errors
- **Application Tab**: Check cache

### 2. Test in Incognito
- Ensures clean state
- No cached data interference

### 3. Use Multiple Browser Tabs
- Admin in Tab 1
- Teacher in Tab 2
- Student in Tab 3
- Test cross-role interactions simultaneously

### 4. Keep Backend Logs Open
```bash
# Watch backend logs
cd backend
npm run start:dev
```

---

## 📝 Test Report Template

```markdown
# Test Execution Report

**Date**: ___________
**Tester**: ___________
**Environment**: Local / Staging / Production

## Summary
- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___

## Failed Tests
1. **Test Name**: ___________
   - **Expected**: ___________
   - **Actual**: ___________
   - **Screenshot**: ___________

## Blockers
1. ___________

## Notes
___________
```

---

## 🎓 Test Accounts Quick Reference

```
Admin:
Email: admin@greenwood.edu
Password: Test@123

Teacher (Math):
Email: sarah.math@greenwood.edu
Password: Test@123

Teacher (Physics):
Email: mike.physics@greenwood.edu
Password: Test@123

Student 1:
Email: emma.student1@greenwood.edu
Password: Test@123

Student 2:
Email: liam.student2@greenwood.edu
Password: Test@123
```

---

## 🔄 Reset Test Environment

```bash
# Reset database (CAUTION: Deletes all data)
cd backend
npx prisma migrate reset

# Clear Redis cache
redis-cli FLUSHALL

# Restart servers
npm run start:dev
```

---

## 📞 Support

**Issues Found?**
- Document in test report
- Include screenshots
- Note steps to reproduce
- Check backend logs

**Questions?**
- Refer to `COMPREHENSIVE_TEST_PLAN.md`
- Check `FEATURE_MATRIX.md`
- Review API documentation

---

## ✅ Daily Testing Routine

### Morning (30 min)
1. Verify all services running
2. Run smoke tests (login, basic CRUD)
3. Check overnight logs

### Afternoon (1 hour)
1. Feature testing (new features)
2. Regression testing (existing features)
3. Cross-role testing

### Evening (30 min)
1. Performance testing
2. Error scenario testing
3. Update test report

---

## 🎯 Success Criteria

**Test Passed If:**
- ✅ All CRUD operations work
- ✅ Real-time updates without refresh
- ✅ Error messages are clear
- ✅ No console errors
- ✅ Data persists correctly
- ✅ Cross-role communication works
- ✅ CSV imports handle errors gracefully
- ✅ Cache invalidation works

**Test Failed If:**
- ❌ Data loss occurs
- ❌ Requires manual refresh
- ❌ Unclear error messages
- ❌ Console errors present
- ❌ Performance degradation
- ❌ Security vulnerabilities

---

**Happy Testing! 🚀**
