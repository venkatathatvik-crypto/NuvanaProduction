import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Save, Upload, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { Test } from "@/lib/mcq-store";
import { getAllTeachingClasses, getExamTypesWithCategory, ExamTypeWithCategory, getSubjects, FlattenedClass, getTeacherAllSubjectsDetailed } from "@/services/academic";
import { getTeacherSubjectsForClass } from "@/services/classService";
import { useAuth } from "@/auth/AuthContext";

const questionSchema = z
    .object({
        id: z.string().optional(),
        text: z.string().min(1, "Question text is required"),
        questionType: z
            .enum(["MCQ", "Essay", "Short Answer", "Very Short Answer"])
            .default("MCQ"),
        options: z.array(z.string()).optional(),
        correctOptionIndex: z.coerce.number().min(0).max(3).optional(),
        marks: z.coerce.number().min(1, "Marks must be at least 1"),
        negativeMarks: z.coerce.number().optional(),
        chapter: z.string().min(1, "Chapter is required"),
        topic: z.string().min(1, "Topic is required"),
    })
    .refine(
        (data) => {
            if (data.questionType === "MCQ") {
                return (
                    data.options &&
                    data.options.length >= 2 &&
                    data.correctOptionIndex !== undefined
                );
            }
            return true;
        },
        {
            message: "MCQ questions require at least 2 options and a correct answer",
            path: ["options"],
        }
    );

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    durationMinutes: z.coerce
        .number()
        .min(1, "Duration must be at least 1 minute"),
    isPublished: z.boolean().default(false),
    classIds: z.array(z.string()).min(1, "At least one class is required"),
    subject: z.string().min(1, "Subject is required"),
    gradeSubjectId: z.string().min(1, "Grade subject ID is required"),
    examType: z.string().min(1, "Exam type is required"),
    dueDate: z.string().optional(),
    questions: z.array(questionSchema),
});

interface TestFormProps {
    initialData?: Test;
    onSubmit: (data: any) => void;
    defaultExamType?: string;
}

export const TestForm = ({ initialData, onSubmit, defaultExamType }: TestFormProps) => {
    const { profile, profileLoading } = useAuth();
    const [classes, setClasses] = useState<FlattenedClass[]>([]);
    const [allExamTypes, setAllExamTypes] = useState<ExamTypeWithCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<"Internal Assessment" | "School Exam">("School Exam");
    const [subjects, setSubjects] = useState<string[]>([]);
    const [allTeacherSubjects, setAllTeacherSubjects] = useState<any[]>([]);
    const [selectedGradeSubjectId, setSelectedGradeSubjectId] = useState<string>("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            durationMinutes: 30,
            isPublished: false,
            classIds: [],
            subject: "",
            gradeSubjectId: "",
            examType: defaultExamType || "",
            dueDate: "",
            questions: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    // Filter classes based on selected subject's grade level
    const filteredClassesForSubject = useMemo(() => {
        if (!selectedGradeSubjectId || !classes.length) return [];
        
        const selectedSubject = allTeacherSubjects.find(s => s.grade_subject_id === selectedGradeSubjectId);
        if (!selectedSubject) return [];
        
        return classes.filter(cls => cls.grade_id === selectedSubject.grade_id);
    }, [selectedGradeSubjectId, classes, allTeacherSubjects]);

    // Load classes & exam types and hydrate form with initialData
    useEffect(() => {
        const fetchInitialData = async () => {
            if (profileLoading) return;

            if (!profile) {
                toast.error("Please login to create tests");
                return;
            }

            try {
                const [classesData, examTypesData, allSubjectsData] = await Promise.all([
                    getAllTeachingClasses(profile.id, profile.school_id),
                    getExamTypesWithCategory(profile.school_id),
                    getTeacherAllSubjectsDetailed(profile.id),
                ]);

                setClasses(classesData || []);
                setAllExamTypes(examTypesData || []);
                setAllTeacherSubjects(allSubjectsData || []);

                // Determine initial category based on defaultExamType
                if (defaultExamType && examTypesData) {
                    const matchingType = examTypesData.find(et => et.name === defaultExamType);
                    if (matchingType) {
                        setSelectedCategory(matchingType.type);
                    }
                }

                if (initialData) {
                    const initialClassIds = (initialData as any).classIds || [];
                    const initialSubject = (initialData as any).subject || "";
                    const initialExamType = (initialData as any).examType || "";

                    form.reset({
                        title: initialData.title || "",
                        description: initialData.description || "",
                        durationMinutes: initialData.durationMinutes || 30,
                        isPublished: initialData.isPublished || false,
                        classIds: initialClassIds,
                        subject: initialSubject,
                        examType: initialExamType,
                        questions:
                            initialData.questions?.map((q) => ({
                                id: q.id,
                                text: q.text,
                                questionType: q.questionType || "MCQ",
                                options: q.options || ["", "", "", ""],
                                correctOptionIndex: q.correctOptionIndex,
                                marks: q.marks,
                                chapter: q.chapter || "",
                                topic: q.topic || "",
                                negativeMarks: (q as any).negativeMarks ?? 0,
                            })) || [],
                    });
                }

                // Set default exam type if provided
                if (defaultExamType) {
                    form.setValue("examType", defaultExamType);
                } else {
                    // Set first exam type from selected category
                    const categoryTypes = (examTypesData || []).filter(et => et.type === "School Exam");
                    if (categoryTypes.length > 0 && !form.getValues("examType")) {
                        form.setValue("examType", categoryTypes[0].name);
                    }
                }

            } catch (error) {
                toast.error("Failed to load form data");
            }
        };

        fetchInitialData();
    }, [profile, profileLoading, initialData, form, defaultExamType]);


    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            const lines = content.split("\n").filter(line => line.trim());
            
            if (lines.length === 0) {
                toast.error("CSV file is empty");
                return;
            }

            const newQuestions: any[] = [];
            
            // Check header row
            const header = lines[0].toLowerCase();
            const expectedHeaders = ["question", "opt1", "opt2", "opt3", "opt4", "correctindex", "marks", "chapter", "topic"];
            const hasHeader = expectedHeaders.some(h => header.includes(h));
            
            // Validate header format
            if (hasHeader) {
                const headerParts = lines[0].split(",").map(h => h.trim().toLowerCase());
                const missingHeaders = expectedHeaders.filter(h => !headerParts.some(headerPart => headerPart.includes(h)));
                
                if (missingHeaders.length > 0) {
                    toast.error(
                        `CSV header is missing required columns: ${missingHeaders.join(", ")}. ` +
                        `Expected format: Question, Opt1, Opt2, Opt3, Opt4, CorrectIndex, Marks, Chapter, Topic`
                    );
                    return;
                }
            }

            const startIndex = hasHeader ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(",").map(p => p.trim());
                if (parts.length >= 8) {
                    const correctIndex = parseInt(parts[5].trim());
                    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
                        toast.warning(`Row ${i + 1}: Invalid CorrectIndex (must be 0-3), using 0`);
                    }
                    
                    newQuestions.push({
                        text: parts[0].trim() || `Question ${newQuestions.length + 1}`,
                        options: [
                            parts[1].trim() || "Option A",
                            parts[2].trim() || "Option B",
                            parts[3].trim() || "Option C",
                            parts[4].trim() || "Option D",
                        ].filter(Boolean),
                        correctOptionIndex: (correctIndex >= 0 && correctIndex <= 3) ? correctIndex : 0,
                        marks: parseInt(parts[6]?.trim()) || 1,
                        chapter: parts[7]?.trim() || "General",
                        topic: parts[8]?.trim() || "General",
                        questionType: "MCQ",
                        negativeMarks: 0,
                    });
                } else {
                    toast.warning(`Row ${i + 1}: Insufficient columns (expected 9, found ${parts.length}). Skipping.`);
                }
            }

            if (newQuestions.length > 0) {
                newQuestions.forEach((q) => append(q));
                toast.success(`Imported ${newQuestions.length} question${newQuestions.length > 1 ? 's' : ''} from CSV`);
            } else {
                toast.error(
                    "Failed to parse CSV. Please ensure your CSV has the correct format:\n" +
                    "Header: Question, Opt1, Opt2, Opt3, Opt4, CorrectIndex, Marks, Chapter, Topic\n" +
                    "CorrectIndex should be 0-3 (0 for first option, 3 for fourth option)"
                );
            }
        };

        reader.onerror = () => {
            toast.error("Error reading CSV file");
        };

        reader.readAsText(file);
    };

    const totalMarks = form
        .watch("questions")
        .reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
                noValidate
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT: Test details + questions */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Test meta */}
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Test Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Test Title</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Mathematics Midterm"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />


                                {/* Subject Selection */}
                                <div className="mb-4">
                                    <label className="text-sm font-medium mb-2 block">Subject *</label>
                                    <Select
                                        value={selectedGradeSubjectId}
                                        onValueChange={(value) => {
                                            setSelectedGradeSubjectId(value);
                                            form.setValue('classIds', []); // Reset classes when subject changes
                                            // Find and set the subject name and ID in form
                                            const subject = allTeacherSubjects.find(s => s.grade_subject_id === value);
                                            form.setValue('subject', subject?.subject_name || '');
                                            form.setValue('gradeSubjectId', value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allTeacherSubjects.map((subject) => (
                                                <SelectItem key={subject.grade_subject_id} value={subject.grade_subject_id}>
                                                    {subject.subject_name} ({subject.grade_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Multi-Class Selection */}
                                <FormField
                                    control={form.control}
                                    name="classIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select Classes * (at least one required)</FormLabel>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-lg bg-secondary/5">
                                                {filteredClassesForSubject.length > 0 ? (
                                                    filteredClassesForSubject.map((cls) => {
                                                        const isSelected = field.value.includes(cls.class_id);
                                                        return (
                                                            <div
                                                                key={cls.class_id}
                                                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                                        : 'bg-muted border-border hover:border-primary/50 text-muted-foreground'
                                                                }`}
                                                                onClick={() => {
                                                                    const newValue = isSelected
                                                                        ? field.value.filter(id => id !== cls.class_id)
                                                                        : [...field.value, cls.class_id];
                                                                    field.onChange(newValue);
                                                                }}
                                                            >
                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                                                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                                                                }`}>
                                                                    {isSelected && (
                                                                        <svg className="w-2 h-2 text-white fill-current" viewBox="0 0 20 20">
                                                                            <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-medium">{cls.class_name}</span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="col-span-full text-center py-2 text-xs text-amber-500 italic">
                                                        {selectedGradeSubjectId ? "No classes found for this subject's grade level." : "Please select a subject first."}
                                                    </p>
                                                )}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />


                                {/* Exam Type Category and Exam Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormItem>
                                        <FormLabel>Exam Category</FormLabel>
                                        <Select
                                            value={selectedCategory}
                                            onValueChange={(value: "Internal Assessment" | "School Exam") => {
                                                setSelectedCategory(value);
                                                // Reset exam type when category changes
                                                const categoryTypes = allExamTypes.filter(et => et.type === value);
                                                if (categoryTypes.length > 0) {
                                                    form.setValue("examType", categoryTypes[0].name);
                                                } else {
                                                    form.setValue("examType", "");
                                                }
                                            }}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="School Exam">School Exam</SelectItem>
                                                <SelectItem value="Internal Assessment">Internal Assessment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>

                                    <FormField
                                        control={form.control}
                                        name="examType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exam Type</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {allExamTypes
                                                            .filter(et => et.type === selectedCategory)
                                                            .map((et) => (
                                                                <SelectItem key={et.id} value={et.name}>
                                                                    {et.name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Instructions for students..."
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => {
                                        // Parse the datetime string to extract date and time
                                        const dateValue = field.value ? new Date(field.value) : null;
                                        const timeValue = field.value ? field.value.split('T')[1]?.substring(0, 5) || '09:00' : '09:00';
                                        
                                        return (
                                            <FormItem>
                                                <FormLabel>Due Date & Time (Optional)</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="flex-1 justify-start text-left font-normal bg-muted border-border hover:bg-muted/80"
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                                    {dateValue ? format(dateValue, "PPP") : "Select date"}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={dateValue || undefined}
                                                                    onSelect={(date) => {
                                                                        if (date) {
                                                                            const year = date.getFullYear();
                                                                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                                            const day = date.getDate().toString().padStart(2, '0');
                                                                            field.onChange(`${year}-${month}-${day}T${timeValue}`);
                                                                        }
                                                                    }}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="w-32 justify-start text-left font-normal bg-muted border-border hover:bg-muted/80"
                                                                >
                                                                    <Clock className="mr-2 h-4 w-4 text-primary" />
                                                                    {timeValue}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-3 bg-background border-border" align="start">
                                                                <div className="flex gap-2">
                                                                    <select
                                                                        className="bg-muted border border-border rounded-md p-2 text-sm"
                                                                        value={timeValue.split(':')[0]}
                                                                        onChange={(e) => {
                                                                            const mins = timeValue.split(':')[1] || '00';
                                                                            const newTime = `${e.target.value}:${mins}`;
                                                                            if (dateValue) {
                                                                                const year = dateValue.getFullYear();
                                                                                const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
                                                                                const day = dateValue.getDate().toString().padStart(2, '0');
                                                                                field.onChange(`${year}-${month}-${day}T${newTime}`);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {Array.from({ length: 11 }, (_, i) => (i + 8).toString().padStart(2, '0')).map(h => (
                                                                            <option key={h} value={h}>{h}</option>
                                                                        ))}
                                                                    </select>
                                                                    <span className="text-xl">:</span>
                                                                    <select
                                                                        className="bg-muted border border-border rounded-md p-2 text-sm"
                                                                        value={timeValue.split(':')[1] || '00'}
                                                                        onChange={(e) => {
                                                                            const hrs = timeValue.split(':')[0] || '09';
                                                                            const newTime = `${hrs}:${e.target.value}`;
                                                                            if (dateValue) {
                                                                                const year = dateValue.getFullYear();
                                                                                const month = (dateValue.getMonth() + 1).toString().padStart(2, '0');
                                                                                const day = dateValue.getDate().toString().padStart(2, '0');
                                                                                field.onChange(`${year}-${month}-${day}T${newTime}`);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map(m => (
                                                                            <option key={m} value={m}>{m}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Set a deadline for students to complete this test
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="durationMinutes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Duration (Minutes)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isPublished"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">
                                                        Publish Test
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Make this test visible to students
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Questions header + actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                            <h2 className="text-xl sm:text-2xl font-bold">
                                Questions ({fields.length})
                            </h2>
                            <div className="flex gap-2">
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                    />
                                    <Button type="button" variant="outline" size="sm">
                                        <Upload className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Import CSV</span>
                                    </Button>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                                        <div className="bg-popover text-popover-foreground text-xs rounded-md p-2 shadow-lg border border-border max-w-xs">
                                            <p className="font-semibold mb-1">CSV Format:</p>
                                            <p className="text-muted-foreground">
                                                Header: <span className="font-mono">Question, Opt1, Opt2, Opt3, Opt4, CorrectIndex, Marks, Chapter, Topic</span>
                                            </p>
                                            <p className="text-muted-foreground mt-1">
                                                CorrectIndex: 0-3 (0 = first option, 3 = fourth option)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                        append({
                                            text: "",
                                            questionType: "MCQ",
                                            options: ["", "", "", ""],
                                            correctOptionIndex: 0,
                                            marks: 1,
                                            negativeMarks: 0,
                                            chapter: "",
                                            topic: "",
                                        })
                                    }
                                >
                                    <Plus className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Add Question</span>
                                </Button>
                            </div>
                        </div>

                        {/* Questions list */}
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const type = form.watch(
                                    `questions.${index}.questionType`
                                ) as z.infer<typeof questionSchema>["questionType"];

                                const correctIndex = form.watch(
                                    `questions.${index}.correctOptionIndex`
                                );

                                return (
                                    <Card key={field.id} className="relative group">
                                        <CardContent className="pt-6">
                                            {/* delete / actions */}
                                            <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="grid gap-4">
                                                {/* Question number + type + text */}
                                                <div className="flex gap-4 items-start">
                                                    <span className="bg-muted w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1 space-y-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`questions.${index}.questionType`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">
                                                                        Question Type
                                                                    </FormLabel>
                                                                    <Select
                                                                        onValueChange={(value) => {
                                                                            field.onChange(value);

                                                                            if (value !== "MCQ") {
                                                                                form.setValue(
                                                                                    `questions.${index}.options`,
                                                                                    undefined
                                                                                );
                                                                                form.setValue(
                                                                                    `questions.${index}.correctOptionIndex`,
                                                                                    undefined
                                                                                );
                                                                            } else {
                                                                                form.setValue(
                                                                                    `questions.${index}.options`,
                                                                                    ["", "", "", ""]
                                                                                );
                                                                                form.setValue(
                                                                                    `questions.${index}.correctOptionIndex`,
                                                                                    0
                                                                                );
                                                                            }
                                                                        }}
                                                                        value={field.value}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger>
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="MCQ">MCQ</SelectItem>
                                                                            <SelectItem value="Essay">
                                                                                Essay
                                                                            </SelectItem>
                                                                            <SelectItem value="Short Answer">
                                                                                Short Answer
                                                                            </SelectItem>
                                                                            <SelectItem value="Very Short Answer">
                                                                                Very Short Answer
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`questions.${index}.text`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Textarea
                                                                            placeholder="Question text"
                                                                            {...field}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>

                                                {/* MCQ options */}
                                                {type === "MCQ" && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                                                        {[0, 1, 2, 3].map((optIndex) => (
                                                            <FormField
                                                                key={optIndex}
                                                                control={form.control}
                                                                name={`questions.${index}.options.${optIndex}`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${correctIndex === optIndex
                                                                                    ? "border-green-500 bg-green-500/20"
                                                                                    : "border-muted"
                                                                                    }`}
                                                                            >
                                                                                <span className="text-[10px]">
                                                                                    {String.fromCharCode(
                                                                                        65 + optIndex
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <FormControl>
                                                                                <Input
                                                                                    placeholder={`Option ${optIndex + 1
                                                                                        }`}
                                                                                    {...field}
                                                                                />
                                                                            </FormControl>
                                                                        </div>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Non-MCQ hint */}
                                                {type !== "MCQ" && (
                                                    <div className="pl-12 p-4 rounded-lg bg-muted/30 border border-border">
                                                        <p className="text-sm text-muted-foreground">
                                                            {type === "Essay" &&
                                                                "📝 Essay Answer – Students will have a large text area to write their answer."}
                                                            {type === "Short Answer" &&
                                                                "✍️ Short Answer – Students will have a medium text area (2–3 sentences)."}
                                                            {type === "Very Short Answer" &&
                                                                "💬 Very Short Answer – Students will have a single line input."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Chapter / Topic */}
                                            <div className="grid grid-cols-2 gap-4 pl-12 mt-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`questions.${index}.chapter`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Chapter</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="e.g. Algebra"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`questions.${index}.topic`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Topic</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="e.g. Quadratic Equations"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Correct option (MCQ) + marks */}
                                            <div className="flex gap-4 pl-12 items-center mt-4">
                                                {type === "MCQ" && (
                                                    <FormField
                                                        control={form.control}
                                                        name={`questions.${index}.correctOptionIndex`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <FormLabel className="text-xs">
                                                                    Correct Option
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={(val) =>
                                                                        field.onChange(parseInt(val))
                                                                    }
                                                                    value={
                                                                        field.value !== undefined
                                                                            ? field.value.toString()
                                                                            : "0"
                                                                    }
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="0">Option A</SelectItem>
                                                                        <SelectItem value="1">Option B</SelectItem>
                                                                        <SelectItem value="2">Option C</SelectItem>
                                                                        <SelectItem value="3">Option D</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}

                                                <FormField
                                                    control={form.control}
                                                    name={`questions.${index}.marks`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-24">
                                                            <FormLabel className="text-xs">
                                                                Max Marks
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input type="number" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: Summary */}
                    <div className="md:col-span-1">
                        <Card className="glass-card sticky top-6">
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span>Total Questions:</span>
                                    <span className="font-bold">{fields.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Marks:</span>
                                    <span className="font-bold">{totalMarks}</span>
                                </div>
                                <Button type="submit" className="w-full mt-4" disabled={form.formState.isSubmitting}>
                                    <Save className="w-4 h-4 sm:mr-2" />
                                    {form.formState.isSubmitting ? (
                                        <>
                                            <span className="hidden sm:inline">Saving Test...</span>
                                            <span className="sm:hidden">Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="hidden sm:inline">Save Test</span>
                                            <span className="sm:hidden">Save</span>
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
};
