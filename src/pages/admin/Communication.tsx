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
import { messagesService, type Message, type Conversation } from "@/services/messagesService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { whatsappApi, type WhatsappMessage } from "@/services/whatsappApiService";
import { getClasses } from "@/services/classService";
import { FlattenedClass } from "@/schemas/academic";

const AdminCommunication = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [teachersLoading, setTeachersLoading] = useState(true);
    const [classes, setClasses] = useState<FlattenedClass[]>([]);
    const [classesLoading, setClassesLoading] = useState(true);

    // Form states for new message to teacher
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [teacherSubject, setTeacherSubject] = useState('');
    const [teacherMessage, setTeacherMessage] = useState('');

    // Form states for parent broadcast
    const [parentClass, setParentClass] = useState('');
    const [parentMessage, setParentMessage] = useState('');

    // WhatsApp Broadcast History from Backend
    const { data: broadcastHistory = [], isLoading: historyLoading } = useQuery({
        queryKey: ['whatsapp-history', profile?.school_id],
        queryFn: () => profile?.school_id ? whatsappApi.getHistory(profile.school_id) : [],
        enabled: !!profile?.school_id,
        refetchInterval: 10000,
    });

    // Fetch all conversations
    const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
        queryKey: ['messages-conversations'],
        queryFn: () => messagesService.getConversations(),
        enabled: !!profile,
    });

    // Fetch teachers
    useEffect(() => {
        const fetchTeachers = async () => {
            if (profileLoading || !profile) {
                setTeachersLoading(false);
                return;
            }

            try {
                setTeachersLoading(true);
                const users = await userService.getUsers();
                const teacherUsers = users.filter((u: any) => u.role_id === 3 && u.school_id === profile.school_id);
                setTeachers(teacherUsers);
            } catch (error) {
                console.error("Error fetching teachers:", error);
                toast.error("Failed to load teachers");
            } finally {
                setTeachersLoading(false);
            }
        };

        fetchTeachers();
    }, [profile, profileLoading]);

    // Fetch classes
    useEffect(() => {
        const fetchClassesList = async () => {
            if (profileLoading || !profile) {
                setClassesLoading(false);
                return;
            }

            try {
                setClassesLoading(true);
                const schoolClasses = await getClasses(profile.school_id);
                setClasses(schoolClasses);
            } catch (error) {
                console.error("Error fetching classes:", error);
                toast.error("Failed to load classes");
            } finally {
                setClassesLoading(false);
            }
        };

        fetchClassesList();
    }, [profile, profileLoading]);

    const handleSendToTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedTeacher) {
            toast.error("Please select a teacher");
            return;
        }

        setLoading(true);
        try {
            await messagesService.sendMessage({
                recipientId: selectedTeacher,
                subject: teacherSubject,
                message: teacherMessage,
                isUrgent: false,
            });
            
            toast.success("Message sent to teacher successfully!");
            setSelectedTeacher('');
            setTeacherSubject('');
            setTeacherMessage('');
            
            // Invalidate queries to refresh
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
            const classRecipients = await whatsappApi.getClassRecipients(parentClass);
            const recipients = classRecipients.map(r => ({ phoneNumber: r.phoneNumber, recipientId: r.recipientId }));

            if (recipients.length === 0) {
                toast.error("No valid parent contacts found for this class");
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

            toast.success(`WhatsApp broadcast initiated for ${recipients.length} parents`);
            setParentClass('');
            setParentMessage('');
            
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
            {/* Background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto space-y-6 relative z-10"
            >
                <div className="flex items-center gap-2 sm:gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/admin")}
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
                        <p className="text-muted-foreground">Connect with Teachers and Parents</p>
                    </div>
                </div>

                <Tabs defaultValue="inbox" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-8">
                        <TabsTrigger value="inbox" className="gap-2">
                            <Mail className="w-4 h-4" /> Inbox
                        </TabsTrigger>
                        <TabsTrigger value="send" className="gap-2">
                            <Shield className="w-4 h-4" /> Message Teacher
                        </TabsTrigger>
                        <TabsTrigger value="parents" className="gap-2">
                            <Users className="w-4 h-4" /> Parent Broadcast
                        </TabsTrigger>
                    </TabsList>

                    {/* Inbox Tab - View messages from teachers */}
                    <TabsContent value="inbox">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Conversations List */}
                            <Card className="glass-card border-primary/20 lg:col-span-1">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                        Conversations
                                    </CardTitle>
                                    <CardDescription>
                                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {conversationsLoading ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : conversations.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>No messages yet</p>
                                            <p className="text-sm">Teachers can send you messages</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                            {conversations.map((conv: Conversation) => (
                                                <div
                                                    key={conv.userId}
                                                    className="p-3 rounded-lg border bg-secondary/20 border-border/50 cursor-pointer transition-all hover:bg-secondary/50"
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4 text-muted-foreground" />
                                                            <p className="font-semibold text-sm">{conv.userName}</p>
                                                        </div>
                                                        {conv.unreadCount > 0 && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                {conv.unreadCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate mb-1">
                                                        {conv.lastMessage}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Info Card */}
                            <Card className="glass-card border-primary/20 lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                        Message Management
                                    </CardTitle>
                                    <CardDescription>
                                        View and respond to teacher messages
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p className="text-lg mb-2">Select a conversation to view details</p>
                                        <p className="text-sm">
                                            Click on a conversation from the list to read and reply to messages
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() => navigate("/admin/messages")}
                                        >
                                            <Mail className="w-4 h-4 mr-2" />
                                            Go to Full Messages View
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Send Message to Teacher Tab */}
                    <TabsContent value="send">
                        <Card className="glass-card border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-primary" />
                                    Send Message to Teacher
                                </CardTitle>
                                <CardDescription>
                                    Send announcements, instructions, or feedback to teachers
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendToTeacher} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Select Teacher</label>
                                        <Select onValueChange={setSelectedTeacher} value={selectedTeacher} required disabled={teachersLoading}>
                                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                                <SelectValue placeholder={teachersLoading ? "Loading teachers..." : "Choose a teacher"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teachersLoading ? (
                                                    <div className="flex items-center justify-center p-4">
                                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : teachers.length === 0 ? (
                                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                                        No teachers found
                                                    </div>
                                                ) : (
                                                    teachers.map((teacher) => (
                                                        <SelectItem key={teacher.id} value={teacher.id}>
                                                            {teacher.name} ({teacher.email})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Subject</label>
                                        <Input
                                            placeholder="e.g., Important Announcement, Feedback"
                                            value={teacherSubject}
                                            onChange={(e) => setTeacherSubject(e.target.value)}
                                            required
                                            className="bg-secondary/50 border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Message</label>
                                        <Textarea
                                            placeholder="Type your message here..."
                                            className="min-h-[150px] bg-secondary/50 border-white/10"
                                            value={teacherMessage}
                                            onChange={(e) => setTeacherMessage(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={loading || !selectedTeacher} className="w-full sm:w-auto">
                                        {loading ? "Sending..." : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Parent Broadcast Tab */}
                    <TabsContent value="parents">
                        <Card className="glass-card border-green-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone className="w-5 h-5 text-green-500" />
                                    WhatsApp Parent Broadcast
                                </CardTitle>
                                <CardDescription>
                                    Send school-wide announcements to parents via WhatsApp
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSendToParents} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Select Class</label>
                                        <Select onValueChange={setParentClass} value={parentClass} required disabled={classesLoading}>
                                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                                <SelectValue placeholder={classesLoading ? "Loading classes..." : "Choose a class"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classesLoading ? (
                                                    <div className="flex items-center justify-center p-4">
                                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : classes.length === 0 ? (
                                                    <div className="p-4 text-sm text-muted-foreground text-center">
                                                        No classes found
                                                    </div>
                                                ) : (
                                                    classes.map((cls) => (
                                                        <SelectItem key={cls.class_id} value={cls.class_id}>
                                                            {cls.class_name} ({cls.grade_name})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Announcement Message</label>
                                        <Textarea
                                            placeholder="Dear Parents, we would like to inform you that..."
                                            className="min-h-[150px] bg-secondary/50 border-white/10"
                                            value={parentMessage}
                                            onChange={(e) => setParentMessage(e.target.value)}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            * This message will be sent to all verified parent numbers for the selected class.
                                        </p>
                                    </div>
                                    <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                                        {loading ? "Processing..." : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> Broadcast via WhatsApp
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

export default AdminCommunication;
