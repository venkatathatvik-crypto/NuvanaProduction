import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Trophy, Music, Briefcase, FileText, Play, Eye, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getStudentData, getStudentTests, StudentTest } from "@/services/academic";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { format } from "date-fns";

const Events = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const [internalAssessments, setInternalAssessments] = useState<StudentTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInternalAssessments = async () => {
      if (profileLoading) return;

      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const studentData = await getStudentData(profile.id);
        if (!studentData) {
          setLoading(false);
          return;
        }

        // Fetch all tests and filter only Internal Assessments (exam_type_id = 4)
        const testsData = await getStudentTests(studentData.class_id, profile.id);
        const assessments = testsData.filter(test => test.examTypeId === 4);
        setInternalAssessments(assessments);
      } catch (error: any) {
        console.error("Error fetching internal assessments:", error);
        toast.error("Failed to load assessments");
      } finally {
        setLoading(false);
      }
    };

    fetchInternalAssessments();
  }, [profile, profileLoading]);

  const upcomingEvents = [
    {
      title: "Mid-Term Examinations",
      date: "2024-12-05",
      time: "9:00 AM",
      location: "Exam Hall A",
      type: "Academic",
      icon: Briefcase,
      color: "destructive",
      description: "Mathematics, Physics, Chemistry exams over 3 days",
      urgent: true,
    },
    {
      title: "Science Exhibition",
      date: "2024-12-10",
      time: "10:00 AM",
      location: "Main Auditorium",
      type: "Academic",
      icon: Trophy,
      color: "neon-cyan",
      description: "Annual science project exhibition and competition",
      urgent: false,
    },
    {
      title: "Sports Day",
      date: "2024-12-15",
      time: "7:00 AM",
      location: "Sports Ground",
      type: "Sports",
      icon: Trophy,
      color: "neon-purple",
      description: "Inter-class sports competition. Register by Dec 10",
      urgent: false,
    },
    {
      title: "Cultural Fest",
      date: "2024-12-20",
      time: "4:00 PM",
      location: "College Campus",
      type: "Cultural",
      icon: Music,
      color: "neon-pink",
      description: "Annual cultural festival with music, dance, and drama",
      urgent: false,
    },
  ];

  const pastEvents = [
    {
      title: "Unit Test - Computer Science",
      date: "2024-11-25",
      type: "Academic",
      score: "45/50",
    },
    {
      title: "Guest Lecture on AI",
      date: "2024-11-20",
      type: "Academic",
      attended: true,
    },
    {
      title: "Basketball Tournament",
      date: "2024-11-15",
      type: "Sports",
      result: "Semifinals",
    },
  ];

  const deadlines = [
    { task: "Computer Science Project", dueDate: "2024-12-03", priority: "high" },
    { task: "Physics Lab Report", dueDate: "2024-12-05", priority: "high" },
    { task: "English Essay Submission", dueDate: "2024-12-08", priority: "medium" },
    { task: "Mathematics Assignment", dueDate: "2024-12-12", priority: "medium" },
  ];

  const getEventColor = (color: string) => {
    const colors: Record<string, string> = {
      "destructive": "bg-destructive/20 text-destructive border-destructive/30",
      "neon-cyan": "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30",
      "neon-purple": "bg-neon-purple/20 text-neon-purple border-neon-purple/30",
      "neon-pink": "bg-neon-pink/20 text-neon-pink border-neon-pink/30",
    };
    return colors[color] || colors["neon-cyan"];
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
            <h1 className="text-4xl font-bold neon-text">Assignments & Deadlines</h1>
            <p className="text-muted-foreground">Stay on track with your academics</p>
          </motion.div>
        </div>

        <Tabs defaultValue="assessments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assessments">Internal Assessments</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>

          {/* Internal Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : internalAssessments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No internal assessments available.</p>
              </div>
            ) : (
              <>
                {/* Summary Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="glass-card p-6 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-primary">{internalAssessments.length}</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-blue-500">
                          {internalAssessments.filter(a => a.submissionStatus === "not_started").length}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-yellow-500">
                          {internalAssessments.filter(a => a.submissionStatus === "pending").length}
                        </p>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-500">
                          {internalAssessments.filter(a => a.submissionStatus === "graded").length}
                        </p>
                        <p className="text-sm text-muted-foreground">Graded</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Assessment Cards */}
                {internalAssessments.map((assessment, index) => (
                  <motion.div
                    key={assessment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Card className="glass-card p-6 hover:neon-glow transition-all">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="p-4 rounded-lg bg-primary/20 text-primary border-primary/30 flex-shrink-0">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold">{assessment.title}</h3>
                              {assessment.subjectName && (
                                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary mt-1 inline-block">
                                  {assessment.subjectName}
                                </span>
                              )}
                            </div>
                            <Badge 
                              variant={
                                assessment.submissionStatus === "graded" ? "default" :
                                assessment.submissionStatus === "pending" ? "secondary" : "outline"
                              }
                              className={
                                assessment.submissionStatus === "graded" ? "bg-green-500/20 text-green-500 border-green-500/50" :
                                assessment.submissionStatus === "pending" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" :
                                "bg-blue-500/20 text-blue-500 border-blue-500/50"
                              }
                            >
                              {assessment.submissionStatus === "graded" ? "Graded" :
                               assessment.submissionStatus === "pending" ? "Submitted" : "Not Started"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mb-3">
                            {assessment.description || "No description provided."}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {assessment.durationMinutes} mins
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {assessment.questionCount} Questions
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4" />
                              {assessment.totalMarks} Marks
                            </div>
                            {assessment.dueDate && (
                              <div className="flex items-center gap-2 text-destructive">
                                <Calendar className="w-4 h-4" />
                                Due: {format(new Date(assessment.dueDate), "MMM dd, yyyy")}
                              </div>
                            )}
                          </div>

                          {/* Show score if graded */}
                          {assessment.submissionStatus === "graded" && assessment.marksObtained !== undefined && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Your Score</span>
                                <span className="text-xl font-bold text-green-500">
                                  {assessment.marksObtained} / {assessment.totalMarks}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          {assessment.submissionStatus === "not_started" && (
                            <Button onClick={() => navigate(`/student/tests/take/${assessment.id}`)}>
                              <Play className="w-4 h-4 mr-2" /> Start Assessment
                            </Button>
                          )}
                          {assessment.submissionStatus === "pending" && (
                            <Button variant="secondary" disabled>
                              <CheckCircle className="w-4 h-4 mr-2" /> Awaiting Results
                            </Button>
                          )}
                          {assessment.submissionStatus === "graded" && (
                            <Button variant="outline" onClick={() => navigate(`/student/tests/take/${assessment.id}`)}>
                              <Eye className="w-4 h-4 mr-2" /> View Results
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card p-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">{upcomingEvents.length}</p>
                    <p className="text-sm text-muted-foreground">Upcoming</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-destructive">
                      {upcomingEvents.filter(e => e.urgent).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Urgent</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-secondary">
                      {upcomingEvents.filter(e => e.type === "Academic").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Academic</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-accent">
                      {upcomingEvents.filter(e => e.type !== "Academic").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Extra</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {upcomingEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className={`glass-card p-6 hover:neon-glow transition-all ${event.urgent ? 'border-destructive' : ''}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className={`p-4 rounded-lg ${getEventColor(event.color)} flex-shrink-0`}>
                      <event.icon className="w-8 h-8" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold">{event.title}</h3>
                          {event.urgent && (
                            <Badge variant="destructive" className="mt-1">Urgent</Badge>
                          )}
                        </div>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{event.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {event.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {event.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="deadlines" className="space-y-4 mt-6">
            {deadlines.map((deadline, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="glass-card p-6 hover:neon-glow transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{deadline.task}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Due: {deadline.dueDate}
                      </div>
                    </div>
                    <Badge variant={deadline.priority === "high" ? "destructive" : "secondary"}>
                      {deadline.priority.toUpperCase()}
                    </Badge>
                  </div>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {pastEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{event.date}</p>
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                  {'score' in event && (
                    <p className="text-sm mt-2">Score: <span className="font-semibold text-primary">{event.score}</span></p>
                  )}
                  {'result' in event && (
                    <p className="text-sm mt-2">Result: <span className="font-semibold text-primary">{event.result}</span></p>
                  )}
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Events;
