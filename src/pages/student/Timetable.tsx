import { motion } from "framer-motion";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/AuthContext";
import { getStudentTimetable } from "@/services/timetableService";
import { getStudentData } from "@/services/academic";
import { useQuery } from "@tanstack/react-query";
import { OfflineEmptyState, useOfflineLoading } from "@/components/OfflineEmptyState";

const Timetable = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Step 1: fetch student data (class_id)
  const { data: studentData } = useQuery({
    queryKey: ["student-data", profile?.id],
    queryFn: () => getStudentData(profile!.id),
    enabled: !!profile?.id && !profileLoading,
    staleTime: 5 * 60 * 1000,
  });

  // Step 2: fetch timetable once we have a class_id
  const { data: timetable = {}, isLoading: loading } = useQuery({
    queryKey: ["student-timetable", studentData?.class_id, profile?.school_id],
    queryFn: () => getStudentTimetable(studentData!.class_id, profile!.school_id),
    enabled: !!studentData?.class_id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000,
  });

  const subjectColors: Record<string, string> = {
    Mathematics: "bg-neon-cyan/20 border-neon-cyan/50",
    Physics: "bg-neon-purple/20 border-neon-purple/50",
    Chemistry: "bg-neon-pink/20 border-neon-pink/50",
    "Computer Science": "bg-blue-500/20 border-blue-500/50",
    English: "bg-accent/20 border-accent/50",
    Biology: "bg-green-500/20 border-green-500/50",
    History: "bg-yellow-500/20 border-yellow-500/50",
    Geography: "bg-orange-500/20 border-orange-500/50",
    default: "bg-gray-500/20 border-gray-500/50",
  };

  const getSubjectColor = (subject: string) => {
    return subjectColors[subject] || subjectColors.default;
  };

  // Calculate stats
  const totalDays = weekDays.filter(day => timetable[day]?.length > 0).length;
  const avgClassesPerDay = totalDays > 0 
    ? Math.round(weekDays.reduce((acc, day) => acc + (timetable[day]?.length || 0), 0) / totalDays) 
    : 0;

  const offlineLoading = useOfflineLoading(loading);

  if (offlineLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <OfflineEmptyState pageName="Timetable" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Class Timetable</h1>
            <p className="text-muted-foreground">Your weekly schedule</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">{totalDays}</p>
                <p className="text-sm text-muted-foreground">Days/Week</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">{avgClassesPerDay}</p>
                <p className="text-sm text-muted-foreground">Avg Classes/Day</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">1.5h</p>
                <p className="text-sm text-muted-foreground">Per Class</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">9 AM</p>
                <p className="text-sm text-muted-foreground">Start Time</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {Object.keys(timetable).length === 0 || weekDays.every(day => !timetable[day] || timetable[day].length === 0) ? (
          <Card className="glass-card p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Timetable Available</h2>
            <p className="text-muted-foreground">
              Your class timetable has not been set up yet. Please check back later or contact your school administrator.
            </p>
          </Card>
        ) : (
          <Tabs defaultValue="Monday" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              {weekDays.map((day) => (
                <TabsTrigger key={day} value={day}>
                  {day.slice(0, 3)}
                </TabsTrigger>
              ))}
            </TabsList>

            {weekDays.map((day) => (
              <TabsContent key={day} value={day} className="space-y-4 mt-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-2xl font-semibold mb-4">{day}</h2>
                </motion.div>

                {(!timetable[day] || timetable[day].length === 0) ? (
                  <Card className="glass-card p-6 bg-primary/5 border-primary/30">
                    <p className="text-center text-muted-foreground">
                      No classes scheduled for {day}
                    </p>
                  </Card>
                ) : (
                  timetable[day].map((period, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <Card className={`glass-card p-6 hover:neon-glow transition-all border-l-4 ${getSubjectColor(period.subject)}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[100px]">
                              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <p className="text-sm font-medium">{period.time}</p>
                            </div>
                            <div className="h-12 w-px bg-border hidden md:block" />
                            <div>
                              <h3 className="text-xl font-semibold mb-1">{period.subject}</h3>
                              <p className="text-sm text-muted-foreground">{period.teacher}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-primary">{period.room}</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}

                {day === "Saturday" && timetable[day] && timetable[day].length < 4 && timetable[day].length > 0 && (
                  <Card className="glass-card p-6 bg-primary/5 border-primary/30">
                    <p className="text-center text-muted-foreground">
                      Half day schedule - Classes end early
                    </p>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-card p-6 bg-primary/5 border-primary/30">
            <h3 className="font-semibold mb-2">📚 Schedule Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Lunch break: 12:15 PM - 1:00 PM</li>
              <li>• Saturday classes end early</li>
              <li>• Lab classes are 1.5 hours with practical work</li>
              <li>• Check for any schedule changes on notice board</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Timetable;
