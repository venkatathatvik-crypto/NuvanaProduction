# Frontend Code Analysis Report
**Generated:** December 25, 2025  
**Project:** Nuvana Production Frontend  
**Technology Stack:** React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Component Organization](#component-organization)
4. [State Management Analysis](#state-management-analysis)
5. [API Integration & Error Handling](#api-integration--error-handling)
6. [Performance & Optimization](#performance--optimization)
7. [Production Readiness Assessment](#production-readiness-assessment)
8. [Security Considerations](#security-considerations)
9. [Code Quality Issues](#code-quality-issues)
10. [Recommendations & Action Items](#recommendations--action-items)

---

## Executive Summary

### Architecture Overview
**Framework:** React 18.3.1 with Vite 5.4.19  
**Language:** TypeScript 5.8.3  
**Styling:** TailwindCSS 3.4.17 + shadcn/ui components  
**Routing:** React Router DOM 6.30.1  
**State:** Context API + React Query (@tanstack/react-query 5.83.0)  
**PWA:** Vite-plugin-pwa 1.2.0  

**File Structure:**
- **Pages:** 47 files (student, teacher, admin, super_admin, auth)
- **Components:** 71+ files (including ui library)
- **Services:** 23 files (API integration layer)
- **Hooks:** 2 custom hooks
- **Total Routes:** 40+ protected routes

### Critical Findings

✅ **Strengths:**
- Well-organized folder structure with role-based page separation
- Modern tech stack (React 18, Vite, TypeScript)
- Comprehensive UI component library (shadcn/ui)
- PWA support with service worker
- Centralized API client with token refresh
- Modular service architecture
- Role-based routing protection

❌ **Critical Issues:**
- **NO global error boundary** - unhandled errors crash the app
- **100+ console.log statements** - needs cleanup for production
- **NO responses adapted to new backend format** - breaking change not handled
- **Mixed loading states** - inconsistent patterns
- **No request caching** beyond React Query defaults
- **No performance monitoring** 
- **No lazy loading** for route-based code splitting

---

## 1. Architecture & Tech Stack

### Technology Stack Analysis

#### Frontend Framework
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "vite": "^5.4.19",
  "typescript": "^5.8.3"
}
```
**Rating:** ✅ EXCELLENT  
**Benefits:** Latest stable versions, fast HMR with Vite, type safety with TypeScript

#### Styling & UI
```json
{
  "tailwindcss": "^3.4.17",
  "@radix-ui/*": "Multiple packages",
  "lucide-react": "^0.462.0",
  "framer-motion": "^12.23.24",
  "class-variance-authority": "^0.7.1"
}
```
**Rating:** ✅ EXCELLENT  
**Benefits:** Modern utility-first CSS, accessible Radix UI primitives, smooth animations

#### State Management
```json
{
  "@tanstack/react-query": "^5.83.0"
}
```
**Rating:** ⚠️ GOOD BUT LIMITED  
**Pattern:** Context API for auth + React Query for server state  
**Missing:** No global state management (Redux, Zustand) if needed

#### Routing
```json
{
  "react-router-dom": "^6.30.1"
}
```
**Rating:** ✅ GOOD  
**Features:** Full client-side routing with role-based protection

---

## 2. Component Organization

### Folder Structure

```
src/
├── components/          # 71+ files
│   ├── ui/             # shadcn/ui components (49 files)
│   ├── AiTutor/        # AI Tutor feature components
│   ├── charts/         # Chart components
│   ├── mcq/            # MCQ test components
│   └── *.tsx           # Shared components
├── pages/              # 47 files
│   ├── auth/           # Login, Signup, Reset
│   ├── student/        # 13 student pages
│   ├── teacher/        # 15 teacher pages
│   ├── admin/          # 8 admin pages
│   └── superadmin/     # Super admin dashboard
├── services/           # 23 API service files
├── hooks/              # 2 custom hooks
├── lib/                # Utilities (apiClient, auth)
├── auth/               # AuthContext
└── layouts/            # Layout components
```

**Rating:** ✅ EXCELLENT structure  
**Strengths:**
- Clear separation of concerns
- Role-based page organization
- Modular service architecture
- Reusable UI component library

### Component Patterns

**App.tsx (419 lines)** - **TOO LARGE ⚠️**
```typescript
// All 40+ routes defined inline
const App = () => (
  <QueryClientProvider>
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* 100+ lines of routes */}
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

**Problems:**
1. Routes should be extracted to `src/routes.tsx`
2. Provider nesting is 5 levels deep
3. No lazy loading for routes
4. Difficult to maintain

**Recommendation:**
```typescript
// src/routes.tsx (better approach)
export const studentRoutes = [
  { path: '/student', element: lazy(() => import('./pages/student/Dashboard')) },
  // ...
];

// App.tsx
const App = () => (
  <Providers>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </Providers>
);
```

---

## 3. State Management Analysis

### Authentication State (Context API)

**File:** `src/auth/AuthContext.tsx` (170 lines)

```typescript
interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  login: (email, password, role?, schoolId?) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

**✅ Strengths:**
- Single source of truth for auth state
- Automatic session validation on load
- Token management abstracted
- Refresh profile capability

**⚠️ Issues:**
1. **Too many console.log statements** (10+ in this file alone)
2. **No error states** - what if session validation fails?
3. **Loading states unclear** - `loading` vs `profileLoading` confusion
4. **Not adapted to new backend response format** - CRITICAL!

**Current Code:**
```typescript
// This will BREAK with new backend format!
const data = await authService.login(email, password, role, schoolId);
setSession(newSession);
setProfile(data.profile);
```

**New Backend Returns:**
```json
{
  "statusCode": 200,
  "message": "Success",
  "isError": false,
  "data": {
    "user": {...},
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

**Fix Required:**
```typescript
const response = await authService.login(email, password, role, schoolId);
// Now response.data contains { user, access_token, refresh_token }
const { user, access_token } = response.data;
```

### Server State (React Query)

**Usage:** Minimal - only QueryClient instantiated, not used extensively

```typescript
const queryClient = new QueryClient();
```

**Problems:**
- No custom query configurations
- No global error handling
- No retry logic configured
- No cache time customization
- Not leveraging React Query's full potential

**Recommendation:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        // Global query error handler
        toast.error(error.message);
      },
    },
  },
});
```

---

## 4. API Integration & Error Handling

### API Client Architecture

**File:** `src/lib/apiClient.ts` (272 lines)

**✅ Excellent Features:**
- Centralized HTTP client
- Automatic JWT token injection
- **Automatic token refresh on 401** (very good!)
- Retry logic for failed requests
- Type-safe with generics
- Custom `ApiError` class

**Code Quality:**
```typescript
class ApiClient {
  async request<T>(endpoint: string, options: ApiClientOptions): Promise<T> {
    // Add auth header
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_URL}${endpoint}`, { headers });

    // Handle 401 - TOKEN EXPIRED
    if (response.status === 401 && !skipAuth) {
      const newToken = await this.refreshAccessToken(); // Great!
      if (newToken) {
        // RETRY WITH NEW TOKEN
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_URL}${endpoint}`, { headers });
      }
    }

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(errorData.message, errorData, response.status);
    }

    return response.json();
  }
}
```

**⚠️ Critical Issue: NOT ADAPTED TO NEW BACKEND FORMAT**

The backend now returns:
```json
{
  "statusCode": 200,
  "message": "Success",
  "isError": false,
  "data": { ... }
}
```

But `apiClient` still does `return response.json()` which returns the ENTIRE wrapper!

**Fix Required:**
```typescript
async request<T>(endpoint: string, options: ApiClientOptions): Promise<T> {
  // ... existing code ...

  if (!response.ok) {
    const errorResponse = await response.json();
    // Error responses: { statusCode, message, isError: true, data }
    throw new ApiError(
      errorResponse.message || `Request failed with status ${response.status}`,
      errorResponse.data,
      errorResponse.statusCode || response.status
    );
  }

  // Success responses: { statusCode, message, isError: false, data }
  const successResponse = await response.json();
  return successResponse.data; // RETURN ONLY THE DATA!
}
```

### Service Layer Organization

**Files:** 23 service files in `src/services/`

**Pattern:** Domain-driven services
```
services/
├── index.ts                    # Barrel exports (223 lines!)
├── types.ts                    # Shared types
├── aiService.ts                # AI integration
├── analyticsApiService.ts      # Analytics
├── attendanceService.ts        # Attendance
├── authService.ts              # (in lib/auth.ts)
├── classService.ts             # Classes
├── fileService.ts              # Files
├── testService.ts              # Tests
└── ...
```

**✅ Strengths:**
- Clean separation by domain
- Centralized barrel export (index.ts)
- Type-safe interfaces
- Consistent patterns

**❌ Issues:**
1. **index.ts is 223 lines** - too large, hard to navigate
2. **Services use console.log extensively** - 50+ instances
3. **No centralized error handling** in services
4. **Mixed async/await patterns**

---

## 5. Performance & Optimization

### Code Splitting Analysis

**Current State:** ❌ NO CODE SPLITTING

**App.tsx:**
```typescript
import StudentDashboard from "./pages/student/Dashboard";
import TeacherDashboard from "./pages/teacher/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
// ... 40+ more synchronous imports
```

**Problem:**
- All route components loaded upfront
- Large initial bundle size
- Slow first paint
- Poor performance on slow connections

**Bundle Size Estimate:**
- 47 pages × ~50KB average = **~2.35MB of page code**
- 71 components
- 23 services
- **Total estimated bundle:** 3-4MB (uncompressed)

**Recommendation: Implement Route-Based Code Splitting**

```typescript
import { lazy, Suspense } from 'react';

// Lazy load routes
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
// ...

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/student" element={<StudentDashboard />} />
        {/* ... */}
      </Routes>
    </Suspense>
  </BrowserRouter>
);
```

**Expected Improvement:**
- Initial bundle: **~500KB** (vs 3-4MB)
- Faster first paint
- Progressive loading

### React Query Configuration

**Current:**
```typescript
const queryClient = new QueryClient();
```

**❌ Issues:**
- No custom cache configuration
- Default 5-minute cache might not be optimal
- No background refetching strategy
- No optimistic updates

**Recommendation:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, //  5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
```

### Image & Asset Optimization

**Current:** No optimization strategy found

**Issues:**
- No lazy loading for images
- No responsive images (srcset)
- No WebP/AVIF format usage
- Assets likely not optimized

**Recommendation:**
```typescript
// Use next-gen formats
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="..." loading="lazy" />
</picture>
```

---

## 6. Production Readiness Assessment

### ✅ Ready
- TypeScript for type safety
- Environment variables via `import.meta.env`
- PWA configured with service worker
- Responsive UI with Tailwind
- Dark mode support
- Auth token management
- Protected routes

### ❌ NOT Ready

#### 1. **No Global Error Boundary** ❌

**Current State:** Missing

**Impact:** Any unhandled error crashes the entire app

**Recommendation:**
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Wrap App
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### 2. **100+ console.log Statements** ❌

**Found in:**
- `AuthContext.tsx`: 10+ instances
- `aiService.ts`: 10+ instances
- `testService.ts`: 15+ instances
- `classService.ts`: 10+ instances
- `timetableService.ts`: 6+ instances
- `StudentTestPlayer.tsx`: 9+ instances
- Many more...

**Examples:**
```typescript
// AuthContext.tsx
console.log('[AuthProvider] Initializing auth, token present:', !!accessToken);
console.log('[AuthProvider] No access token found');
console.log('[AuthProvider] Validating session with backend...');

// aiService.ts
console.log('[Frontend AI Service] ========================================');
console.log('[Frontend AI Service] 🚀 Sending AI request');
console.log('[Frontend AI Service] Task Type:', dto.taskType);
```

**Impact:**
- Performance overhead in production
- Potential security leak (logging sensitive data)
- Cluttered browser console
- Unprofessional

**Recommendation:**
```typescript
// lib/logger.ts
const isDev = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  error: (...args: any[]) => console.error(...args), // Always log errors
  warn: (...args: any[]) => isDev && console.warn(...args),
};

// Usage
import { logger } from '@/lib/logger';
logger.log('[AuthProvider] Initializing...'); // Only in dev
```

#### 3. **No Response Format Adaptation** ❌ CRITICAL!

**Backend changed response format but frontend not updated!**

**Old Format (What frontend expects):**
```json
{
  "user": {...},
  "access_token": "..."
}
```

**New Format (What backend returns):**
```json
{
  "statusCode": 200,
  "message": "Success",
  "isError": false,
  "data": {
    "user": {...},
    "access_token": "..."
  }
}
```

**Files That Need Updates:**
1. ✅ `apiClient.ts` - extract `.data` from response
2. ✅ `AuthContext.tsx` - adapt login/validation
3. ✅ ALL services using apiClient
4. ✅ Error handling to check `isError` flag

#### 4. **No Error Monitoring** ❌

**Missing:**
- Sentry integration
- Error reporting
- Performance monitoring
- User session replay

**Recommendation:**
```bash
npm install @sentry/react

# src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

#### 5. **No Bundle Analysis** ❌

**Missing:**
- Bundle size tracking
- Dependency analysis
- Tree-shaking verification

**Recommendation:**
```bash
npm install -D rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true }),
  ],
});
```

---

## 7. Security Considerations

### ✅ Security Strengths
- JWT tokens stored in localStorage (acceptable for this use case)
- Automatic token refresh
- Role-based route protection
- Protected routes component
- XSS protection via React (automatic escaping)

### ⚠️ Security Concerns

#### 1. **localStorage for Tokens**

**Current:**
```typescript
localStorage.setItem('access_token', token);
localStorage.setItem('refresh_token', refreshToken);
```

**Security Level:** MEDIUM  
**Vulnerability:** XSS attacks can steal tokens from localStorage  
**Mitigation:** Okay for MVP, but consider moving to httpOnly cookies for production

**Better Approach:**
- Store tokens in httpOnly cookies (backend sets them)
- Frontend doesn't have direct access
- Immune to XSS token theft

#### 2. **No Input Sanitization**

**Issue:** User inputs not sanitized before rendering

**Recommendation:**
```typescript
import DOMPurify from 'dompurify';

// Sanitize before rendering HTML
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

#### 3. **No CSP Headers**

**Missing:** Content Security Policy

**Recommendation:** Add to `index.html`:
```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
/>
```

---

## 8. Code Quality Issues

### Console.log Usage: 100+ Instances ❌

**Distribution:**
- Services: ~60 instances
- Components: ~30 instances
- Auth modules: ~10 instances

**Severity:** HIGH - Must be removed for production

### Commented Code

**Several instances of commented code found:**
```typescript
// <ThemeToggle /> Removed to enforce dark mode
```

**Recommendation:** Remove commented code or document why

### Type Safety Issues

**Some `any` types found:**
```typescript
// aiService.ts
catch (error: any) {  // Should be Error
  console.error('[Frontend AI Service] ❌ Request failed:', error);
}
```

**Recommendation:** Replace `any` with proper types

---

## 9. Recommendations & Action Items

### CRITICAL (Do Immediately - Week 1)

#### 1. ✅ Adapt to New Backend Response Format
**Priority:** P0 (BLOCKING)  
**Estimated Time:** 4-6 hours

**Files to Update:**
1. `src/lib/apiClient.ts` - Extract `.data` from responses
2. `src/auth/AuthContext.tsx` - Update login/validation
3. `src/lib/auth.ts` - Update auth service
4. All service files using apiClient

**Implementation:**
```typescript
// lib/apiClient.ts - Update request method
async request<T>(endpoint: string, options): Promise<T> {
  // ... existing code ...

  if (!response.ok) {
    const errorResponse = await response.json();
    throw new ApiError(
      errorResponse.message,
      errorResponse.data,
      errorResponse.statusCode
    );
  }

  const successResponse = await response.json();
  // ONLY RETURN THE DATA
  return successResponse.data;
}
```

#### 2. ✅ Add Global Error Boundary
**Priority:** P0  
**Estimated Time:** 2 hours

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// main.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

#### 3. ✅ Remove console.log for Production
**Priority:** P0  
**Estimated Time:** 3-4 hours

**Create logger utility:**
```typescript
// lib/logger.ts
const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args); // Always log errors
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};
```

**Replace all console.log:**
```bash
# Find and replace
# From: console.log(
# To: logger.log(

# Then import logger everywhere
import { logger } from '@/lib/logger';
```

### HIGH Priority (Week 2)

#### 4. ✅ Implement Route-Based Code Splitting
**Priority:** P1  
**Estimated Time:** 4 hours

```typescript
// src/routes.tsx
import { lazy } from 'react';

export const routes = {
  student: lazy(() => import('./pages/student/Dashboard')),
  teacher: lazy(() => import('./pages/teacher/Dashboard')),
  admin: lazy(() => import('./pages/admin/Dashboard')),
  // ... all routes
};

// App.tsx
import { Suspense } from 'react';
import { routes } from './routes';

const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Route path="/student" element={<routes.student />} />
  </Suspense>
);
```

#### 5. ✅ Configure React Query Properly
**Priority:** P1  
**Estimated Time:** 2 hours

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min
      cacheTime: 5 * 60 * 1000, // 5 min
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error: any) => {
        toast.error(error.message || 'An error occurred');
      },
    },
    mutations: {
      onError: (error: any) => {
        toast.error(error.message || 'An error occurred');
      },
    },
  },
});
```

#### 6. ✅ Add Sentry for Error Tracking
**Priority:** P1  
**Estimated Time:** 1 hour

```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
  });
}
```

### MEDIUM Priority (Week 3)

7. **Refactor App.tsx** - Extract routes to separate file
8. **Add Bundle Analyzer** - Track bundle size
9. **Optimize Images** - Use WebP format, lazy loading
10. **Add Loading Skeletons** - Better UX during loading
11. **Implement Request Debouncing** - For search/filter inputs
12. **Add Unit Tests** - Critical components and services

---

## 10. Summary Statistics

### Codebase Metrics
- **Total Pages:** 47
- **Total Components:** 71+
- **Total Services:** 23
- **Total Routes:** 40+
- **Lines of Code (estimated):** ~20,000+
- **Dependencies:** 60 production, 14 dev

### Code Quality Score: 7/10

**Strengths (+4):**
- Modern tech stack
- Well-organized structure
- Type safety with TypeScript
- Good component library

**Weaknesses (-3):**
- No error boundary
- 100+ console.logs
- Not adapted to new backend format
- No code splitting
- Missing production optimizations

### Production Readiness: 70%

**Ready:**
- Core functionality ✅
- Authentication ✅
- Routing ✅
- UI components ✅

**Not Ready:**
- Backend integration (breaking change) ❌
- Error handling ❌
- Performance optimization ❌
- Production logging ❌

---

## Conclusion

The Nuvana frontend is **well-structured and functional** with modern technologies, but **requires critical updates** before production deployment:

1. ⚠️ **MUST adapt to new backend response format** (BLOCKING)
2. ⚠️ **MUST add global error boundary**
3. ⚠️ **MUST remove/replace console.log statements**
4. ⚠️ **SHOULD implement code splitting** (3-4MB → 500KB bundle)
5. ⚠️ **SHOULD add error monitoring** (Sentry)

**Estimated effort to production-ready:** 2-3 weeks

**Priority order:**
1. Week 1: Backend adaptation + Error boundary + Logging cleanup
2. Week 2: Code splitting + React Query config + Error monitoring
3. Week 3: Performance optimization + Testing + Final polish

---

**Report generated by AI Code Analyzer**  
**Next Steps:** Review findings, prioritize fixes, update frontend for new backend format
