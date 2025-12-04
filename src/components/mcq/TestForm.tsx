import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

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

import { Test } from "@/lib/mcq-store";
import { getTeacherClasses, getExamTypes, getSubjects, FlattenedClass } from "@/services/academic";
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
    classId: z.string().min(1, "Class is required"),
    subject: z.string().min(1, "Subject is required"),
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
    const [examTypes, setExamTypes] = useState<string[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            durationMinutes: 30,
            isPublished: false,
            classId: "",
            subject: "",
            examType: defaultExamType || "",
            dueDate: "",
            questions: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "questions",
    });

    // Load classes & exam types and hydrate form with initialData
    useEffect(() => {
        const fetchInitialData = async () => {
            if (profileLoading) return;

            if (!profile) {
                toast.error("Please login to create tests");
                return;
            }

            try {
                const [classesData, examTypesData] = await Promise.all([
                    getTeacherClasses(profile.id),
                    getExamTypes(),
                ]);

                setClasses(classesData || []);

                // Add defaultExamType to options if not present
                let types = examTypesData || [];
                if (defaultExamType && !types.includes(defaultExamType)) {
                    types = [...types, defaultExamType];
                }
                setExamTypes(types);

                if (initialData) {
                    const initialClassId = (initialData as any).classId || "";
                    const initialSubject = (initialData as any).subject || "";
                    const initialExamType = (initialData as any).examType || "";

                    form.reset({
                        title: initialData.title || "",
                        description: initialData.description || "",
                        durationMinutes: initialData.durationMinutes || 30,
                        isPublished: initialData.isPublished || false,
                        classId: initialClassId,
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

                    // Preload subjects when editing
                    if (initialClassId && classesData) {
                        const selectedClass = classesData.find(
                            (c) => c.class_id === initialClassId
                        );
                        if (selectedClass) {
                            try {
                                const subjectsData = await getSubjects(selectedClass.grade_id);
                                setSubjects(subjectsData || []);
                            } catch (error) {
                                console.error("Failed to fetch subjects for initial class", error);
                            }
                        }
                    }
                } else {
                    // Defaults in create mode
                    if (
                        classesData &&
                        classesData.length > 0 &&
                        !form.getValues("classId")
                    ) {
                        form.setValue("classId", classesData[0].class_id);
                    }

                    // Set default exam type if provided
                    if (defaultExamType) {
                        form.setValue("examType", defaultExamType);
                    } else if (
                        types &&
                        types.length > 0 &&
                        !form.getValues("examType")
                    ) {
                        form.setValue("examType", types[0]);
                    }

                }
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                toast.error("Failed to load form data");
            }
        };

        fetchInitialData();
    }, [profile, profileLoading, initialData, form, defaultExamType]);

    const selectedClassId = form.watch("classId");

    // Load subjects when class changes
    useEffect(() => {
        const fetchSubjectsForClass = async () => {
            if (!selectedClassId) {
                setSubjects([]);
                return;
            }

            const selectedClass = classes.find(
                (c) => c.class_id === selectedClassId
            );

            if (!selectedClass) {
                setSubjects([]);
                return;
            }

            try {
                const subjectsData = await getSubjects(selectedClass.grade_id);
                setSubjects(subjectsData || []);

                if (initialData && (initialData as any).subject) {
                    const initialSubject = (initialData as any).subject;
                    if (subjectsData && subjectsData.includes(initialSubject)) {
                        form.setValue("subject", initialSubject);
                    } else if (subjectsData && subjectsData.length > 0) {
                        form.setValue("subject", subjectsData[0]);
                    }
                } else if (
                    subjectsData &&
                    subjectsData.length > 0 &&
                    !form.getValues("subject")
                ) {
                    form.setValue("subject", subjectsData[0]);
                }
            } catch (error) {
                console.error("Failed to fetch subjects", error);
                toast.error("Failed to load subjects");
                setSubjects([]);
            }
        };

        fetchSubjectsForClass();
    }, [selectedClassId, classes, initialData, form]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            const lines = content.split("\n");
            const newQuestions: any[] = [];

            const startIndex = lines[0].toLowerCase().includes("question") ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(",");
                if (parts.length >= 8) {
                    newQuestions.push({
                        text: parts[0].trim(),
                        options: [
                            parts[1].trim(),
                            parts[2].trim(),
                            parts[3].trim(),
                            parts[4].trim(),
                        ].filter(Boolean),
                        correctOptionIndex: parseInt(parts[5].trim()) || 0,
                        marks: parseInt(parts[6]?.trim()) || 1,
                        chapter: parts[7]?.trim() || "General",
                        topic: parts[8]?.trim() || "General",
                        questionType: "MCQ",
                        negativeMarks: 0,
                    });
                }
            }

            if (newQuestions.length > 0) {
                newQuestions.forEach((q) => append(q));
                toast.success(`Imported ${newQuestions.length} questions`);
            } else {
                toast.error(
                    "Failed to parse CSV. Format: Question, Opt1, Opt2, Opt3, Opt4, CorrectIndex, Marks, Chapter, Topic"
                );
            }
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="classId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Class</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Class" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {classes.map((cls) => (
                                                            <SelectItem
                                                                key={cls.class_id}
                                                                value={cls.class_id}
                                                            >
                                                                {cls.class_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Subject</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    disabled={!selectedClassId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Subject" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {subjects.map((subject) => (
                                                            <SelectItem key={subject} value={subject}>
                                                                {subject}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="examType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exam Type</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {examTypes.map((type) => (
                                                            <SelectItem key={type} value={type}>
                                                                {type}
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
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Due Date & Time (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="datetime-local"
                                                    {...field}
                                                    className="w-full"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Set a deadline for students to complete this test
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
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
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">
                                Questions ({fields.length})
                            </h2>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                    />
                                    <Button type="button" variant="outline">
                                        <Upload className="w-4 h-4 mr-2" /> Import CSV
                                    </Button>
                                </div>
                                <Button
                                    type="button"
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
                                    <Plus className="w-4 h-4 mr-2" /> Add Question
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
                                <Button type="submit" className="w-full mt-4">
                                    <Save className="w-4 h-4 mr-2" /> Save Test
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
};
