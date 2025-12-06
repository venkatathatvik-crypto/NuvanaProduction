import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole, authService } from "@/lib/auth"; // 👈 Import authService
import { GraduationCap, School, Shield, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [activeTab, setActiveTab] = useState<UserRole>("student");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // 👈 State for error message

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const authData = await authService.login(data.email, data.password);

      if (!authData) {
        throw new Error("Login failed. Please check your credentials.");
      }

      const userRole = authData.profile.role;
      const selectedRole = activeTab;

      console.log("Selected role:", selectedRole);
      console.log("Actual DB role:", userRole);

      if (userRole !== selectedRole) {
        await authService.logout();
        throw new Error(
          `Your account is registered as a ${userRole}. Please switch the login tab.`
        );
      }

      if (userRole === "student") {
        navigate("/student", { replace: true });
      } else if (userRole === "teacher") {
        navigate("/teacher", { replace: true });
      } else if (userRole === "school_admin") {
        navigate("/admin", { replace: true });
      } else {
        throw new Error("Unknown user role in profile.");
      }
    } catch (error) {
      console.error("Login Error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during login.";

      if (
        message.includes("Invalid login credentials") ||
        message.includes("not confirmed")
      ) {
        setErrorMsg(
          "Invalid credentials or account not confirmed. Please check your email."
        );
      } else {
        setErrorMsg(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(/doodle-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <School className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign into access Nuvana360
          </p>
        </div>

        <Tabs
          defaultValue="student"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as UserRole)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Student
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Teacher
            </TabsTrigger>
            <TabsTrigger value="school_admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              School Admin
            </TabsTrigger>
          </TabsList>

          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>
                {activeTab === "student" ? "Student" : activeTab === "teacher" ? "Teacher" : "School Admin"} Login
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* 👈 Error Message Display */}
                {errorMsg && (
                  <div className="text-sm text-center font-medium text-destructive bg-destructive/10 p-2 rounded-md">
                    {errorMsg}
                  </div>
                )}
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={
                      activeTab === "student"
                        ? "student@school.com"
                        : activeTab === "teacher"
                        ? "teacher@school.com"
                        : "admin@school.com"
                    }
                    {...register("email")}
                    className="bg-background/50"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    className="bg-background/50"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                {/* Submit Button */}
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>

          </Card>
        </Tabs>
      </div>
    </div>
  );
};

export default Login;
