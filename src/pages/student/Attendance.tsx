import { motion } from "framer-motion";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  getStudentAttendanceBySubject,
  getOverallAttendancePercentage,
} from "@/services/academic";
import {
  getStudentMonthlyAttendance,
  getStudentMonthlyAttendanceSummary,
} from "@/services/attendanceService";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface SubjectAttendance {
  subject: string;
  present: number;
  total: number;
  percentage: number;
  trend: "up" | "down";
  recentClasses: Array<{ date: string; status: "present" | "absent" }>;
}

const Attendance = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // 1. Overall Attendance
  const { data: overallAttendanceRaw, isLoading: loadingOverall } = useQuery({
    queryKey: ['student-attendance-percent', profile?.id],
    queryFn: () => getOverallAttendancePercentage(profile!.id),
    enabled: !!profile?.id,
  });
  const overallAttendance = overallAttendanceRaw !== undefined ? Math.round(overallAttendanceRaw * 10) / 10 : 0;

  // 2. Subject Attendance
  const { data: subjectAttendance = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['student-attendance-by-subject', profile?.id],
    queryFn: () => getStudentAttendanceBySubject(profile!.id),
    enabled: !!profile?.id,
  });

  // 3. Monthly Summary
  const { data: monthlySummary = [], isLoading: loadingSummary } = useQuery({
    queryKey: ['student-attendance-monthly-summary', profile?.id],
    queryFn: () => getStudentMonthlyAttendanceSummary(profile!.id),
    enabled: !!profile?.id,
  });

  // 4. Monthly Data (Enabled when selectedMonth changes)
  const { data: monthlyData, isLoading: loadingMonthly } = useQuery({
    queryKey: ['student-attendance-monthly', profile?.id, selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      return getStudentMonthlyAttendance(profile!.id, year, month);
    },
    enabled: !!profile?.id && !!selectedMonth,
  });

  const loading = loadingOverall || loadingSubjects || loadingSummary;

  // Prepare chart data for the selected month
  const chartData = useMemo(() => {
    if (!monthlyData) return [];
    
    // Check if this is the current month
    const today = new Date();
    const isCurrentMonth = monthlyData.year === today.getFullYear() && 
                           monthlyData.month === today.getMonth() + 1;
    
    return monthlyData.dailyData
      .map((day: any) => {
        const isSaturday = day.dayName === 'Sat';
        const isSunday = day.dayName === 'Sun';
        
        // For current month: show all days (weekends included)
        // For older months: weekends are already filtered out in backend, but double-check
        if (!isCurrentMonth && (isSaturday || isSunday)) {
          return null; // Skip weekends for older months
        }
        
        return {
          day: day.day,
          label: `${day.day} ${day.dayName}`,
          present: day.present,
          absent: day.absent,
          status: day.status,
          isWeekend: day.isWeekend,
          isSaturday: isSaturday,
          // Color keys for easier mapping
          presentColor: isSaturday ? "#f59e0b" : "#06b6d4", // Amber for weekend, Cyan for weekday
          absentColor: isSaturday ? "#f97316" : "#f59e0b", // Dark orange for weekend, Orange for weekday
        };
      })
      .filter((day: any) => day !== null); // Remove null entries
  }, [monthlyData]);

  // Prepare monthly summary chart data
  const monthlyChartData = useMemo(() => {
    return monthlySummary.map((month) => ({
      month: month.monthName.split(' ')[0], // Just the month name
      fullMonth: month.monthName,
      present: month.present,
      absent: month.absent,
      percentage: month.percentage,
      total: month.total,
    }));
  }, [monthlySummary]);

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/student")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-2xl sm:text-4xl font-bold neon-text truncate">Attendance</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Track your class attendance</p>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card p-4 sm:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-lg text-muted-foreground mb-2">
                      Overall Attendance
                    </p>
                    <p className="text-6xl font-bold neon-text">
                      {overallAttendance}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Keep it above 75% to avoid attendance issues
                    </p>
                  </div>
                  <div className="relative w-48 h-48">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={`${2 * Math.PI * 80 * (1 - overallAttendance / 100)
                          }`}
                        className="text-primary neon-glow"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
            {/* Monthly Attendance Graph Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">
                  Monthly Attendance Overview
                </h2>
                {monthlySummary.length > 0 && (
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select a month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthlySummary.map((month) => (
                        <SelectItem
                          key={month.monthKey}
                          value={month.monthKey}
                        >
                          {month.monthName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Monthly Overview Chart - Show first */}
              {monthlySummary.length > 0 && !selectedMonth && (
                <Card className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Attendance by Month
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a month from the dropdown above to view day-wise details
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold mb-2">{data.fullMonth}</p>
                                <p className="text-sm">
                                  <span className="text-cyan-500">Present: </span>
                                  <span className="font-medium">{data.present} days</span>
                                </p>
                                <p className="text-sm">
                                  <span className="text-orange-500">Absent: </span>
                                  <span className="font-medium">{data.absent} days</span>
                                </p>
                                <p className="text-sm pt-1 border-t border-primary/20">
                                  <span className="text-muted-foreground">Total: </span>
                                  <span className="font-medium">{data.total} days</span>
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Percentage: </span>
                                  <span className="font-semibold text-primary">{data.percentage}%</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="present" stackId="a" fill="#06b6d4" name="Present" />
                      <Bar dataKey="absent" stackId="a" fill="#f59e0b" name="Absent" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Day-wise Chart - Show only after month selection */}
              {selectedMonth && (
                <>
                  {loadingMonthly ? (
                    <Card className="glass-card p-6">
                      <div className="flex justify-center items-center py-10">
                        <LoadingSpinner />
                      </div>
                    </Card>
                  ) : monthlyData && chartData.length > 0 ? (
                    <Card className="glass-card p-6">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold">
                            {monthlyData.monthName} {monthlyData.year} - Day-wise Details
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (profile?.id && selectedMonth) {
                                  queryClient.invalidateQueries({
                                    queryKey: ['student-attendance-monthly', profile.id, selectedMonth]
                                  });
                                }
                              }}
                            >
                              Refresh
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMonth("")}
                            >
                              Back to Monthly View
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm flex-wrap">
                        <div>
                          <span className="text-muted-foreground">Present: </span>
                          <span className="font-semibold text-cyan-500">
                            {monthlyData.summary.presentDays} days
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Absent: </span>
                          <span className="font-semibold text-orange-500">
                            {monthlyData.summary.absentDays} days
                          </span>
                        </div>
                          <div>
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-semibold">
                              {monthlyData.summary.totalDays} days
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Percentage: </span>
                            <span className="font-semibold text-primary">
                              {monthlyData.summary.percentage}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {(() => {
                            const today = new Date();
                            const isCurrentMonth = monthlyData.year === today.getFullYear() && 
                                                   monthlyData.month === today.getMonth() + 1;
                            return isCurrentMonth 
                              ? "Showing days up to tomorrow. Sundays are excluded."
                              : "Showing days excluding Sundays for past months.";
                          })()}
                        </p>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart 
                          data={chartData}
                          key={`chart-${selectedMonth}-${monthlyData?.summary?.totalDays || 0}`}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis 
                            dataKey="day" 
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis 
                            tick={{ fill: 'currentColor', fontSize: 12 }}
                            domain={[0, 1]}
                            label={{ value: 'Status', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                                    <p className="font-semibold mb-1">{data.label}</p>
                                    {data.status === 'present' && (
                                      <p className="text-cyan-500 text-sm">✓ Present</p>
                                    )}
                                    {data.status === 'absent' && (
                                      <p className="text-orange-500 text-sm">✗ Absent</p>
                                    )}
                                    {data.status === null && (
                                      <p className="text-muted-foreground text-sm">No record</p>
                                    )}
                                    {data.isSaturday && (
                                      <p className="text-xs text-secondary mt-1">
                                        <span className="text-secondary">●</span> Saturday
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="present" stackId="a" name="Present" radius={[0, 0, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-present-${index}`} 
                                fill={entry.presentColor} 
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="absent" stackId="a" name="Absent" radius={[0, 0, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-absent-${index}`} 
                                fill={entry.absentColor} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {(() => {
                          const today = new Date();
                          const isCurrentMonth = monthlyData.year === today.getFullYear() && 
                                                 monthlyData.month === today.getMonth() + 1;
                          if (isCurrentMonth) {
                            return (
                              <>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-secondary rounded"></div>
                                  <span>Saturday</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                                  <span>Weekday - Present</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                                  <span>Weekday - Absent</span>
                                </div>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                                  <span>Present</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                                  <span>Absent</span>
                                </div>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </Card>
                  ) : (
                    <Card className="glass-card p-6">
                      <p className="text-center text-muted-foreground">
                        No attendance data available for the selected month
                      </p>
                    </Card>
                  )}
                </>
              )}

              {/* Monthly Summary Cards */}
              {monthlySummary.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {monthlySummary.slice(0, 3).map((month, index) => (
                    <motion.div
                      key={month.monthKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                    >
                      <Card 
                        className={`glass-card p-4 cursor-pointer hover:neon-glow transition-all ${
                          selectedMonth === month.monthKey ? 'border-primary' : ''
                        }`}
                        onClick={() => setSelectedMonth(month.monthKey)}
                      >
                        <h4 className="font-semibold text-sm mb-2">{month.monthName}</h4>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Present:</span>
                              <span className="text-cyan-500 font-medium">{month.present}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Absent:</span>
                              <span className="text-orange-500 font-medium">{month.absent}</span>
                            </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-primary/20">
                            <span className="text-muted-foreground">Percentage:</span>
                            <span className="font-semibold text-primary">{month.percentage}%</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="glass-card p-6 bg-primary/5 border-primary/30">
            <h3 className="font-semibold mb-2">💡 Attendance Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1 mb-3">
              <li>• Attendance is marked per day - if you're present, you're marked present for all subjects that day</li>
              <li>• Subject-wise attendance is calculated based on your class timetable</li>
              <li>• Only subjects assigned to your class are shown</li>
              <li>• Maintain at least 75% attendance in all subjects</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-primary/20">
              <h4 className="font-semibold mb-1 text-sm">How it works:</h4>
              <p className="text-xs text-muted-foreground">
                When your teacher marks you present for a day, you're automatically marked present for all subjects that have classes on that day according to your timetable.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Attendance;
