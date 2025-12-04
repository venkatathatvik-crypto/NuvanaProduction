import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Timetable = () => {
  const navigate = useNavigate();

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const timetable: Record<string, Array<{ time: string; subject: string; room: string; teacher: string }>> = {
    Monday: [
      { time: "9:00 - 10:30", subject: "Mathematics", room: "Room 301", teacher: "Dr. Smith" },
      { time: "10:45 - 12:15", subject: "Physics", room: "Lab 2", teacher: "Prof. Johnson" },
      { time: "1:00 - 2:30", subject: "English", room: "Room 105", teacher: "Ms. Williams" },
      { time: "2:45 - 4:15", subject: "Computer Science", room: "Lab 1", teacher: "Dr. Brown" },
    ],
    Tuesday: [
      { time: "9:00 - 10:30", subject: "Chemistry", room: "Lab 3", teacher: "Dr. Davis" },
      { time: "10:45 - 12:15", subject: "Mathematics", room: "Room 301", teacher: "Dr. Smith" },
      { time: "1:00 - 2:30", subject: "Physics", room: "Lab 2", teacher: "Prof. Johnson" },
      { time: "2:45 - 4:15", subject: "English", room: "Room 105", teacher: "Ms. Williams" },
    ],
    Wednesday: [
      { time: "9:00 - 10:30", subject: "Computer Science", room: "Lab 1", teacher: "Dr. Brown" },
      { time: "10:45 - 12:15", subject: "Chemistry", room: "Lab 3", teacher: "Dr. Davis" },
      { time: "1:00 - 2:30", subject: "Mathematics", room: "Room 301", teacher: "Dr. Smith" },
      { time: "2:45 - 4:15", subject: "Physics", room: "Lab 2", teacher: "Prof. Johnson" },
    ],
    Thursday: [
      { time: "9:00 - 10:30", subject: "English", room: "Room 105", teacher: "Ms. Williams" },
      { time: "10:45 - 12:15", subject: "Computer Science", room: "Lab 1", teacher: "Dr. Brown" },
      { time: "1:00 - 2:30", subject: "Chemistry", room: "Lab 3", teacher: "Dr. Davis" },
      { time: "2:45 - 4:15", subject: "Mathematics", room: "Room 301", teacher: "Dr. Smith" },
    ],
    Friday: [
      { time: "9:00 - 10:30", subject: "Physics", room: "Lab 2", teacher: "Prof. Johnson" },
      { time: "10:45 - 12:15", subject: "English", room: "Room 105", teacher: "Ms. Williams" },
      { time: "1:00 - 2:30", subject: "Computer Science", room: "Lab 1", teacher: "Dr. Brown" },
      { time: "2:45 - 4:15", subject: "Chemistry", room: "Lab 3", teacher: "Dr. Davis" },
    ],
    Saturday: [
      { time: "9:00 - 10:30", subject: "Mathematics", room: "Room 301", teacher: "Dr. Smith" },
      { time: "10:45 - 12:15", subject: "Physics Lab", room: "Lab 2", teacher: "Prof. Johnson" },
      { time: "1:00 - 2:30", subject: "Chemistry Lab", room: "Lab 3", teacher: "Dr. Davis" },
    ],
  };

  const subjectColors: Record<string, string> = {
    Mathematics: "bg-neon-cyan/20 border-neon-cyan/50",
    Physics: "bg-neon-purple/20 border-neon-purple/50",
    Chemistry: "bg-neon-pink/20 border-neon-pink/50",
    "Computer Science": "bg-blue-500/20 border-blue-500/50",
    English: "bg-accent/20 border-accent/50",
    "Physics Lab": "bg-neon-purple/20 border-neon-purple/50",
    "Chemistry Lab": "bg-neon-pink/20 border-neon-pink/50",
  };

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
                <p className="text-3xl font-bold text-primary">6</p>
                <p className="text-sm text-muted-foreground">Days/Week</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">4</p>
                <p className="text-sm text-muted-foreground">Classes/Day</p>
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

        <Tabs defaultValue="Monday" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            {weekDays.map((day) => (
              <TabsTrigger key={day} value={day}>
                {day.slice(0, 3)}
              </TabsTrigger>
            ))}
          </TabsList>

          {weekDays.map((day, dayIndex) => (
            <TabsContent key={day} value={day} className="space-y-4 mt-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-semibold mb-4">{day}</h2>
              </motion.div>

              {timetable[day].map((period, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className={`glass-card p-6 hover:neon-glow transition-all border-l-4 ${subjectColors[period.subject]}`}>
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
              ))}

              {day === "Saturday" && timetable[day].length < 4 && (
                <Card className="glass-card p-6 bg-primary/5 border-primary/30">
                  <p className="text-center text-muted-foreground">
                    Half day schedule - Classes end at 2:30 PM
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="glass-card p-6 bg-primary/5 border-primary/30">
            <h3 className="font-semibold mb-2">📚 Schedule Notes</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Lunch break: 12:15 PM - 1:00 PM</li>
              <li>• Saturday classes end early at 2:30 PM</li>
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
