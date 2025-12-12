
// Mock Backend Client
// This file replaces the Supabase client to allow the frontend to run without a backend.

export const supabase = {
    from: (table: string) => ({
        select: (columns?: string) => ({
            eq: (column: string, value: any) => ({
                maybeSingle: async () => ({ data: null, error: null }),
                single: async () => ({ data: null, error: null }),
                order: (col: string, opts?: any) => Promise.resolve({ data: [], error: null }),
                then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
            }),
            order: (col: string, opts?: any) => Promise.resolve({ data: [], error: null }),
            insert: (data: any) => ({
                select: () => ({
                    single: async () => ({ data: null, error: null })
                })
            }),
            delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
            update: (data: any) => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
        insert: (data: any) => ({
            select: (cols?: string) => ({
                single: async () => ({ data: null, error: null })
            }),
            single: async () => ({ data: null, error: null })
        }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        update: (data: any) => ({ eq: () => Promise.resolve({ error: null }) }),
        upload: () => Promise.resolve({ data: null, error: new Error("Backend removed") }),
    }),
    storage: {
        from: (bucket: string) => ({
            upload: async () => ({ data: null, error: new Error("Backend removed") }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: "" } }),
            remove: async () => ({ error: null }),
        })
    },
    auth: {
        signInWithPassword: async (...args: any[]) => ({ data: { user: null }, error: new Error("Backend removed") }),
        signUp: async (...args: any[]) => ({ data: null, error: new Error("Backend removed") }),
        signOut: async (...args: any[]) => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: (callback: any) => {
            // execute callback immediately with no session
            callback('SIGNED_OUT', null);
            return { data: { subscription: { unsubscribe: () => { } } } };
        },
        getUser: async () => ({ data: { user: null }, error: null }),
    }
};
