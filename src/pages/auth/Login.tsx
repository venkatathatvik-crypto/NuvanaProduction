import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiError } from "@/lib/apiClient";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRole } from "@/lib/auth";
import { useAuth } from "@/auth/AuthContext";
import { GraduationCap, School, Loader2, Shield, Eye, EyeOff } from "lucide-react";

// ... (schema remains same)
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const location = useLocation();
  const roleFromState = (location.state as { role?: UserRole })?.role;
  const [activeTab, setActiveTab] = useState<UserRole>(roleFromState || "student");
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      // Use useAuth login
      await login(
        data.email,
        data.password,
        activeTab // 'student' or 'teacher'
      );

      // Navigate based on role - since login() throws on error or mismatch, if we are here we are good.
      if (activeTab === "student") {
        navigate("/student", { replace: true });
      } else if (activeTab === "teacher") {
        navigate("/teacher", { replace: true });
      }

    } catch (error: any) {
      // Check for password reset requirement
      if (error instanceof ApiError && error.data?.code === 'RESET_REQUIRED') {
        const userId = error.data.userId;
        navigate("/reset-password", { state: { userId } });
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred during login.";

      // Handle specific error messages
      if (error instanceof ApiError && error.status === 0) {
        setErrorMsg("Unable to connect to the server. The server might be starting up or you may be offline. Please wait a few seconds and try again.");
      } else if (message.includes("You are registered as")) {
        setErrorMsg(message);
      } else if (message.includes("Invalid credentials")) {
        setErrorMsg("Invalid email or password. Please check your credentials.");
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
        backgroundImage: `url(${import.meta.env.BASE_URL}doodle-bg.png)`,
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
            Sign in to access Nuvana360 <br />
          </p>
        </div>

        <Tabs
          defaultValue="student"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as UserRole)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="student" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Student
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Teacher
            </TabsTrigger>
          </TabsList>

          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>
                {activeTab === "student" ? "Student" : "Teacher"} Login
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                        : "teacher@school.com"
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      className="bg-background/50 pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
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

      {/* Admin Login Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="default"
          className="neon-glow flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate('/admin')}
        >
          <Shield className="w-5 h-5" />
          <span className="font-bold">Admin</span>
        </Button>
      </div>
    </div>
  );
};

export default Login;
