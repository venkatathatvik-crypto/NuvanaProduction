import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, Save, Trash2, Edit, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService, type WeeklyTimetable } from "@/services/academicApiService";
import { userService } from "@/services/userService";
import { DAY_NAMES } from "@/services/timetableService";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AdminTimetable() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<any[]>([]);
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>("");
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<number>(1);
  const [timetableData, setTimetableData] = useState<WeeklyTimetable>({});
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [periodForm, setPeriodForm] = useState<{
    id?: string;
    period_number: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room: string;
  }>({
    period_number: 1,
    subject_id: "",
    teacher_id: "",
    start_time: "09:00",
    end_time: "10:30",
    room: "",
  });
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);

  useEffect(() => {
    if (profile?.school_id) {
      fetchData();
    }
  }, [profile?.school_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes, gradeSubjectsRes] = await Promise.all([
        academicService.getClasses(),
        userService.getTeachers(),
        academicService.getGradeSubjects(),
      ]);
      setClasses(classesRes);
      setTeachers(teachersRes);
      setGradeSubjects(gradeSubjectsRes);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (classId: string) => {
    if (!classId || !profile?.school_id) return;
    setTimetableLoading(true);
    try {
      const data = await academicService.getWeeklyTimetable(classId);
      setTimetableData(data);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      toast.error("Failed to load timetable");
    } finally {
      setTimetableLoading(false);
    }
  };

  const handleAddPeriod = async () => {
    if (!selectedTimetableClass || !profile?.school_id) {
      toast.error("Please select a class first");
      return;
    }
    if (!periodForm.subject_id || !periodForm.teacher_id) {
      toast.error("Please fill all required fields");
      return;
    }
    setAddingPeriod(true);
    try {
      await academicService.createOrUpdatePeriod({
        class_id: selectedTimetableClass,
        day_of_week: selectedTimetableDay,
        period_number: periodForm.period_number,
        subject_id: periodForm.subject_id,
        teacher_id: periodForm.teacher_id,
        start_time: periodForm.start_time,
        end_time: periodForm.end_time,
        room: periodForm.room,
      });
      toast.success(isEditingPeriod ? "Period updated" : "Period added");
      resetPeriodForm();
      fetchTimetable(selectedTimetableClass);
    } catch (error: any) {
      console.error("Error saving period:", error);
      toast.error(error.message || "Failed to save period");
    } finally {
      setAddingPeriod(false);
    }
  };

  const handleEditPeriod = (period: any) => {
    setPeriodForm({
      id: period.id,
      period_number: period.period_number,
      subject_id: period.subject_id || period.grade_subject_id,
      teacher_id: period.teacher_id,
      start_time: period.start_time,
      end_time: period.end_time,
      room: period.room || "",
    });
    setIsEditingPeriod(true);
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm("Are you sure you want to delete this period?")) return;
    try {
      await academicService.deletePeriod(periodId);
      toast.success("Period deleted");
      fetchTimetable(selectedTimetableClass);
    } catch (error: any) {
      console.error("Error deleting period:", error);
      toast.error(error.message || "Failed to delete period");
    }
  };

  const resetPeriodForm = () => {
    setPeriodForm({
      period_number: 1,
      subject_id: "",
      teacher_id: "",
      start_time: "09:00",
      end_time: "10:30",
      room: "",
    });
    setIsEditingPeriod(false);
  };

  const selectedClassData = classes.find((c) => c.id === selectedTimetableClass);
  const filteredSubjectsForClass = selectedClassData
    ? gradeSubjects
        .filter((gs) => gs.grade_level_id === selectedClassData.grade_level_id)
        .map((gs) => ({ id: gs.id, name: gs.subjects_master?.name }))
        .filter((s) => s.name)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Timetable</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage class timetables</p>
          </motion.div>
        </div>

        <Card className="glass-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Class Timetable
            </h2>
            <div className="flex gap-2">
              <select
                className="bg-muted border border-border rounded-md h-10 px-3 text-sm flex-1 sm:flex-none"
                value={selectedTimetableClass}
                onChange={(e) => {
                  setSelectedTimetableClass(e.target.value);
                  if (e.target.value) fetchTimetable(e.target.value);
                }}
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedTimetableClass ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a class to manage its timetable</p>
            </div>
          ) : timetableLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                {DAY_NAMES.map((day, index) => (
                  <Button
                    key={day}
                    variant={selectedTimetableDay === index + 1 ? "default" : "outline"}
                    onClick={() => setSelectedTimetableDay(index + 1)}
                    size="sm"
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">{DAY_NAMES[selectedTimetableDay - 1]} Schedule</h3>
                  {timetableData[selectedTimetableDay]?.timetable_periods?.length > 0 ? (
                    <div className="space-y-2">
                      {timetableData[selectedTimetableDay]?.timetable_periods.map((period: any) => (
                        <div key={period.id} className="p-4 rounded-lg bg-secondary/20 border border-border/50 flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">P{period.period_number}</Badge>
                              <span className="font-medium">{period.subject_name || "Unknown"}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {period.start_time?.slice(0, 5)} - {period.end_time?.slice(0, 5)} | {period.teacher_name || "TBA"} | {period.room || "-"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditPeriod(period)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeletePeriod(period.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <p>No periods added for {DAY_NAMES[selectedTimetableDay - 1]}</p>
                      <p className="text-sm">Use the form to add periods</p>
                    </div>
                  )}
                </div>

                <Card className="glass-card p-4">
                  <h3 className="font-semibold mb-4">{isEditingPeriod ? "Edit Period" : "Add Period"}</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Period #</label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={periodForm.period_number}
                          onChange={(e) => setPeriodForm({ ...periodForm, period_number: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Room</label>
                        <Input placeholder="e.g. Lab 1" value={periodForm.room} onChange={(e) => setPeriodForm({ ...periodForm, room: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Subject *</label>
                      <select className="w-full bg-muted border border-border rounded-md h-10 px-3" value={periodForm.subject_id} onChange={(e) => setPeriodForm({ ...periodForm, subject_id: e.target.value })}>
                        <option value="">Select Subject</option>
                        {filteredSubjectsForClass.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Teacher *</label>
                      <select className="w-full bg-muted border border-border rounded-md h-10 px-3" value={periodForm.teacher_id} onChange={(e) => setPeriodForm({ ...periodForm, teacher_id: e.target.value })}>
                        <option value="">Select Teacher</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Start Time</label>
                        <Input type="time" value={periodForm.start_time} onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">End Time</label>
                        <Input type="time" value={periodForm.end_time} onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={handleAddPeriod} disabled={addingPeriod}>
                        {addingPeriod ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isEditingPeriod ? "Updating..." : "Adding..."}
                          </>
                        ) : (
                          <>
                            {isEditingPeriod ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {isEditingPeriod ? "Update Period" : "Add Period"}
                          </>
                        )}
                      </Button>
                      {isEditingPeriod && (
                        <Button variant="outline" onClick={resetPeriodForm}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

