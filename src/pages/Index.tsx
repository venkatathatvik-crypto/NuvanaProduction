import { motion } from "framer-motion";
import { BookOpen, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { getClasses, getExamTypes, getSubjects } from "@/services/academic";
import { useTheme } from "next-themes";

const Index = () => {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  useEffect(() => {
    // Force dark mode on index page
    setTheme("dark");
  }, [setTheme]);

  useEffect(() => {
    const fetchClasses = async () => {
      const response = await getClasses();
      console.log("Fetched classes:", response);
    };

    const fetchExamTypes = async () => {
      const response = await getExamTypes();
      console.log("Fetched exam types:", response);
    };

    const fetchSubjects = async () => {
      const response = await getSubjects(1);
      console.log("Fetched subjects:", response);
    };

    fetchSubjects();
    fetchExamTypes();
    fetchClasses();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10">
      {/* Logo + Tagline */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center mb-6">
          <img
            src="/N360 green (1).png"
            alt="Nuvana360"
            className="h-32 w-auto object-contain drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]"
          />
        </div>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Digital Learning,Zero Infrastructure.
        </p>
      </motion.div>

      {/* Student / Teacher Cards */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full"
      >
        {/* Student Card */}
        <Card
          className="glass-card p-8 hover:neon-glow transition-all duration-300 cursor-pointer group"
          onClick={() => navigate("/login")}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <BookOpen className="w-16 h-16 text-neon-purple group-hover:scale-110 transition-transform" />
            <h2 className="text-3xl font-bold">Student Mode</h2>
            <p className="text-muted-foreground">
              Access your personalized dashboard with attendance, marks,
              timetable, books, and more
            </p>
            <Button className="w-full mt-4" size="lg" variant="secondary">
              Enter as Student
            </Button>
          </div>
        </Card>

        {/* Teacher Card */}
        <Card
          className="glass-card p-8 hover:neon-glow transition-all duration-300 cursor-pointer group"
          onClick={() => navigate("/login")}
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <Users className="w-16 h-16 text-neon-purple group-hover:scale-110 transition-transform" />
            <h2 className="text-3xl font-bold">Teacher Mode</h2>
            <p className="text-muted-foreground">
              Manage classes, upload marks, post attendance, share files, and
              make announcements and more
            </p>
            <Button className="w-full mt-4" size="lg" variant="secondary">
              Enter as Teacher
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="mt-16 text-center"
      >
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <img
            src="/PBNL.png"
            alt="NuvanaLabs"
            className="h-12 w-auto ml-1 inline-block"

          />
        </p>
      </motion.div>
      <div className="fixed top-4 right-4 z-50">
        <Button variant="default" className="neon-glow" size="icon" onClick={() => navigate('/admin')}>
          <Shield className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
