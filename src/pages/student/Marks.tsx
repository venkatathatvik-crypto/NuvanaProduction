import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Award, FileText, Printer, School, User, Filter, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { getStudentGradedTests, StudentGradedTest } from "@/services/academic";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { OfflineEmptyState, useOfflineLoading } from "@/components/OfflineEmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { schoolService } from "@/services/schoolService";
import { getStudentData } from "@/services/studentDataService";

const MarksSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>

    <Card className="glass-card p-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </Card>
  </div>
);

const Marks = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();

  const { data: gradedTests = [], isLoading: loading } = useQuery({
    queryKey: ["student-marks", profile?.id],
    queryFn: () => getStudentGradedTests(profile!.id),
    enabled: !!profile,
  });

  // Fetch school details
  const { data: schoolData } = useQuery({
    queryKey: ["school-details", profile?.school_id],
    queryFn: () => schoolService.getSchool(profile!.school_id!),
    enabled: !!profile?.school_id,
  });

  // Fetch detailed student info (for class/grade names)
  const { data: studentInfo } = useQuery({
    queryKey: ["student-detailed-info", profile?.id],
    queryFn: () => getStudentData(profile!.id),
    enabled: !!profile?.id,
  });

  const [selectedExamType, setSelectedExamType] = useState<string>("All");

  const examTypes = useMemo(() => {
    const types = new Set(gradedTests.map(t => t.examTypeName));
    return ["All", ...Array.from(types)];
  }, [gradedTests]);

  const filteredTests = useMemo(() => {
    if (selectedExamType === "All") return gradedTests;
    return gradedTests.filter(t => t.examTypeName === selectedExamType);
  }, [gradedTests, selectedExamType]);

  // Group tests by subject and calculate performance
  const reportData = useMemo(() => {
    const grouped: Record<string, {
      tests: StudentGradedTest[];
      totalObtained: number;
      totalPossible: number;
      averagePercentage: number;
      grade: string;
    }> = {};

    filteredTests.forEach(test => {
      const subject = test.subjectName || "Other";
      if (!grouped[subject]) {
        grouped[subject] = { tests: [], totalObtained: 0, totalPossible: 0, averagePercentage: 0, grade: "" };
      }
      grouped[subject].tests.push(test);
      grouped[subject].totalObtained += test.marksObtained;
      grouped[subject].totalPossible += test.totalMarks;
    });

    Object.keys(grouped).forEach(subject => {
      const { totalObtained, totalPossible } = grouped[subject];
      const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
      grouped[subject].averagePercentage = Math.round(percentage);
      grouped[subject].grade = getGradeFromPercentage(percentage);
    });

    return grouped;
  }, [filteredTests]);

  const overallPerformance = useMemo(() => {
    if (filteredTests.length === 0) {
      return { average: 0, totalMarks: 0, maxMarks: 0 };
    }
    const totalMarks = filteredTests.reduce((sum, t) => sum + t.marksObtained, 0);
    const maxMarks = filteredTests.reduce((sum, t) => sum + t.totalMarks, 0);
    const average = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
    return { average, totalMarks, maxMarks };
  }, [filteredTests]);

  function getGradeFromPercentage(percentage: number): string {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    return "D";
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-neon-cyan";
    if (grade.startsWith("B")) return "text-neon-purple";
    return "text-neon-pink";
  };

  const offlineLoading = useOfflineLoading(loading);

  if (offlineLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <OfflineEmptyState pageName="Marks & Results" />
        </div>
      </div>
    );
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <MarksSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/student")} className="shrink-0 glass hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold neon-text">Report Card</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Academic Performance Summary</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 glass px-3 py-1 rounded-lg">
              <Filter className="w-4 h-4 text-primary" />
              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger className="w-[180px] bg-transparent border-none focus:ring-0">
                  <SelectValue placeholder="Exam Type" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  {examTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Profile and Stats section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="glass-card lg:col-span-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{profile?.name}</h3>
              <p className="text-sm text-muted-foreground">Student ID: {profile?.id.slice(0, 8)}</p>
            </div>
            {/* <div className="w-full pt-4 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Session:</span>
                <span className="font-medium">2023-24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rank:</span>
                <span className="text-neon-cyan font-bold">#12</span>
              </div>
            </div> */}
          </Card>

          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="glass-card p-6 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-transparent">
              <Award className="w-12 h-12 text-primary mb-3 neon-icon-glow" />
              <div className="text-4xl font-bold neon-text">{overallPerformance.average}%</div>
              <div className="text-sm text-muted-foreground mt-1">Average Percentage</div>
              <div className={`mt-2 font-bold ${getGradeColor(getGradeFromPercentage(overallPerformance.average))}`}>
                Grade: {getGradeFromPercentage(overallPerformance.average)}
              </div>
            </Card>

            <Card className="glass-card p-6 flex flex-col items-center justify-center bg-gradient-to-br from-secondary/5 to-transparent">
              <p className="text-4xl font-bold text-primary">{overallPerformance.totalMarks}/{overallPerformance.maxMarks}</p>
              <p className="text-sm text-muted-foreground mt-2">Aggregate Marks</p>
              <p className="text-xs text-muted-foreground opacity-50 mt-1">Total Score Obtained</p>
            </Card>

            <Card className="glass-card p-6 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold text-primary">{filteredTests.length}</p>
              <p className="text-sm text-muted-foreground mt-2">Assessments Taken</p>
              <p className="text-xs text-muted-foreground opacity-50 mt-1">
                {selectedExamType === "All" ? "Graded Components" : `Graded for ${selectedExamType}`}
              </p>
            </Card>
          </div>
        </div>

        {/* Report Card Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredTests.length > 0 ? (
            <Card className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <School className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">Subject-wise Result</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="w-[300px] font-bold">Subject Description</TableHead>
                      <TableHead className="text-center font-bold">Marks Obtained</TableHead>
                      <TableHead className="text-center font-bold">Max Marks</TableHead>
                      <TableHead className="text-center font-bold">Percentage</TableHead>
                      <TableHead className="text-right font-bold">Result Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(reportData).map(([subject, data], idx) => (
                      <TableRow key={subject} className="border-white/5 group hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{subject}</span>
                            <span className="text-xs text-muted-foreground">{data.tests.length} Assessment(s)</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-primary">{data.totalObtained}</TableCell>
                        <TableCell className="text-center">{data.totalPossible}</TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-1 rounded bg-secondary/10 text-primary font-mono">
                            {data.averagePercentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold text-lg ${getGradeColor(data.grade)}`}>
                            {data.grade}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-primary/5 hover:bg-primary/5">
                    <TableRow className="border-none">
                      <TableCell className="font-bold text-lg">Grand Total</TableCell>
                      <TableCell className="text-center font-bold text-lg text-primary">{overallPerformance.totalMarks}</TableCell>
                      <TableCell className="text-center font-bold text-lg">{overallPerformance.maxMarks}</TableCell>
                      <TableCell className="text-center font-bold text-lg text-primary">{overallPerformance.average}%</TableCell>
                      <TableCell className="text-right font-bold text-lg text-neon-cyan">
                        {getGradeFromPercentage(overallPerformance.average)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Card>
          ) : (
            <Card className="glass-card p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">
                {selectedExamType === "All" ? "No Graded Tests Yet" : `No Graded ${selectedExamType} Tests`}
              </h3>
              <p className="text-muted-foreground">
                {selectedExamType === "All" 
                  ? "Your test results will appear here once your teacher grades them."
                  : `You don't have any graded results for ${selectedExamType} yet.`
                }
              </p>
              {selectedExamType === "All" && (
                <Button className="mt-6 glass" onClick={() => navigate("/student/tests")}>
                  Browse Tests
                </Button>
              )}
            </Card>
          )}
        </motion.div>

        {/* Detailed individual test section
        {filteredTests.length > 0 && (
          <div className="space-y-4 pt-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" /> 
              {selectedExamType === "All" ? "Recent Assessments" : `${selectedExamType} Assessments`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTests.slice(0, 6).map((test, index) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Card 
                    className="glass-card p-4 hover:neon-glow transition-all cursor-pointer group"
                    onClick={() => navigate(`/student/tests/take/${test.testId}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">{test.testTitle}</h4>
                        <p className="text-xs text-muted-foreground">{test.subjectName} • {new Date(test.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-sm font-bold ${getGradeColor(getGradeFromPercentage(test.percentage))}`}>
                        {getGradeFromPercentage(test.percentage)}
                      </span>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div className="text-2xl font-bold text-primary">{test.marksObtained}/{test.totalMarks}</div>
                      <div className="text-sm font-medium text-muted-foreground">{test.percentage}%</div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            {filteredTests.length > 6 && (
               <div className="text-center pt-4">
                  <Button variant="ghost" className="text-muted-foreground hover:text-primary underline" onClick={() => navigate("/student/tests")}>
                    View all {selectedExamType !== "All" ? `${selectedExamType.toLowerCase()} ` : ""}graded tests
                  </Button>
               </div>
            )}
          </div>
        )} */}
      </div>

    </div>
  );
};

export default Marks;
