// Full updated AnalyticsDashboard.tsx with Topic/Chapter-wise performance added
// ---------- START OF FILE ----------

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ExpandableChartWidget } from "@/components/charts/ExpandableChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Users,
  BookOpen,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowLeft,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAnalyticsPDF } from "@/lib/pdfExport";
import { useNavigate } from "react-router-dom";
import {
  getTeacherClasses,
  FlattenedClass,
  getChapterTopicAnalytics,
  getClassPerformanceTrend,
  getClassStudentsWithScores,
  getRecentTestsMetrics,
  getClassSubjectAverages,
  getAttendanceVsMarksData,
  getQuestionTypeDistribution,
  getStudentAnalyticsForTeacher,
  ClassPerformanceTrend,
  StudentWithScore,
  RecentTestMetrics,
  SubjectAverage,
  AttendanceVsMarks,
  QuestionTypeDistribution,
  StudentAnalyticsForTeacher,
} from "@/services/academic";
import { useAuth } from "@/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { schoolService } from "@/services/schoolService";

// Professional colors optimized for white background (PDF export)
const PROFESSIONAL_COLORS = {
  primary: "#1e40af",      // Darker blue for better contrast
  secondary: "#15803d",    // Darker green
  accent: "#ea580c",       // Darker orange
  danger: "#dc2626",       // Darker red
  purple: "#7c3aed",       // Darker purple
  teal: "#0d9488",         // Darker teal
};

// Legacy colors for backward compatibility (screen display)
const NEON_COLORS = {
  primary: "#8884d8",
  secondary: "#82ca9d",
  accent: "#ffc658",
  danger: "#ff7373",
};

// ---------------- TYPE DEFINITIONS ----------------
interface StudentAnalyticsData {
  radar: { subject: string; A: number; B: number }[];
  strengths: {
    subject: string;
    desc: string;
    topic?: string;
    mastery?: number;
  }[];
  weaknesses: {
    subject: string;
    desc: string;
    topic?: string;
    mastery?: number;
  }[];
  progress?: { month: string; score: number }[];
  attendance?: { percentage: number; presentDays: number; totalDays: number };
  chapterTopic?: {
    chapters: { name: string; avgScore: number; totalQuestions: number }[];
    topics: {
      name: string;
      avgScore: number;
      totalQuestions: number;
      chapters: string[];
    }[];
  };
}

interface TopicChapterData {
  topics: {
    topic: string;
    avg: number;
    chapters: { chapter: string; score: number }[];
  }[];
}

// ---------------- MAIN COMPONENT ----------------
const AnalyticsDashboard = () => {
  const { profile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  // State for topic/chapter analytics (class level)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Subject filter state for strengths and weaknesses
  const [selectedSubjectFilter, setSelectedSubjectFilter] =
    useState<string>("all");

  // State for chapter/topic filters in weak areas section
  const [weakAreasChapterFilter, setWeakAreasChapterFilter] = useState<string>("all");
  const [weakAreasTopicFilter, setWeakAreasTopicFilter] = useState<string>("all");
  const [weakAreasScoreThreshold, setWeakAreasScoreThreshold] = useState<number>(60);

  // State for student analysis filters
  const [studentAnalysisChapterFilter, setStudentAnalysisChapterFilter] = useState<string>("all");
  const [studentAnalysisTopicFilter, setStudentAnalysisTopicFilter] = useState<string>("all");
  const [studentAnalysisScoreThreshold, setStudentAnalysisScoreThreshold] = useState<number>(60);

  // Student analytics query moved after selectedClass declaration (see below)

  const [topicChapterData, setTopicChapterData] = useState<
    Record<string, Record<string, TopicChapterData>>
  >({});

  // Fetch teacher's classes using React Query
  const { data: classes = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.teacher.classes(
      profile?.id ?? "",
      profile?.school_id ?? ""
    ),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getTeacherClasses(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set first class as selected when classes are loaded
  const [selectedClass, setSelectedClass] = useState<
    FlattenedClass | undefined
  >();
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  // React Query for student analytics - replaces manual state management
  const {
    data: currentStudentData,
    isLoading: currentStudentLoading,
    error: studentAnalyticsError,
    refetch: refetchStudentAnalytics
  } = useQuery({
    queryKey: ['student-analytics-for-teacher', selectedStudent, selectedClass?.class_id],
    queryFn: async () => {
      if (!selectedStudent || !selectedClass) return null;
      return await getStudentAnalyticsForTeacher(selectedStudent, selectedClass.class_id);
    },
    enabled: !!selectedStudent && !!selectedClass,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache retention (formerly cacheTime)
    retry: 1,
  });

  // Build studentAnalyticsData from query for backward compatibility
  const studentAnalyticsData = useMemo(() => {
    if (!selectedStudent || !currentStudentData) return {};
    return {
      [selectedStudent]: currentStudentData
    };
  }, [selectedStudent, currentStudentData]);

  // Fetch class insights data using React Query
  const { data: classInsightsData, isLoading: classInsightsLoading } = useQuery(
    {
      queryKey: ["class-insights", selectedClass?.class_id ?? ""],
      queryFn: async () => {
        if (!selectedClass) return null;
        const [trend, subjects, attVsMarks] = await Promise.all([
          getClassPerformanceTrend(selectedClass.class_id),
          getClassSubjectAverages(selectedClass.class_id),
          getAttendanceVsMarksData(selectedClass.class_id),
        ]);
        return { trend, subjects, attVsMarks };
      },
      enabled: !!selectedClass,
      staleTime: 3 * 60 * 1000, // 3 minutes
    }
  );

  const performanceTrendData = classInsightsData?.trend ?? [];
  const subjectAverageData = classInsightsData?.subjects ?? [];
  const attendanceVsMarksData = classInsightsData?.attVsMarks ?? [];

  // Fetch chapter/topic analytics using React Query
  const {
    data: analyticsData = { chapters: [], topics: [] },
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ["chapter-topic-analytics", selectedClass?.class_id ?? ""],
    queryFn: async () => {
      if (!selectedClass) return { chapters: [], topics: [] };
      return await getChapterTopicAnalytics(selectedClass.class_id);
    },
    enabled: !!selectedClass,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Fetch students list using React Query
  const { data: studentsList = [], isLoading: studentAnalysisLoading } =
    useQuery({
      queryKey: ["class-students-scores", selectedClass?.class_id ?? ""],
      queryFn: async () => {
        if (!selectedClass) return [];
        return await getClassStudentsWithScores(selectedClass.class_id);
      },
      enabled: !!selectedClass,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

  // Set first student as selected when students list is loaded
  useEffect(() => {
    if (studentsList.length > 0 && !selectedStudent) {
      setSelectedStudent(studentsList[0].id);
    }
  }, [studentsList, selectedStudent]);

  // Fetch test metrics using React Query
  const { data: testMetricsData, isLoading: testMetricsLoading } = useQuery({
    queryKey: ["test-metrics", selectedClass?.class_id ?? ""],
    queryFn: async () => {
      if (!selectedClass) return null;
      const [recentTests, questionTypes] = await Promise.all([
        getRecentTestsMetrics(selectedClass.class_id),
        getQuestionTypeDistribution(selectedClass.class_id),
      ]);
      return { recentTests, questionTypes };
    },
    enabled: !!selectedClass,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const recentTestsData = testMetricsData?.recentTests ?? [];
  const questionTypeData = testMetricsData?.questionTypes ?? [];

  // Get available topics based on selected chapter
  const availableTopics = useMemo(() => {
    if (weakAreasChapterFilter === "all") {
      return analyticsData.topics;
    }
    // Filter topics that belong to the selected chapter
    return analyticsData.topics.filter((t) => 
      t.chapters.includes(weakAreasChapterFilter)
    );
  }, [analyticsData.topics, weakAreasChapterFilter]);

  // Reset topic filter when chapter changes and selected topic is not in available topics
  React.useEffect(() => {
    if (weakAreasTopicFilter !== "all" && !availableTopics.some(t => t.name === weakAreasTopicFilter)) {
      setWeakAreasTopicFilter("all");
    }
  }, [weakAreasChapterFilter, availableTopics, weakAreasTopicFilter]);

  // Memoized filtered data for weak areas section
  const filteredWeakChapters = useMemo(() => {
    return analyticsData.chapters
      .filter((c) => c.avgScore < weakAreasScoreThreshold)
      .filter((c) => weakAreasChapterFilter === "all" || c.name === weakAreasChapterFilter)
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [analyticsData.chapters, weakAreasChapterFilter, weakAreasScoreThreshold]);

  const filteredWeakTopics = useMemo(() => {
    return analyticsData.topics
      .filter((t) => t.avgScore < weakAreasScoreThreshold)
      .filter((t) => {
        if (weakAreasTopicFilter === "all" && weakAreasChapterFilter === "all") return true;
        if (weakAreasTopicFilter !== "all" && t.name === weakAreasTopicFilter) return true;
        if (weakAreasChapterFilter !== "all" && t.chapters.includes(weakAreasChapterFilter)) return true;
        return false;
      })
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [analyticsData.topics, weakAreasTopicFilter, weakAreasChapterFilter, weakAreasScoreThreshold]);

  // Auto-reset weak areas topic filter when chapter changes
  React.useEffect(() => {
    if (weakAreasTopicFilter !== "all") {
      const topicsInChapter = analyticsData.topics.filter((t) =>
        t.chapters.includes(weakAreasChapterFilter)
      );
      if (weakAreasChapterFilter !== "all" && !topicsInChapter.some(t => t.name === weakAreasTopicFilter)) {
        setWeakAreasTopicFilter("all");
      }
    }
  }, [weakAreasChapterFilter, analyticsData.topics, weakAreasTopicFilter]);

  // Auto-reset student analysis topic filter when chapter changes or student changes
  React.useEffect(() => {
    if (studentAnalysisTopicFilter !== "all" && selectedStudent && studentAnalyticsData[selectedStudent]?.chapterTopic) {
      const availableTopics = studentAnalysisChapterFilter === "all"
        ? studentAnalyticsData[selectedStudent].chapterTopic.topics
        : studentAnalyticsData[selectedStudent].chapterTopic.topics.filter((t) =>
            t.chapters.includes(studentAnalysisChapterFilter)
          );
      
      if (!availableTopics.some(t => t.name === studentAnalysisTopicFilter)) {
        setStudentAnalysisTopicFilter("all");
      }
    }
  }, [studentAnalysisChapterFilter, selectedStudent, studentAnalyticsData, studentAnalysisTopicFilter]);

  // Cache invalidation functions
  const invalidateStudentAnalytics = React.useCallback((studentId?: string) => {
    if (studentId) {
      // Invalidate specific student's data
      queryClient.invalidateQueries({
        queryKey: ['student-analytics-for-teacher', studentId]
      });
    } else if (selectedStudent) {
      // Invalidate current student's data
      queryClient.invalidateQueries({
        queryKey: ['student-analytics-for-teacher', selectedStudent, selectedClass?.class_id]
      });
    }
    // Also invalidate class-level data as it may have changed
    queryClient.invalidateQueries({
      queryKey: ['chapter-topic-analytics', selectedClass?.class_id]
    });
    queryClient.invalidateQueries({
      queryKey: ['class-students-scores', selectedClass?.class_id]
    });
  }, [queryClient, selectedStudent, selectedClass]);

  // Manual refresh handler
  const handleRefreshStudentData = React.useCallback(() => {
    if (selectedStudent && selectedClass) {
      refetchStudentAnalytics();
      toast.success("Student data refreshed");
    }
  }, [selectedStudent, selectedClass, refetchStudentAnalytics]);

  // Expose invalidation function globally for use after test grading/creation
  React.useEffect(() => {
    // Store in window for access from other components
    (window as any).invalidateStudentAnalytics = invalidateStudentAnalytics;
    return () => {
      delete (window as any).invalidateStudentAnalytics;
    };
  }, [invalidateStudentAnalytics]);

  // Fetch School Info for PDF Logo/Watermark
  const { data: schoolInfo } = useQuery({
    queryKey: queryKeys.school.details(profile?.school_id ?? ""),
    queryFn: async () => {
      if (!profile?.school_id) return null;
      return await schoolService.getSchool(profile.school_id);
    },
    enabled: !!profile?.school_id,
  });


  /* OLD MANUAL FETCHING - NOW HANDLED BY REACT QUERY
  // Fetch individual student analytics when student selection changes (keep in useEffect due to dependency)
  useEffect(() => {
    const fetchStudentAnalytics = async () => {
      if (!selectedStudent || !selectedClass) return;
      // Don't refetch if we already have data for this student
      if (studentAnalyticsData[selectedStudent]) return;

      try {
        const analytics = await getStudentAnalyticsForTeacher(
          selectedStudent,
          selectedClass.class_id
        );
        setStudentAnalyticsData((prev) => ({
          ...prev,
          [selectedStudent]: {
            radar: analytics.radar,
            strengths: analytics.strengths,
            weaknesses: analytics.weaknesses,
            progress: analytics.progress,
            attendance: analytics.attendance,
            chapterTopic: analytics.chapterTopic,
          },
        }));
      } catch (error: any) {
        console.error("Error fetching student analytics:", error);
        toast.error("Failed to load student analytics");
      }
    };

    fetchStudentAnalytics();
  }, [selectedStudent, selectedClass, studentAnalyticsData]);
  */

  const handleExportCSV = () => {
    if (!selectedClass) return;

    // Export student performance list
    const header = "Student ID,Name,Avg Score,Attendance %\n";
    const rows = studentsList
      .map(
        (s) =>
          `${s.id},"${s.name.replace(/"/g, '""')}",${s.avgScore},${
            s.attendancePercentage
          }`
      )
      .join("\n");

    const csvContent = header + rows;
    const filename = `report_${selectedClass.class_name}_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data exported to CSV!");
  };

  // PDF Export with watermark, A4 margins, and no data split
  const handlePrint = async () => {
    try {
      toast.info("Generating full professional report...");
      const printElement = document.getElementById("analytics-full-report");
      if (printElement) {
        printElement.style.display = "block";
      }

      await exportAnalyticsPDF({
        elementId: "analytics-full-report",
        logoUrl: schoolInfo?.logo_url || "/logo.png",
        schoolName: schoolInfo?.name || "Nuvana Academy",
        watermarkOpacity: 0.05,
        watermarkWidth: 80,
        marginMm: 20,
        filename: `Full_Analytics_Report_${selectedClass?.class_name || 'Class'}_${new Date().toISOString().split('T')[0]}.pdf`,
      });

      if (printElement) {
        printElement.style.display = "none";
      }
      toast.success("Full report generated successfully!");
    } catch (err) {
      console.error("PDF Export Error:", err);
      toast.error("Failed to export PDF");
    }
  };

  // Helper function to calculate linear regression trend line
  const calculateTrendLine = (data: AttendanceVsMarks[]) => {
    if (data.length < 2) return [];

    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.attendance, 0);
    const sumY = data.reduce((sum, d) => sum + d.marks, 0);
    const sumXY = data.reduce((sum, d) => sum + d.attendance * d.marks, 0);
    const sumX2 = data.reduce((sum, d) => sum + d.attendance * d.attendance, 0);

    // Calculate slope and intercept using least squares method
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate line points from min to max attendance
    const minX = Math.min(...data.map((d) => d.attendance));
    const maxX = Math.max(...data.map((d) => d.attendance));

    return [
      { attendance: minX, trendMarks: slope * minX + intercept, marks: 0 },
      { attendance: maxX, trendMarks: slope * maxX + intercept, marks: 0 },
    ];
  };

  if (loading) return <LoadingSpinner />;
  if (!selectedClass)
    return (
      <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">
        No classes found
      </div>
    );

  // Get current student analytics with fallback
  const currentStudentAnalytics = studentAnalyticsData[selectedStudent] || {
    radar: [],
    strengths: [],
    weaknesses: [],
  };

  // Get current topic/chapter data with fallback
  const currentTopicChapterData = topicChapterData[selectedStudent] || {};

  return (
    <div
      id="analytics-pdf-root"
      className="min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-8 bg-background"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
            className="shrink-0 print:hidden"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 truncate">
              Analytics Dashboard 📊
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Deep insights into student performance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="glass shrink-0"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="glass shrink-0"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Save PDF
          </Button>
          <div className="w-full sm:w-48 ml-0 lg:ml-2">
            <Select
              value={selectedClass?.class_id}
              onValueChange={(id) =>
                setSelectedClass(classes.find((c) => c.class_id === id))
              }
            >
              <SelectTrigger className="glass w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="class" className="space-y-4 sm:space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl h-auto">
          <TabsTrigger
            value="class"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Class Insights</span>
            <span className="sm:hidden">Class</span>
          </TabsTrigger>
          <TabsTrigger
            value="topics"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Chapter & Topics</span>
            <span className="sm:hidden">Topics</span>
          </TabsTrigger>
          <TabsTrigger
            value="student"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Student Analysis</span>
            <span className="sm:hidden">Students</span>
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Test Metrics</span>
            <span className="sm:hidden">Tests</span>
          </TabsTrigger>
        </TabsList>

        {/* ---------------- CLASS LEVEL INSIGHTS ---------------- */}
        <TabsContent value="class" className="space-y-6">
          {classInsightsLoading ? (
            <div className="flex justify-center p-20">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PERFORMANCE TREND */}
              {/* PERFORMANCE TREND */}
              <ExpandableChartWidget
                title="📈 Class Performance Trend"
                description="Average scores and attendance over the last 6 months"
                insights="The correlation between attendance and performance is visible. Consider interventions for students with attendance below 80% to improve overall class average."
                renderSmall={() =>
                  performanceTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name === "avgScore"
                              ? "Average Score"
                              : "Attendance Rate",
                          ]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          stroke="#8884d8"
                          strokeWidth={2}
                          name="Average Score (%)"
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          stroke="#82ca9d"
                          strokeWidth={2}
                          name="Attendance Rate (%)"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No performance data available yet.
                    </div>
                  )
                }
                renderExpanded={() =>
                  performanceTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={performanceTrendData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 14 }}
                          tickMargin={12}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 14 }}
                          tickFormatter={(value) => `${value}%`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "12px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ fontSize: "14px", fontWeight: 600 }}
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name === "avgScore"
                              ? "Average Score"
                              : "Attendance Rate",
                          ]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                          type="monotone"
                          dataKey="avgScore"
                          stroke="#8884d8"
                          strokeWidth={4}
                          name="Average Score (%)"
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          stroke="#82ca9d"
                          strokeWidth={4}
                          name="Attendance Rate (%)"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />

              <ExpandableChartWidget
                title="📚 Subject Averages"
                description="Overall class performance by subject"
                insights="Compare subject performance to identify class-wide strengths and weaknesses. A significant dip in one subject might indicate a need for curriculum review."
                renderSmall={() =>
                  subjectAverageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectAverageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <YAxis
                          dataKey="subject"
                          type="category"
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value}%`,
                            "Class Average",
                          ]}
                          labelFormatter={(label) => `Subject: ${label}`}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Bar
                          dataKey="avg"
                          name="Class Average (%)"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        >
                          {subjectAverageData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index % 2 === 0 ? "#8884d8" : "#82ca9d"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No subject data available yet.
                    </div>
                  )
                }
                renderExpanded={() =>
                  subjectAverageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectAverageData}
                        layout="vertical"
                        margin={{ left: 40, right: 40 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 14 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <YAxis
                          dataKey="subject"
                          type="category"
                          width={150}
                          tick={{ fontSize: 14 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.05)" }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "12px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ fontSize: "14px", fontWeight: 600 }}
                          formatter={(value: number) => [
                            `${value}%`,
                            "Class Average",
                          ]}
                          labelFormatter={(label) => `Subject: ${label}`}
                        />
                        <Bar
                          dataKey="avg"
                          name="Class Average (%)"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                          barSize={40}
                        >
                          {subjectAverageData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index % 2 === 0 ? "#8884d8" : "#82ca9d"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />

              <ExpandableChartWidget
                title="🔗 Attendance vs. Marks Correlation"
                description="Does attendance impact performance? Each dot represents a student."
                insights="Positive correlation suggests attendance drives performance. Outliers (low attendance, high marks) might be self-studies, while (high attendance, low marks) might need learning support."
                className="lg:col-span-2"
                renderSmall={() =>
                  attendanceVsMarksData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="attendance"
                          name="Attendance"
                          unit="%"
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          label={{
                            value: "Attendance Rate (%)",
                            position: "bottom",
                            offset: 0,
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="marks"
                          name="Marks"
                          unit="%"
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          label={{
                            value: "Test Scores (%)",
                            angle: -90,
                            position: "insideLeft",
                            fontSize: 12,
                          }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name === "Attendance"
                              ? "Attendance Rate"
                              : "Test Score",
                          ]}
                        />
                        <Scatter
                          name="Students"
                          data={attendanceVsMarksData}
                          fill="#8884d8"
                        />
                        <Line
                          type="monotone"
                          data={calculateTrendLine(attendanceVsMarksData)}
                          dataKey="trendMarks"
                          stroke="#ff7373"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Trend Line"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No attendance/marks correlation data available.
                    </div>
                  )
                }
                renderExpanded={() =>
                  attendanceVsMarksData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="attendance"
                          name="Attendance"
                          unit="%"
                          domain={[0, 100]}
                          tick={{ fontSize: 14 }}
                          label={{
                            value: "Attendance Rate (%)",
                            position: "bottom",
                            offset: 0,
                            fontSize: 14,
                            dy: 10,
                          }}
                        />
                        <YAxis
                          type="number"
                          dataKey="marks"
                          name="Marks"
                          unit="%"
                          domain={[0, 100]}
                          tick={{ fontSize: 14 }}
                          label={{
                            value: "Test Scores (%)",
                            angle: -90,
                            position: "insideLeft",
                            fontSize: 14,
                            dx: -10,
                          }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "12px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ fontSize: "14px", fontWeight: 600 }}
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name === "Attendance"
                              ? "Attendance Rate"
                              : "Test Score",
                          ]}
                        />
                        <Scatter
                          name="Students"
                          data={attendanceVsMarksData}
                          fill="#8884d8"
                          r={6}
                          shape="circle"
                        />
                        <Line
                          type="monotone"
                          data={calculateTrendLine(attendanceVsMarksData)}
                          dataKey="trendMarks"
                          stroke="#ff7373"
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Trend Line"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />
            </div>
          )}
        </TabsContent>

        {/* ---------------- STUDENT LEVEL ANALYSIS ---------------- */}
        <TabsContent value="student" className="space-y-8">
          {studentAnalysisLoading ? (
            <div className="flex justify-center p-20">
              <LoadingSpinner />
            </div>
          ) : studentsList.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No students found in this class.
            </div>
          ) : (
            <>
              {/* CLASS SUMMARY HEADER */}
              {/* STUDENT SELECTOR HEADER */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-secondary/10 p-6 rounded-xl border border-white/5 mb-8">
                <div className="flex items-center gap-6">
                  <div className="bg-primary/20 p-3 rounded-full">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Select Student to Analyze
                    </p>
                    <Select
                      value={selectedStudent}
                      onValueChange={setSelectedStudent}
                    >
                      <SelectTrigger className="w-[300px] h-10 bg-background/50 border-input hover:bg-background/80 transition-colors">
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsList.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Refresh Button */}
                  {selectedStudent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshStudentData}
                      disabled={currentStudentLoading}
                      className="ml-2"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${currentStudentLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                </div>

                {selectedStudent && studentAnalyticsData[selectedStudent] && (
                  <div className="flex gap-8 border-l border-white/10 pl-8">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Overall Average
                      </p>
                      <p className="text-3xl font-bold text-primary">
                        {
                          studentsList.find((s) => s.id === selectedStudent)
                            ?.avgScore
                        }
                        %
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Attendance
                      </p>
                      <p
                        className={`text-3xl font-bold ${
                          (studentAnalyticsData[selectedStudent]?.attendance
                            ?.percentage ?? 0) >= 75
                            ? "text-green-500"
                            : "text-yellow-500"
                        }`}
                      >
                        {studentAnalyticsData[selectedStudent]?.attendance
                          ?.percentage ?? 0}
                        %
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {
                          studentAnalyticsData[selectedStudent]?.attendance
                            ?.presentDays
                        }
                        /
                        {
                          studentAnalyticsData[selectedStudent]?.attendance
                            ?.totalDays
                        }{" "}
                        Days
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!selectedStudent ? (
                <div className="flex flex-col items-center justify-center p-20 text-muted-foreground border-2 border-dashed rounded-xl border-white/10 mt-8">
                  <Users className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">
                    Select a student above to view detailed performance
                    analytics.
                  </p>
                </div>
              ) : !studentAnalyticsData[selectedStudent] ? (
                <div className="flex justify-center p-20">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* ROW 1: Subject Performance & Progress Trend */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ExpandableChartWidget
                      title="Individual Subject Performance"
                      description="Strengths and weaknesses across subjects"
                      insights="A balanced shape indicates consistent performance. Spikes outward indicate strengths, while dips inward show areas for improvement."
                      renderSmall={() => (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={studentAnalyticsData[selectedStudent].radar}
                          >
                            <PolarGrid gridType="polygon" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                              angle={30}
                              domain={[0, 100]}
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <Radar
                              dataKey="A"
                              stroke="#8884d8"
                              fill="#8884d8"
                              fillOpacity={0.5}
                              name="Student Score"
                            />
                            <Tooltip
                              formatter={(value: number) => [
                                `${value}%`,
                                "Score",
                              ]}
                              contentStyle={{
                                backgroundColor: "#fff",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      )}
                      renderExpanded={() => (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            data={studentAnalyticsData[selectedStudent].radar}
                          >
                            <PolarGrid gridType="polygon" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fontSize: 16, fontWeight: "bold" }}
                            />
                            <PolarRadiusAxis
                              angle={30}
                              domain={[0, 100]}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <Radar
                              dataKey="A"
                              stroke="#8884d8"
                              strokeWidth={3}
                              fill="#8884d8"
                              fillOpacity={0.4}
                              name="Student Score"
                              activeDot={{ r: 6 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                borderRadius: "8px",
                                padding: "12px",
                              }}
                              itemStyle={{ fontSize: "14px", fontWeight: 600 }}
                              formatter={(value: number) => [
                                `${value}%`,
                                "Score",
                              ]}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      )}
                    />

                    <ExpandableChartWidget
                      title="Performance Trend"
                      description="Score progression over the last 6 months"
                      insights="Upward trends indicate improvement. Plateaus or drops should be investigated to ensure continuous growth."
                      renderSmall={() =>
                        studentAnalyticsData[selectedStudent].progress &&
                        studentAnalyticsData[selectedStudent].progress.length >
                          0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={
                                studentAnalyticsData[selectedStudent].progress
                              }
                            >
                              <defs>
                                <linearGradient
                                  id="colorScoreStudent"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="#82ca9d"
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="#82ca9d"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="month" hide />
                              <YAxis domain={[0, 100]} hide />
                              <Tooltip
                                formatter={(value: number) => [
                                  `${value}%`,
                                  "Score",
                                ]}
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  borderRadius: "8px",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#82ca9d"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorScoreStudent)"
                                activeDot={{ r: 4 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No trend data available.
                          </div>
                        )
                      }
                      renderExpanded={() =>
                        studentAnalyticsData[selectedStudent].progress &&
                        studentAnalyticsData[selectedStudent].progress.length >
                          0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={
                                studentAnalyticsData[selectedStudent].progress
                              }
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 20,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="colorScoreStudentExp"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="5%"
                                    stopColor="#82ca9d"
                                    stopOpacity={0.6}
                                  />
                                  <stop
                                    offset="95%"
                                    stopColor="#82ca9d"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                              <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 14 }}
                                tickFormatter={(v) => `${v}%`}
                              />
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#fff",
                                  borderRadius: "8px",
                                  padding: "12px",
                                }}
                                itemStyle={{
                                  fontSize: "14px",
                                  fontWeight: 600,
                                }}
                                formatter={(value: number) => [
                                  `${value}%`,
                                  "Score",
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#82ca9d"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorScoreStudentExp)"
                                activeDot={{ r: 6 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No data available.
                          </div>
                        )
                      }
                    />
                  </div>

                  {/* ROW 2: Strengths & Weaknesses */}
                  <div className="space-y-4">
                    {/* Subject Filter Header */}
                    {(() => {
                      const uniqueSubjects = Array.from(
                        new Set([
                          ...studentAnalyticsData[
                            selectedStudent
                          ].strengths.map((s) => s.subject),
                          ...studentAnalyticsData[
                            selectedStudent
                          ].weaknesses.map((w) => w.subject),
                        ])
                      ).filter(Boolean);

                      const filteredStrengths =
                        selectedSubjectFilter === "all"
                          ? studentAnalyticsData[selectedStudent].strengths
                          : studentAnalyticsData[
                              selectedStudent
                            ].strengths.filter(
                              (s) => s.subject === selectedSubjectFilter
                            );

                      const filteredWeaknesses =
                        selectedSubjectFilter === "all"
                          ? studentAnalyticsData[selectedStudent].weaknesses
                          : studentAnalyticsData[
                              selectedStudent
                            ].weaknesses.filter(
                              (w) => w.subject === selectedSubjectFilter
                            );

                      // Get available topics based on selected chapter for this student
                      const availableTopics = (() => {
                        if (!studentAnalyticsData[selectedStudent]?.chapterTopic) return [];
                        
                        if (studentAnalysisChapterFilter === "all") {
                          return studentAnalyticsData[selectedStudent].chapterTopic.topics;
                        }
                        
                        // Filter topics belonging to selected chapter
                        return studentAnalyticsData[selectedStudent].chapterTopic.topics.filter((t) =>
                          t.chapters.includes(studentAnalysisChapterFilter)
                        );
                      })();

                      // Apply all filters to strengths
                      const fullyFilteredStrengths = (() => {
                        let items = filteredStrengths;
                        
                        // Topic filter
                        if (studentAnalysisTopicFilter !== "all") {
                          items = items.filter((s) => s.topic === studentAnalysisTopicFilter);
                        }
                        
                        // Chapter filter (check if topic belongs to chapter)
                        if (studentAnalysisChapterFilter !== "all" && studentAnalyticsData[selectedStudent].chapterTopic) {
                          const topicsInChapter = studentAnalyticsData[selectedStudent].chapterTopic.topics
                            .filter((t) => t.chapters.includes(studentAnalysisChapterFilter))
                            .map((t) => t.name);
                          items = items.filter((s) => s.topic && topicsInChapter.includes(s.topic));
                        }
                        
                        // Score threshold (for strengths, show items >= threshold)
                        if (studentAnalysisScoreThreshold !== 60) {
                          items = items.filter((s) => s.mastery !== undefined && s.mastery >= studentAnalysisScoreThreshold);
                        }
                        
                        return items;
                      })();

                      // Apply all filters to weaknesses
                      const fullyFilteredWeaknesses = (() => {
                        let items = filteredWeaknesses;
                        
                        // Topic filter
                        if (studentAnalysisTopicFilter !== "all") {
                          items = items.filter((w) => w.topic === studentAnalysisTopicFilter);
                        }
                        
                        // Chapter filter
                        if (studentAnalysisChapterFilter !== "all" && studentAnalyticsData[selectedStudent].chapterTopic) {
                          const topicsInChapter = studentAnalyticsData[selectedStudent].chapterTopic.topics
                            .filter((t) => t.chapters.includes(studentAnalysisChapterFilter))
                            .map((t) => t.name);
                          items = items.filter((w) => w.topic && topicsInChapter.includes(w.topic));
                        }
                        
                        // Score threshold (for weaknesses, show items < threshold)
                        if (studentAnalysisScoreThreshold !== 60) {
                          items = items.filter((w) => w.mastery !== undefined && w.mastery < studentAnalysisScoreThreshold);
                        }
                        
                        return items;
                      })();

                      return (
                        <>
                          {(uniqueSubjects.length > 0 || (studentAnalyticsData[selectedStudent].chapterTopic?.chapters.length ?? 0) > 0) && (
                            <Card className="border-primary/20">
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <Filter className="w-5 h-5 text-primary" />
                                  <h3 className="font-semibold text-lg">
                                    Filter Strengths & Weaknesses
                                  </h3>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                                  {/* Chapter Filter */}
                                  {studentAnalyticsData[selectedStudent].chapterTopic?.chapters && (
                                    <Select value={studentAnalysisChapterFilter} onValueChange={setStudentAnalysisChapterFilter}>
                                      <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Chapter" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Chapters</SelectItem>
                                        {studentAnalyticsData[selectedStudent].chapterTopic.chapters.map((ch) => (
                                          <SelectItem key={ch.name} value={ch.name}>{ch.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  
                                  {/* Topic Filter (dynamic based on chapter) */}
                                  {availableTopics.length > 0 && (
                                    <Select value={studentAnalysisTopicFilter} onValueChange={setStudentAnalysisTopicFilter}>
                                      <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Topic" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Topics</SelectItem>
                                        {availableTopics.map((t) => (
                                          <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  
                                  {/* Subject Filter */}
                                  {uniqueSubjects.length > 0 && (
                                    <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
                                      <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Subject" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Subjects</SelectItem>
                                        {uniqueSubjects.map((subject) => (
                                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  
                                  {/* Score Threshold */}
                                  <Select value={studentAnalysisScoreThreshold.toString()} onValueChange={(v) => setStudentAnalysisScoreThreshold(Number(v))}>
                                    <SelectTrigger className="w-full sm:w-[160px]">
                                      <SelectValue placeholder="Threshold" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="40">Below 40%</SelectItem>
                                      <SelectItem value="50">Below 50%</SelectItem>
                                      <SelectItem value="60">Below 60%</SelectItem>
                                      <SelectItem value="70">Below 70%</SelectItem>
                                      <SelectItem value="80">Below 80%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  {/* Clear Filters Button */}
                                  {(studentAnalysisChapterFilter !== "all" || studentAnalysisTopicFilter !== "all" || selectedSubjectFilter !== "all" || studentAnalysisScoreThreshold !== 60) && (
                                    <Button variant="outline" size="sm" onClick={() => {
                                      setStudentAnalysisChapterFilter("all");
                                      setStudentAnalysisTopicFilter("all");
                                      setSelectedSubjectFilter("all");
                                      setStudentAnalysisScoreThreshold(60);
                                    }}>
                                      <X className="w-4 h-4 mr-1 sm:mr-2" />
                                      <span className="hidden sm:inline">Clear Filters</span>
                                      <span className="sm:hidden">Clear</span>
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-l-4 border-l-green-500">
                              <CardHeader>
                                <CardTitle className="text-green-600 flex items-center gap-2">
                                  <TrendingUp className="w-5 h-5" /> Top
                                  Strengths
                                </CardTitle>
                                {(selectedSubjectFilter !== "all" || studentAnalysisChapterFilter !== "all" || studentAnalysisTopicFilter !== "all" || studentAnalysisScoreThreshold !== 60) && (
                                  <CardDescription>
                                    Filtered by:
                                    {selectedSubjectFilter !== "all" && ` Subject: ${selectedSubjectFilter}`}
                                    {studentAnalysisChapterFilter !== "all" && ` • Chapter: ${studentAnalysisChapterFilter}`}
                                    {studentAnalysisTopicFilter !== "all" && ` • Topic: ${studentAnalysisTopicFilter}`}
                                    {studentAnalysisScoreThreshold !== 60 && ` • Threshold: ≥${studentAnalysisScoreThreshold}%`}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                  {fullyFilteredStrengths.map((item, index) => (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg"
                                    >
                                      <div>
                                        <p className="font-semibold text-sm">
                                          {item.topic || item.subject}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {item.desc}
                                        </p>
                                      </div>
                                      {item.mastery !== undefined && (
                                        <span className="text-green-600 font-bold bg-green-100 px-2 py-1 rounded text-xs">
                                          {item.mastery}%
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {fullyFilteredStrengths.length === 0 && (
                                    <p className="text-muted-foreground text-sm text-center py-4">
                                      {(selectedSubjectFilter !== "all" || studentAnalysisChapterFilter !== "all" || studentAnalysisTopicFilter !== "all" || studentAnalysisScoreThreshold !== 60)
                                        ? "No strengths match the selected filters."
                                        : "No specific strengths identified yet."}
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-l-4 border-l-red-500">
                              <CardHeader>
                                <CardTitle className="text-red-600 flex items-center gap-2">
                                  <AlertCircle className="w-5 h-5" /> Areas for
                                  Improvement
                                </CardTitle>
                                {(selectedSubjectFilter !== "all" || studentAnalysisChapterFilter !== "all" || studentAnalysisTopicFilter !== "all" || studentAnalysisScoreThreshold !== 60) && (
                                  <CardDescription>
                                    Filtered by:
                                    {selectedSubjectFilter !== "all" && ` Subject: ${selectedSubjectFilter}`}
                                    {studentAnalysisChapterFilter !== "all" && ` • Chapter: ${studentAnalysisChapterFilter}`}
                                    {studentAnalysisTopicFilter !== "all" && ` • Topic: ${studentAnalysisTopicFilter}`}
                                    {studentAnalysisScoreThreshold !== 60 && ` • Threshold: <${studentAnalysisScoreThreshold}%`}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                  {fullyFilteredWeaknesses.map((item, index) => (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center p-3 bg-red-50/50 rounded-lg"
                                    >
                                      <div>
                                        <p className="font-semibold text-sm">
                                          {item.topic || item.subject}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {item.desc}
                                        </p>
                                      </div>
                                      {item.mastery !== undefined && (
                                        <span className="text-red-600 font-bold bg-red-100 px-2 py-1 rounded text-xs">
                                          {item.mastery}%
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {fullyFilteredWeaknesses.length === 0 && (
                                    <p className="text-muted-foreground text-sm text-center py-4">
                                      {(selectedSubjectFilter !== "all" || studentAnalysisChapterFilter !== "all" || studentAnalysisTopicFilter !== "all" || studentAnalysisScoreThreshold !== 60)
                                        ? "No weaknesses match the selected filters."
                                        : "No specific weaknesses identified."}
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* ROW 3: Chapter & Topic Performance */}
                  {studentAnalyticsData[selectedStudent].chapterTopic && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ExpandableChartWidget
                        title="Chapter Mastery"
                        description="Understanding by chapter"
                        insights="Detailed chapter breakdown helps in assigning specific revision material."
                        renderSmall={() => (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={
                                studentAnalyticsData[selectedStudent]
                                  .chapterTopic?.chapters
                              }
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 100]} hide />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fontSize: 10 }}
                                interval={0}
                              />
                              <Tooltip
                                cursor={{ fill: "transparent" }}
                                contentStyle={{ borderRadius: "8px" }}
                              />
                              <Bar
                                dataKey="avgScore"
                                fill="#8884d8"
                                radius={[0, 4, 4, 0]}
                              >
                                {studentAnalyticsData[
                                  selectedStudent
                                ].chapterTopic?.chapters.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      entry.avgScore >= 80
                                        ? "#00C49F"
                                        : entry.avgScore >= 60
                                        ? "#8884d8"
                                        : "#ff7373"
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                        renderExpanded={() => (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={
                                studentAnalyticsData[selectedStudent]
                                  .chapterTopic?.chapters
                              }
                              layout="vertical"
                              margin={{ left: 20 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                              />
                              <XAxis type="number" domain={[0, 100]} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={150}
                                tick={{ fontSize: 14 }}
                              />
                              <Tooltip
                                cursor={{ fill: "#f4f4f5" }}
                                contentStyle={{
                                  borderRadius: "8px",
                                  padding: "12px",
                                }}
                              />
                              <Bar
                                dataKey="avgScore"
                                fill="#8884d8"
                                radius={[0, 4, 4, 0]}
                                barSize={32}
                              >
                                {studentAnalyticsData[
                                  selectedStudent
                                ].chapterTopic?.chapters.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      entry.avgScore >= 80
                                        ? "#00C49F"
                                        : entry.avgScore >= 60
                                        ? "#8884d8"
                                        : "#ff7373"
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      />

                      <ExpandableChartWidget
                        title="Topic Mastery"
                        description="Understanding by specific topic"
                        insights="Granular topic analysis. Focus on topics with red bars."
                        renderSmall={() => (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={
                                studentAnalyticsData[selectedStudent]
                                  .chapterTopic?.topics
                              }
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 100]} hide />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fontSize: 10 }}
                                interval={0}
                              />
                              <Tooltip
                                cursor={{ fill: "transparent" }}
                                contentStyle={{ borderRadius: "8px" }}
                              />
                              <Bar
                                dataKey="avgScore"
                                fill="#82ca9d"
                                radius={[0, 4, 4, 0]}
                              >
                                {studentAnalyticsData[
                                  selectedStudent
                                ].chapterTopic?.topics.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      entry.avgScore >= 80
                                        ? "#00C49F"
                                        : entry.avgScore >= 60
                                        ? "#82ca9d"
                                        : "#ff7373"
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                        renderExpanded={() => (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={
                                studentAnalyticsData[selectedStudent]
                                  .chapterTopic?.topics
                              }
                              layout="vertical"
                              margin={{ left: 20 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                              />
                              <XAxis type="number" domain={[0, 100]} />
                              <YAxis
                                dataKey="name"
                                type="category"
                                width={150}
                                tick={{ fontSize: 14 }}
                              />
                              <Tooltip
                                cursor={{ fill: "#f4f4f5" }}
                                contentStyle={{
                                  borderRadius: "8px",
                                  padding: "12px",
                                }}
                              />
                              <Bar
                                dataKey="avgScore"
                                fill="#82ca9d"
                                radius={[0, 4, 4, 0]}
                                barSize={32}
                              >
                                {studentAnalyticsData[
                                  selectedStudent
                                ].chapterTopic?.topics.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      entry.avgScore >= 80
                                        ? "#00C49F"
                                        : entry.avgScore >= 60
                                        ? "#82ca9d"
                                        : "#ff7373"
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ---------------- TEST METRICS ---------------- */}
        <TabsContent value="test" className="space-y-6">
          {testMetricsLoading ? (
            <div className="flex justify-center p-20">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpandableChartWidget
                title="📝 Recent Test Performance"
                description="Comparing class average vs. top performer in each test"
                insights="Tracking the gap between class average and top scores can indicate if the teaching pace is appropriate. A widening gap might suggest some students are lagging behind."
                renderSmall={() =>
                  recentTestsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={recentTestsData}>
                        <defs>
                          <linearGradient
                            id="colorAvg"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8884d8"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8884d8"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorTop"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#82ca9d"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#82ca9d"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="test"
                          tick={{ fontSize: 11 }}
                          angle={-15}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name.includes("Class Average")
                              ? "Class Average"
                              : "Top Performer",
                          ]}
                          labelFormatter={(label) => `Test: ${label}`}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="avg"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorAvg)"
                          name="Class Average (%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="top"
                          stroke="#82ca9d"
                          fillOpacity={1}
                          fill="url(#colorTop)"
                          name="Top Performer (%)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No recent test data available yet.
                    </div>
                  )
                }
                renderExpanded={() =>
                  recentTestsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={recentTestsData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorAvgExp"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8884d8"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8884d8"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorTopExp"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#82ca9d"
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor="#82ca9d"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="test"
                          tick={{ fontSize: 14 }}
                          angle={0}
                          height={50}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 14 }}
                          tickFormatter={(value) => `${value}%`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          vertical={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "12px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ fontSize: "14px", fontWeight: 600 }}
                          formatter={(value: number, name: string) => [
                            `${value}%`,
                            name.includes("Class Average")
                              ? "Class Average"
                              : "Top Performer",
                          ]}
                          labelFormatter={(label) => `Test: ${label}`}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Area
                          type="monotone"
                          dataKey="avg"
                          stroke="#8884d8"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorAvgExp)"
                          name="Class Average (%)"
                          activeDot={{ r: 6 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="top"
                          stroke="#82ca9d"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorTopExp)"
                          name="Top Performer (%)"
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />

              <ExpandableChartWidget
                title="🧠 Question Type Analysis"
                description="Breakdown of question types used across all tests"
                insights="A diverse mix of question types ensures comprehensive assessment. Ensure there's a good balance between objective (Recall) and subjective (Analyze/Create) questions."
                renderSmall={() =>
                  questionTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={questionTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          fill="#8884d8"
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {questionTypeData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  "#0088FE",
                                  "#00C49F",
                                  "#FFBB28",
                                  "#FF8042",
                                  "#8884d8",
                                ][index % 5]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value} questions`]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          formatter={(value, entry: any) => (
                            <span style={{ fontSize: "12px" }}>
                              {value} ({entry.payload?.value || 0})
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No question type data available yet.
                    </div>
                  )
                }
                renderExpanded={() =>
                  questionTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={questionTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={160}
                          fill="#8884d8"
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {questionTypeData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                [
                                  "#0088FE",
                                  "#00C49F",
                                  "#FFBB28",
                                  "#FF8042",
                                  "#8884d8",
                                ][index % 5]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`${value} questions`]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            borderRadius: "8px",
                            padding: "12px",
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                          itemStyle={{ fontSize: "14px", fontWeight: 600 }}
                        />
                        <Legend
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          formatter={(value, entry: any) => (
                            <span
                              style={{ fontSize: "14px", margin: "0 10px" }}
                            >
                              {value} ({entry.payload?.value || 0})
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />
            </div>
          )}
        </TabsContent>

        {/* ---------------- CHAPTER & TOPIC ANALYTICS ---------------- */}
        <TabsContent value="topics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex justify-center p-20">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpandableChartWidget
                title="Chapter Performance"
                description="Average scores by chapter (sorted by performance)"
                insights="Identifying low-performing chapters allows for targeted revision sessions. High-performing chapters can be used as benchmarks for effective teaching strategies."
                renderSmall={() =>
                  analyticsData.chapters.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.chapters} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded p-2">
                                  <p className="font-semibold">{data.name}</p>
                                  <p className="text-sm">
                                    Average: {data.avgScore}%
                                  </p>
                                  <p className="text-sm">
                                    Questions: {data.totalQuestions}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="avgScore"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                        >
                          {analyticsData.chapters.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.avgScore >= 80
                                  ? "#00C49F"
                                  : entry.avgScore >= 60
                                  ? "#8884d8"
                                  : "#ff7373"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No chapter data available. Make sure tests have chapter
                      information.
                    </div>
                  )
                }
                renderExpanded={() =>
                  analyticsData.chapters.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.chapters}
                        layout="vertical"
                        margin={{ left: 40, right: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          stroke="#888"
                          tick={{ fontSize: 14 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={180}
                          tick={{ fontSize: 14 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.05)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg border-border/50">
                                  <p className="font-bold text-lg mb-1">
                                    {data.name}
                                  </p>
                                  <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-muted-foreground">
                                      Average Score:
                                    </span>
                                    <span className="font-semibold">
                                      {data.avgScore}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-muted-foreground">
                                      Total Questions:
                                    </span>
                                    <span className="font-semibold">
                                      {data.totalQuestions}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="avgScore"
                          fill="#8884d8"
                          radius={[0, 4, 4, 0]}
                          barSize={40}
                        >
                          {analyticsData.chapters.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.avgScore >= 80
                                  ? "#00C49F"
                                  : entry.avgScore >= 60
                                  ? "#8884d8"
                                  : "#ff7373"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />

              <ExpandableChartWidget
                title="Topic Performance"
                description="Average scores by topic (sorted by performance)"
                insights="Topic-level analysis helps pinpoint specific concepts that students struggle with. Use this data to adjust lesson plans for the next academic year or upcoming tests."
                renderSmall={() =>
                  analyticsData.topics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.topics} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded p-2">
                                  <p className="font-semibold">{data.name}</p>
                                  <p className="text-sm">
                                    Average: {data.avgScore}%
                                  </p>
                                  <p className="text-sm">
                                    Questions: {data.totalQuestions}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Chapters: {data.chapters.join(", ")}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="avgScore"
                          fill="#82ca9d"
                          radius={[0, 4, 4, 0]}
                        >
                          {analyticsData.topics.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.avgScore >= 80
                                  ? "#00C49F"
                                  : entry.avgScore >= 60
                                  ? "#82ca9d"
                                  : "#ff7373"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No topic data available. Make sure tests have topic
                      information.
                    </div>
                  )
                }
                renderExpanded={() =>
                  analyticsData.topics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.topics}
                        layout="vertical"
                        margin={{ left: 40, right: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          stroke="#888"
                          tick={{ fontSize: 14 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={180}
                          tick={{ fontSize: 14 }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,0.05)" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg p-3 shadow-lg border-border/50">
                                  <p className="font-bold text-lg mb-1">
                                    {data.name}
                                  </p>
                                  <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-muted-foreground">
                                      Average Score:
                                    </span>
                                    <span className="font-semibold">
                                      {data.avgScore}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-sm">
                                    <span className="text-muted-foreground">
                                      Total Questions:
                                    </span>
                                    <span className="font-semibold">
                                      {data.totalQuestions}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <span className="font-semibold">
                                      Associated Chapters:
                                    </span>{" "}
                                    {data.chapters.join(", ")}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="avgScore"
                          fill="#82ca9d"
                          radius={[0, 4, 4, 0]}
                          barSize={40}
                        >
                          {analyticsData.topics.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.avgScore >= 80
                                  ? "#00C49F"
                                  : entry.avgScore >= 60
                                  ? "#82ca9d"
                                  : "#ff7373"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No data available.
                    </div>
                  )
                }
              />
            </div>
          )}

          {/* WEAK AREAS IDENTIFICATION */}
          {!analyticsLoading &&
            (analyticsData.chapters.length > 0 ||
              analyticsData.topics.length > 0) && (
              <>
                {/* Filter Controls for Weak Areas */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">Filters:</span>
                  </div>
                  
                  <Select value={weakAreasChapterFilter} onValueChange={setWeakAreasChapterFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Chapters</SelectItem>
                      {analyticsData.chapters.map((ch) => (
                        <SelectItem key={ch.name} value={ch.name}>{ch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={weakAreasTopicFilter} onValueChange={setWeakAreasTopicFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Topics</SelectItem>
                      {availableTopics.map((t) => (
                        <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={weakAreasScoreThreshold.toString()} onValueChange={(v) => setWeakAreasScoreThreshold(Number(v))}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Threshold" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40">Below 40%</SelectItem>
                      <SelectItem value="50">Below 50%</SelectItem>
                      <SelectItem value="60">Below 60%</SelectItem>
                      <SelectItem value="70">Below 70%</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {(weakAreasChapterFilter !== "all" || weakAreasTopicFilter !== "all" || weakAreasScoreThreshold !== 60) && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setWeakAreasChapterFilter("all");
                      setWeakAreasTopicFilter("all");
                      setWeakAreasScoreThreshold(60);
                    }}>
                      <X className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Clear Filters</span>
                      <span className="sm:hidden">Clear</span>
                    </Button>
                  )}
                </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* WEAK CHAPTERS */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      Weak Chapters (Need Attention)
                    </CardTitle>
                    <CardDescription>
                      Chapters with average score below {weakAreasScoreThreshold}%
                      {weakAreasChapterFilter !== "all" && ` • Filtered by: ${weakAreasChapterFilter}`}
                      {filteredWeakChapters.length > 0 && ` • Showing ${filteredWeakChapters.length} of ${analyticsData.chapters.filter(c => c.avgScore < weakAreasScoreThreshold).length}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredWeakChapters.length > 0 ? (
                      <div className="space-y-3">
                        {filteredWeakChapters.map((chapter, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{chapter.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {chapter.totalQuestions} questions
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-600">
                                  {chapter.avgScore}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Average
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {weakAreasChapterFilter !== "all" 
                          ? `No chapters matching filter "${weakAreasChapterFilter}" need attention.`
                          : `Great! No chapters need immediate attention.`}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* WEAK TOPICS */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Weak Topics (Need Focus)
                    </CardTitle>
                    <CardDescription>
                      Topics with average score below {weakAreasScoreThreshold}%
                      {(weakAreasTopicFilter !== "all" || weakAreasChapterFilter !== "all") && (
                        <span>
                          {" • Filtered by: "}
                          {weakAreasTopicFilter !== "all" && `Topic: ${weakAreasTopicFilter}`}
                          {weakAreasTopicFilter !== "all" && weakAreasChapterFilter !== "all" && ", "}
                          {weakAreasChapterFilter !== "all" && `Chapter: ${weakAreasChapterFilter}`}
                        </span>
                      )}
                      {filteredWeakTopics.length > 0 && ` • Showing ${filteredWeakTopics.length} of ${analyticsData.topics.filter(t => t.avgScore < weakAreasScoreThreshold).length}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredWeakTopics.length > 0 ? (
                      <div className="space-y-3">
                        {filteredWeakTopics.map((topic, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-orange-50 dark: bg-orange-950/20 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{topic.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {topic.chapters.join(", ")} •{" "}
                                  {topic.totalQuestions} questions
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-600">
                                  {topic.avgScore}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Average
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {(weakAreasTopicFilter !== "all" || weakAreasChapterFilter !== "all")
                          ? `No topics matching the selected filters need focus.`
                          : `Excellent! All topics are performing well.`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              </>
            )}
        </TabsContent>
      </Tabs>

      {/* ---------------- FULL REPORT FOR PDF EXPORT (HIDDEN) ---------------- */}
      <div id="analytics-full-report" className="hidden p-10 space-y-12 bg-white text-black font-sans" style={{ width: '1200px' }}>
        {/* Professional Header with School Logo and Name */}
        <div className="flex items-center justify-between border-b-4 pb-6 mb-8" style={{ borderColor: PROFESSIONAL_COLORS.primary }}>
          <div className="flex items-center gap-6">
            {schoolInfo?.logo_url && (
              <img 
                src={schoolInfo.logo_url} 
                alt="School Logo" 
                className="w-20 h-20 object-contain"
              />
            )}
            <div>
              <h1 className="text-5xl font-bold" style={{ color: PROFESSIONAL_COLORS.primary }}>
                {schoolInfo?.name || 'School Name'}
              </h1>
              <p className="text-xl font-semibold text-gray-600 mt-2">Academic Analytics Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{selectedClass?.class_name || 'All Classes'}</p>
            <p className="text-base text-gray-600">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="text-center p-6 rounded-xl" style={{ backgroundColor: `${PROFESSIONAL_COLORS.primary}15` }}>
            <p className="text-base font-semibold uppercase tracking-wider text-gray-600 mb-2">Class Average</p>
            <p className="text-4xl font-bold" style={{ color: PROFESSIONAL_COLORS.primary }}>
              {subjectAverageData.length > 0 ? (subjectAverageData.reduce((acc, s) => acc + s.avg, 0) / subjectAverageData.length).toFixed(1) : 'N/A'}%
            </p>
          </div>
          <div className="text-center p-6 rounded-xl" style={{ backgroundColor: `${PROFESSIONAL_COLORS.secondary}15` }}>
            <p className="text-base font-semibold uppercase tracking-wider text-gray-600 mb-2">Attendance</p>
            <p className="text-4xl font-bold" style={{ color: PROFESSIONAL_COLORS.secondary }}>
              {performanceTrendData.length > 0 ? performanceTrendData[performanceTrendData.length - 1].attendance : 'N/A'}%
            </p>
          </div>
          <div className="text-center p-6 rounded-xl" style={{ backgroundColor: `${PROFESSIONAL_COLORS.purple}15` }}>
            <p className="text-base font-semibold uppercase tracking-wider text-gray-600 mb-2">Total Students</p>
            <p className="text-4xl font-bold" style={{ color: PROFESSIONAL_COLORS.purple }}>
              {studentsList.length}
            </p>
          </div>
          <div className="text-center p-6 rounded-xl" style={{ backgroundColor: `${PROFESSIONAL_COLORS.teal}15` }}>
            <p className="text-base font-semibold uppercase tracking-wider text-gray-600 mb-2">Subjects</p>
            <p className="text-4xl font-bold" style={{ color: PROFESSIONAL_COLORS.teal }}>
              {subjectAverageData.length}
            </p>
          </div>
        </div>

        {/* Section 1: Class Performance */}
        <section className="space-y-8">
          <h2 className="text-4xl font-bold border-l-8 pl-6 py-2" style={{ borderColor: PROFESSIONAL_COLORS.primary, backgroundColor: `${PROFESSIONAL_COLORS.primary}10` }}>
            I. Class Performance Overview
          </h2>
          <div className="grid grid-cols-1 gap-10">
            <div className="h-[450px]">
              <h3 className="text-2xl font-semibold mb-6 text-center" style={{ color: PROFESSIONAL_COLORS.primary }}>
                Performance Trend (6 Months)
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 14, fill: '#374151' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 14, fill: '#374151' }} />
                  <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="avgScore" 
                    stroke={PROFESSIONAL_COLORS.primary} 
                    strokeWidth={4} 
                    name="Average Score %" 
                    dot={{ r: 6, fill: PROFESSIONAL_COLORS.primary }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke={PROFESSIONAL_COLORS.secondary} 
                    strokeWidth={4} 
                    name="Attendance %" 
                    dot={{ r: 6, fill: PROFESSIONAL_COLORS.secondary }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[450px]">
              <h3 className="text-2xl font-semibold mb-6 text-center" style={{ color: PROFESSIONAL_COLORS.primary }}>
                Subject-wise Average Scores
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAverageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="subject" tick={{ fontSize: 14, fill: '#374151' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 14, fill: '#374151' }} />
                  <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                  <Bar dataKey="average" fill={PROFESSIONAL_COLORS.primary} radius={[8, 8, 0, 0]}>
                    {subjectAverageData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? PROFESSIONAL_COLORS.primary : PROFESSIONAL_COLORS.teal} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Section 2: Chapter & Topic Insights */}
        <section className="space-y-8 pt-12 border-t-2 border-gray-200">
          <h2 className="text-4xl font-bold border-l-8 pl-6 py-2" style={{ borderColor: PROFESSIONAL_COLORS.accent, backgroundColor: `${PROFESSIONAL_COLORS.accent}10` }}>
            II. Curriculum Mastery Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold pb-3 border-b-2" style={{ color: PROFESSIONAL_COLORS.secondary, borderColor: PROFESSIONAL_COLORS.secondary }}>
                Top Performing Chapters
              </h3>
              <div className="space-y-3">
                {analyticsData.chapters.slice(0, 5).map((chapter, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: `${PROFESSIONAL_COLORS.secondary}15` }}>
                    <span className="font-semibold text-base">{chapter.name}</span>
                    <span className="font-bold text-xl" style={{ color: PROFESSIONAL_COLORS.secondary }}>{chapter.avgScore}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold pb-3 border-b-2" style={{ color: PROFESSIONAL_COLORS.danger, borderColor: PROFESSIONAL_COLORS.danger }}>
                Areas for Improvement (Weak Topics)
              </h3>
              <div className="space-y-3">
                {analyticsData.topics.filter(t => t.avgScore < 60).slice(0, 5).map((topic, i) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: `${PROFESSIONAL_COLORS.danger}15` }}>
                    <div>
                      <p className="font-semibold text-base">{topic.name}</p>
                      <p className="text-sm text-gray-600">{topic.chapters[0]}</p>
                    </div>
                    <span className="font-bold text-xl" style={{ color: PROFESSIONAL_COLORS.danger }}>{topic.avgScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Complete Chapter Performance */}
          <div className="mt-10">
            <h3 className="text-2xl font-semibold mb-6" style={{ color: PROFESSIONAL_COLORS.primary }}>
              Complete Chapter Performance Analysis
            </h3>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.chapters} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 14, fill: '#374151' }} />
                  <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 13, fill: '#374151' }} />
                  <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                  <Bar dataKey="avgScore" radius={[0, 8, 8, 0]} barSize={30}>
                    {analyticsData.chapters.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.avgScore >= 80
                            ? PROFESSIONAL_COLORS.secondary
                            : entry.avgScore >= 60
                            ? PROFESSIONAL_COLORS.primary
                            : PROFESSIONAL_COLORS.danger
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Complete Topic Performance */}
          <div className="mt-10">
            <h3 className="text-2xl font-semibold mb-6" style={{ color: PROFESSIONAL_COLORS.primary }}>
              Complete Topic Performance Analysis
            </h3>
            <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.topics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 14, fill: '#374151' }} />
                  <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 13, fill: '#374151' }} />
                  <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                  <Bar dataKey="avgScore" radius={[0, 8, 8, 0]} barSize={30}>
                    {analyticsData.topics.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.avgScore >= 80
                            ? PROFESSIONAL_COLORS.secondary
                            : entry.avgScore >= 60
                            ? PROFESSIONAL_COLORS.teal
                            : PROFESSIONAL_COLORS.danger
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Section 3: Student Performance List */}
        <section className="space-y-8 pt-12 border-t-2 border-gray-200">
          <h2 className="text-4xl font-bold border-l-8 pl-6 py-2" style={{ borderColor: PROFESSIONAL_COLORS.purple, backgroundColor: `${PROFESSIONAL_COLORS.purple}10` }}>
            III. Student Performance List
          </h2>
          <div className="overflow-hidden rounded-xl border-2 border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead style={{ backgroundColor: `${PROFESSIONAL_COLORS.primary}20` }}>
                <tr>
                  <th className="p-5 font-bold text-lg" style={{ color: PROFESSIONAL_COLORS.primary }}>Student Name</th>
                  <th className="p-5 font-bold text-lg" style={{ color: PROFESSIONAL_COLORS.primary }}>Average Score</th>
                  <th className="p-5 font-bold text-lg" style={{ color: PROFESSIONAL_COLORS.primary }}>Attendance</th>
                  <th className="p-5 font-bold text-lg" style={{ color: PROFESSIONAL_COLORS.primary }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceVsMarksData.slice(0, 20).map((student, i) => (
                  <tr key={i} className="border-t-2 border-gray-100" style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td className="p-4 font-medium text-base">{student.studentName}</td>
                    <td className="p-4">
                      <span 
                        className="font-bold text-lg" 
                        style={{ 
                          color: student.marks >= 80 
                            ? PROFESSIONAL_COLORS.secondary 
                            : student.marks >= 50 
                            ? PROFESSIONAL_COLORS.primary 
                            : PROFESSIONAL_COLORS.danger 
                        }}
                      >
                        {student.marks}%
                      </span>
                    </td>
                    <td className="p-4 text-base font-medium">{student.attendance}%</td>
                    <td className="p-4 text-base text-gray-600">
                      {student.marks < 60 ? 'Priority Revision' : student.attendance < 75 ? 'Attendance Concern' : 'Consistent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 italic font-medium mt-4">* Showing top 20 students by attendance/marks. Refer to full system for all records.</p>
        </section>

        {/* Section 4: Recent Test Performance */}
        <section className="space-y-8 pt-12 border-t-2 border-gray-200">
          <h2 className="text-4xl font-bold border-l-8 pl-6 py-2" style={{ borderColor: PROFESSIONAL_COLORS.teal, backgroundColor: `${PROFESSIONAL_COLORS.teal}10` }}>
            IV. Recent Test Metrics
          </h2>
          <div className="grid grid-cols-2 gap-10">
            <div className="h-[400px]">
              <h3 className="text-2xl font-semibold mb-6 text-center" style={{ color: PROFESSIONAL_COLORS.teal }}>
                Score Distribution by Subject
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectAverageData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: '#374151' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 12, fill: '#374151' }} />
                  <Radar 
                    name="Class Avg" 
                    dataKey="average" 
                    stroke={PROFESSIONAL_COLORS.primary} 
                    fill={PROFESSIONAL_COLORS.primary} 
                    fillOpacity={0.5} 
                    strokeWidth={3}
                  />
                  <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[400px]">
              <h3 className="text-2xl font-semibold mb-6 text-center" style={{ color: PROFESSIONAL_COLORS.teal }}>
                Recent Test Breakdown
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recentTestsData.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="averageScore"
                    nameKey="title"
                    label={(entry) => `${entry.title}: ${entry.averageScore}%`}
                  >
                    {recentTestsData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={[
                          PROFESSIONAL_COLORS.primary,
                          PROFESSIONAL_COLORS.secondary,
                          PROFESSIONAL_COLORS.accent,
                          PROFESSIONAL_COLORS.purple,
                          PROFESSIONAL_COLORS.teal
                        ][index % 5]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Question Type Distribution */}
          {questionTypeData.length > 0 && (
            <div className="mt-10">
              <h3 className="text-2xl font-semibold mb-6" style={{ color: PROFESSIONAL_COLORS.teal }}>
                Question Type Distribution
              </h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={questionTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="type" tick={{ fontSize: 14, fill: '#374151' }} />
                    <YAxis tick={{ fontSize: 14, fill: '#374151' }} />
                    <Tooltip contentStyle={{ fontSize: '14px', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill={PROFESSIONAL_COLORS.accent} radius={[8, 8, 0, 0]} barSize={60}>
                      {questionTypeData.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={[
                            PROFESSIONAL_COLORS.primary,
                            PROFESSIONAL_COLORS.secondary,
                            PROFESSIONAL_COLORS.accent,
                            PROFESSIONAL_COLORS.purple
                          ][index % 4]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="pt-12 mt-12 border-t-4 text-center text-gray-500" style={{ borderColor: PROFESSIONAL_COLORS.primary }}>
          <p className="font-bold text-base mb-2">CONFIDENTIAL DOCUMENT • FOR ACADEMIC USE ONLY</p>
          <p className="text-base">© {new Date().getFullYear()} {schoolInfo?.name || 'Nuvana'} • Powered by Nuvana AI Analytics</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

// ---------- END OF FILE ----------
