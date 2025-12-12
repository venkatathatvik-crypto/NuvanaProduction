// Mock Backend Client
// This file replaces the Supabase client to allow the frontend to run without a backend.

const getMockData = (table: string) => {
    const role = localStorage.getItem("mock_user_role") || "student";

    if (table === "profiles") {
        return [{
            id: "mock-user-id",
            name: "Mock User",
            email: "mock@example.com",
            school_id: "mock-school-id",
            role: role,
            user_roles: { role: role }
        }];
    }
    if (table === "students") {
        return [{ class_id: "mock-class-id", section_id: "mock-section-id" }];
    }
    if (table === "classes") {
        return [{ id: "mock-class-id", name: "Grade 10-A" }];
    }
    if (table === "announcements") {
        return [
            { id: 1, title: "Welcome to Nuvana", message: "This is a mock announcement.", isUrgent: false, createdAt: new Date().toISOString() },
            { id: 2, title: "Exam Schedule", message: "Mid-terms start next week.", isUrgent: true, createdAt: new Date().toISOString() }
        ];
    }
    if (table === "timetable_days") {
        // Return days 1-6 (Mon-Sat)
        return [1, 2, 3, 4, 5, 6].map(d => ({
            id: `day-${d}`,
            class_id: "mock-class-id",
            day_of_week: d,
            school_id: "mock-school-id"
        }));
    }
    if (table === "timetable_periods") {
        // Return some dummy periods
        return [
            {
                id: "p1", timetable_day_id: "day-1", period_number: 1,
                subject_id: "s1", teacher_id: "t1",
                start_time: "09:00:00", end_time: "10:00:00", room: "101",
                grade_subjects: { subjects_master: { name: "Mathematics" } },
                profiles: { name: "Mr. Smith" }
            },
            {
                id: "p2", timetable_day_id: "day-1", period_number: 2,
                subject_id: "s2", teacher_id: "t2",
                start_time: "10:00:00", end_time: "11:00:00", room: "102",
                grade_subjects: { subjects_master: { name: "Physics" } },
                profiles: { name: "Ms. Johnson" }
            }
        ];
    }
    return [];
};

const createBuilder = (table: string) => {
    const builder: any = {
        select: (columns?: string) => builder,
        eq: (column: string, value: any) => builder,
        neq: (column: string, value: any) => builder,
        gt: (column: string, value: any) => builder,
        lt: (column: string, value: any) => builder,
        gte: (column: string, value: any) => builder,
        lte: (column: string, value: any) => builder,
        in: (column: string, values: any[]) => builder,
        order: (column: string, opts?: any) => builder,
        limit: (count: number) => builder,
        single: async () => {
            const data = getMockData(table);
            return { data: data[0] || null, error: null };
        },
        maybeSingle: async () => {
            const data = getMockData(table);
            return { data: data[0] || null, error: null };
        },
        then: (resolve: any, reject: any) => {
            const data = getMockData(table);
            return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
        insert: (data: any) => ({
            select: () => ({
                single: async () => ({ data: { id: "mock-id-" + Math.random(), ...data }, error: null })
            })
        }),
        update: (data: any) => ({
            eq: () => ({
                select: () => ({
                    single: async () => ({ data: { ...data }, error: null })
                }),
                then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve)
            })
        }),
        delete: () => ({
            eq: () => Promise.resolve({ error: null })
        }),
        upload: async () => ({ data: null, error: new Error("Backend removed") })
    };
    return builder;
};

export const supabase = {
    from: (table: string) => createBuilder(table),
    storage: {
        from: (bucket: string) => ({
            upload: async () => ({ data: null, error: new Error("Backend removed") }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: "https://via.placeholder.com/150" } }),
            remove: async () => ({ error: null }),
        })
    },
    auth: {
        signInWithPassword: async ({ email, password }: any) => {
            console.log("Mock Login with:", email);
            const id = "mock-user-id";
            const role = email.includes("teacher") ? "teacher" : (email.includes("admin") ? "school_admin" : "student");

            const mockSession = {
                access_token: "mock-access-token",
                user: {
                    id: id,
                    email: email,
                    role: "authenticated",
                    user_metadata: { full_name: "Mock User" }
                }
            };
            localStorage.setItem("mock_session", JSON.stringify(mockSession));
            localStorage.setItem("mock_user_role", role);

            return { data: { user: mockSession.user, session: mockSession }, error: null };
        },
        signUp: async (...args: any[]) => ({ data: null, error: new Error("Sign up not supported in mock mode") }),
        signOut: async (...args: any[]) => {
            localStorage.removeItem("mock_session");
            localStorage.removeItem("mock_user_role");
            return { error: null };
        },
        getSession: async () => {
            const stored = localStorage.getItem("mock_session");
            return { data: { session: stored ? JSON.parse(stored) : null }, error: null };
        },
        onAuthStateChange: (callback: any) => {
            const stored = localStorage.getItem("mock_session");
            if (stored) {
                callback('SIGNED_IN', JSON.parse(stored));
            } else {
                callback('SIGNED_OUT', null);
            }
            return { data: { subscription: { unsubscribe: () => { } } } };
        },
        getUser: async () => {
            const stored = localStorage.getItem("mock_session");
            const session = stored ? JSON.parse(stored) : null;
            return { data: { user: session ? session.user : null }, error: null };
        },
    }
};
