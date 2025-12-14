import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

export function BackToDashboardButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuth();
    const path = location.pathname;

    // Define logic for when to show the button
    // Hide on:
    // - Landing page /
    // - Login page /login
    // - Admin login /admin-login
    // - Super admin login /super-admin-login
    // - Dashboards themselves (/student, /teacher, /admin)
    // - Test taking page for students (often immersive)

    if (
        path === "/" ||
        path === "/login" ||
        path === "/admin-login" ||
        path === "/super-admin-login" ||
        path === "/super-admin-signup"
    ) {
        return null;
    }

    // Determine user role and corresponding dashboard
    let dashboardPath = "";
    if (profile?.role === "student") dashboardPath = "/student";
    else if (profile?.role === "teacher") dashboardPath = "/teacher";
    else if (profile?.role === "school_admin") dashboardPath = "/admin";
    else return null; // If no role/profile, don't show (likely not logged in)

    // Hide if already on the dashboard
    if (path === dashboardPath) {
        return null;
    }

    // Hide on Test Taking pages for students to prevent accidental exit
    if (path.includes("/student/tests/take")) {
        return null;
    }


    return (
        <div className="fixed top-4 right-4 z-40 print:hidden">
            <Button
                variant="outline"
                className="gap-2 bg-background/50 backdrop-blur-sm border-green/10 hover:bg-background/80 shadow-lg group"
                onClick={() => navigate(dashboardPath)}
            >
                <ArrowLeft className="w-4 h-4 text-green-500 group-hover:-translate-x-1 transition-transform" />
                <LayoutDashboard className="w-4 h-4 opacity-50" />
                <span className="hidden sm:inline">Dashboard</span>
            </Button>
        </div>
    );
}
