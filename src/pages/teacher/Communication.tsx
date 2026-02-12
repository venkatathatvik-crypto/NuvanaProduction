import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, Users, Shield, Smartphone, ArrowLeft, Loader2, Clock, History, Check, CheckCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/auth/AuthContext";
import { getTeacherClasses } from "@/services/classService";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getStudentsByClass, type StudentAttendance } from "@/services/index";
import { FlattenedClass } from "@/schemas/academic";
import { messagesService, type Message } from "@/services/messagesService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { whatsappApi, type WhatsappMessage } from "@/services/whatsappApiService";

const TeacherCommunication = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<FlattenedClass[]>([]);
    const [classesLoading, setClassesLoading] = useState(true);
    const [adminId, setAdminId] = useState<string>('');

    // Form states
    const [adminSubject, setAdminSubject] = useState('');
    const [adminMessage, setAdminMessage] = useState('');
    const [parentClass, setParentClass] = useState('');
    const [parentMessage, setParentMessage] = useState('');
    const [recipientType, setRecipientType] = useState<'class' | 'individual'>('class');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);

    // WhatsApp Broadcast History from Backend
    const { data: broadcastHistory = [], isLoading: historyLoading } = useQuery({
        queryKey: ['whatsapp-history', profile?.school_id],
        queryFn: () => profile?.school_id ? whatsappApi.getHistory(profile.school_id) : [],
        enabled: !!profile?.school_id,
        refetchInterval: 10000, // Poll every 10 seconds for status updates
    });

    // Fetch admin ID
    useEffect(() => {
        const fetchAdmin = async () => {
            if (!profile?.school_id) return;
            try {
                const users = await userService.getUsers();
                const admin = users.find((u: any) => u.role_id === 2 && u.school_id === profile.school_id);
                if (admin) {
                    setAdminId(admin.id);
                }
            } catch (error) {
                console.error("Error fetching admin:", error);
            }
        };
        fetchAdmin();
    }, [profile]);

    // Fetch conversation with admin
    const { data: conversation, isLoading: conversationLoading } = useQuery({
        queryKey: ['messages-conversation', adminId],
        queryFn: () => adminId ? messagesService.getConversation(adminId) : null,
        enabled: !!adminId,
    });

    // Fetch teacher classes
    useEffect(() => {
        const fetchClasses = async () => {
            if (profileLoading || !profile) {
                setClassesLoading(false);
                return;
            }

            try {
                setClassesLoading(true);
                const teacherClasses = await getTeacherClasses(profile.id, profile.school_id);
                setClasses(teacherClasses);
            } catch (error) {
                console.error("Error fetching teacher classes:", error);
                toast.error("Failed to load classes");
            } finally {
                setClassesLoading(false);
            }
        };

        fetchClasses();
    }, [profile, profileLoading]);

    // Fetch students when class changes and individual is selected
    useEffect(() => {
        const fetchStudents = async () => {
            if (!parentClass || recipientType === 'class') {
                setStudents([]);
                return;
            }

            try {
                setStudentsLoading(true);
                const classStudents = await getStudentsByClass(parentClass);
                setStudents(classStudents);
            } catch (error) {
                console.error("Error fetching students:", error);
                toast.error("Failed to load students");
            } finally {
                setStudentsLoading(false);
            }
        };

        fetchStudents();
    }, [parentClass, recipientType]);

    const handleSendToAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!adminId) {
            toast.error("Admin not found");
            return;
        }

        setLoading(true);
        try {
            await messagesService.sendMessage({
                recipientId: adminId,
                subject: adminSubject,
                message: adminMessage,
                isUrgent: false,
            });
            
            toast.success("Message sent to Admin successfully!");
            setAdminSubject('');
            setAdminMessage('');
            
            // Invalidate queries to refresh conversation
            queryClient.invalidateQueries({ queryKey: ['messages-conversation', adminId] });
            queryClient.invalidateQueries({ queryKey: ['messages-conversations'] });
        } catch (error: any) {
            console.error("Error sending message:", error);
            toast.error(error.message || "Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    const handleSendToParents = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!parentClass) {
            toast.error("Please select a class");
            return;
        }

        setLoading(true);
        try {
            let recipients: Array<{ phoneNumber: string; recipientId: string }> = [];

            if (recipientType === 'individual') {
                if (!selectedStudentId) {
                    toast.error("Please select a student");
                    setLoading(false);
                    return;
                }
                const recipient = await whatsappApi.getStudentRecipient(selectedStudentId);
                if (recipient) {
                    await whatsappApi.sendTextMessage({
                        phoneNumber: recipient.phoneNumber,
                        message: parentMessage,
                        senderId: profile?.id || 'test-sender',
                        schoolId: profile?.school_id || 'test-school',
                    });
                } else {
                    toast.error("This student does not have a registered parent contact number.");
                    setLoading(false);
                    return;
                }
            } else {
                const classRecipients = await whatsappApi.getClassRecipients(parentClass);
                const recipients = classRecipients.map(r => ({ phoneNumber: r.phoneNumber, recipientId: r.recipientId }));
                
                if (recipients.length === 0) {
                    toast.error("No valid parent contacts found for selection");
                    setLoading(false);
                    return;
                }

                await whatsappApi.sendBroadcast({
                    recipients,
                    templateName: 'hello_world', // Phase 1: Using test template
                    languageCode: 'en_US',
                    schoolId: profile?.school_id || 'test-school',
                    senderId: profile?.id || 'test-sender',
                });
            }

            toast.success(recipientType === 'class' 
                ? `WhatsApp broadcast initiated`
                : `WhatsApp message sent to student's parent`
            );
            
            setParentMessage('');
            if (recipientType === 'individual') {
                setSelectedStudentId('');
            }
            
            // Invalidate history query
            queryClient.invalidateQueries({ queryKey: ['whatsapp-history'] });
        } catch (error: any) {
            console.error("Error sending WhatsApp broadcast:", error);
            toast.error(error.message || "Failed to send WhatsApp message");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 relative overflow-hidden">
            {/* Background elements similar to dashboard */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto space-y-6 relative z-10"
            >
                <div className="flex items-center gap-2 sm:gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/teacher")}
                        className="shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </Button>
                    <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/20">
                        <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                            Communication Hub
                        </h1>
                        <p className="text-muted-foreground">Connect with Admins and Parents seamlessly</p>
                    </div>
                </div>

                <Tabs defaultValue="send" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-8">
                        <TabsTrigger value="send" className="gap-2">
                            <Shield className="w-4 h-4" /> Admin Connect
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <Clock className="w-4 h-4" /> Message History
                        </TabsTrigger>
                        <TabsTrigger value="parents" className="gap-2">
                            <Users className="w-4 h-4" /> Parent Connect
                        </TabsTrigger>
                    </TabsList>

                    {/* Send Message Tab */}
                    <TabsContent value="send">
                        <Card className="glass-card border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-primary" />
                                    Contact Administration
                                </CardTitle>
                                <CardDescription>
                                    Send official requests, feedback, or report issues directly to the school admin.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendToAdmin} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Subject</label>
                                        <Input
                                            placeholder="e.g., Leave Request, Resource Requirement"
                                            value={adminSubject}
                                            onChange={(e) => setAdminSubject(e.target.value)}
                                            required
                                            className="bg-secondary/50 border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Message</label>
                                        <Textarea
                                            placeholder="Type your message here..."
                                            className="min-h-[150px] bg-secondary/50 border-white/10"
                                            value={adminMessage}
                                            onChange={(e) => setAdminMessage(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={loading || !adminId} className="w-full sm:w-auto">
                                        {loading ? "Sending..." : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> Send to Admin
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Message History Tab */}
                    <TabsContent value="history">
                        <Card className="glass-card border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    Conversation with Admin
                                </CardTitle>
                                <CardDescription>
                                    View your message history and admin replies
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {conversationLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : !conversation || conversation.messages.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No messages yet</p>
                                        <p className="text-sm">Send your first message to admin in the "Admin Connect" tab</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Messages Container */}
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
                                            {conversation.messages.map((msg: Message) => (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`max-w-[80%] ${msg.isFromMe ? 'order-2' : 'order-1'}`}>
                                                        {/* Sender Badge */}
                                                        <div className={`flex items-center gap-2 mb-2 ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>
                                                            {!msg.isFromMe && <Shield className="w-4 h-4 text-amber-500" />}
                                                            <span className={`text-xs font-semibold ${msg.isFromMe ? 'text-blue-400' : 'text-amber-400'}`}>
                                                                {msg.isFromMe ? 'You (Teacher)' : `${conversation.otherUser.name} (Admin)`}
                                                            </span>
                                                            {msg.isFromMe && <User className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                        
                                                        {/* Message Bubble */}
                                                        <div
                                                            className={`p-4 rounded-2xl shadow-lg ${
                                                                msg.isFromMe
                                                                    ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-tr-sm'
                                                                    : 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-tl-sm'
                                                            }`}
                                                        >
                                                            {/* Subject */}
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <p className={`font-bold text-sm ${msg.isFromMe ? 'text-blue-300' : 'text-amber-300'}`}>
                                                                    {msg.subject}
                                                                </p>
                                                                {msg.isUrgent && (
                                                                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                                                        URGENT
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Message Content */}
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                                                {msg.message}
                                                            </p>
                                                            
                                                            {/* Timestamp */}
                                                            <div className={`flex items-center gap-1 mt-3 ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>
                                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                                    {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quick Reply Section */}
                                        <div className="border-t border-white/10 pt-4">
                                            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                Need to send a new message? Go to the <span className="font-semibold text-primary">"Admin Connect"</span> tab
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Parent Connect Tab */}
                    <TabsContent value="parents">
                        <Card className="glass-card border-green-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-green-500" />
                                    WhatsApp Broadcast
                                </CardTitle>
                                <CardDescription>
                                    Send announcements directly to parents' WhatsApp numbers via our automated bot.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendToParents} className="space-y-4">
                                    <div className="space-y-4 bg-secondary/20 p-4 rounded-xl border border-white/5">
                                        <label className="text-sm font-medium">Send To</label>
                                        <RadioGroup 
                                            defaultValue="class" 
                                            value={recipientType}
                                            onValueChange={(val: any) => setRecipientType(val)}
                                            className="flex flex-col sm:flex-row gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="class" id="class-recipient" />
                                                <Label htmlFor="class-recipient" className="cursor-pointer">Whole Class</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="individual" id="individual-recipient" />
                                                <Label htmlFor="individual-recipient" className="cursor-pointer">Specific Student/Parent</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Select Class</label>
                                            <Select onValueChange={setParentClass} value={parentClass} required disabled={classesLoading}>
                                                <SelectTrigger className="bg-secondary/50 border-white/10">
                                                    <SelectValue placeholder={classesLoading ? "Loading classes..." : "Choose a class group"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classesLoading ? (
                                                        <div className="flex items-center justify-center p-4">
                                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                        </div>
                                                    ) : classes.length === 0 ? (
                                                        <div className="p-4 text-sm text-muted-foreground text-center">
                                                            No classes assigned
                                                        </div>
                                                    ) : (
                                                        classes.map((cls) => (
                                                            <SelectItem key={cls.class_id} value={cls.class_id}>
                                                                {cls.class_name} {cls.grade_name && `(${cls.grade_name})`}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {recipientType === 'individual' && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Select Student</label>
                                                <Select 
                                                    onValueChange={setSelectedStudentId} 
                                                    value={selectedStudentId} 
                                                    required 
                                                    disabled={!parentClass || studentsLoading}
                                                >
                                                    <SelectTrigger className="bg-secondary/50 border-white/10">
                                                        <SelectValue placeholder={!parentClass ? "Select a class first" : (studentsLoading ? "Loading students..." : "Choose a student")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {students.map((student) => (
                                                            <SelectItem key={student.id} value={student.id}>
                                                                {student.name} ({student.roll_number})
                                                            </SelectItem>
                                                        ))}
                                                        {students.length === 0 && !studentsLoading && parentClass && (
                                                            <div className="p-2 text-sm text-muted-foreground text-center italic">
                                                                No students found in this class
                                                            </div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    {classes.length === 0 && !classesLoading && (
                                        <p className="text-xs text-muted-foreground">
                                            You don't have any classes assigned. Contact admin to get assigned to classes.
                                        </p>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Announcement Message</label>
                                        <Textarea
                                            placeholder="Dear Parents, regarding upcoming assignments..."
                                            className="min-h-[150px] bg-secondary/50 border-white/10"
                                            value={parentMessage}
                                            onChange={(e) => setParentMessage(e.target.value)}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            * This message will be sent to all verified parent numbers for the selected class.
                                        </p>
                                    </div>
                                    <Button type="submit" disabled={loading} className={`w-full sm:w-auto shadow-lg ${
                                        recipientType === 'class' 
                                            ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' 
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                                    } text-white`}>
                                        {loading ? "Processing..." : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> 
                                                {recipientType === 'class' ? "Broadcast via WhatsApp" : "Send Private WhatsApp Message"}
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {historyLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : broadcastHistory.length > 0 ? (
                                    <div className="mt-12 space-y-6">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                <History className="w-6 h-6 text-primary" />
                                                Broadcast History
                                            </h3>
                                        </div>
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {broadcastHistory.map((item: WhatsappMessage) => (
                                                <motion.div 
                                                    key={item.id} 
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl relative group overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="relative z-10">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase text-[10px]">
                                                                        {item.phone_number}
                                                                    </Badge>
                                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {item.status === 'SENT' && (
                                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        <Check className="w-3 h-3" /> Sent
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'DELIVERED' && (
                                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        <CheckCheck className="w-3 h-3" /> Delivered
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'READ' && (
                                                                    <Badge variant="outline" className="bg-blue-400/10 text-blue-400 border-blue-400/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        <CheckCheck className="w-3 h-3" /> Read
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'FAILED' && (
                                                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        Failed
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{item.message_text}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No broadcast history found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
};

export default TeacherCommunication;
