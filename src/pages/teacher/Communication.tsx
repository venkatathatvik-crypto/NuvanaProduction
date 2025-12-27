import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, Users, Shield, Smartphone, ArrowLeft, Loader2, Clock, History, Check, CheckCheck } from 'lucide-react';
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
import { FlattenedClass } from "@/schemas/academic";
import { messagesService, type Message } from "@/services/messagesService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

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

    // Simulated WhatsApp Broadcast History
    const [parentBroadcastHistory, setParentBroadcastHistory] = useState<any[]>(() => {
        const saved = localStorage.getItem('parent_broadcast_history');
        return saved ? JSON.parse(saved) : [
            { id: '1', className: 'Class 10A', message: 'Annual Sports Day scheduled for next Friday.', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'read' },
            { id: '2', className: 'Science 10A', message: 'Reminder: Lab reports due tomorrow.', date: new Date(Date.now() - 3600000).toISOString(), status: 'delivered' }
        ];
    });

    useEffect(() => {
        localStorage.setItem('parent_broadcast_history', JSON.stringify(parentBroadcastHistory));
    }, [parentBroadcastHistory]);

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
        setLoading(true);
        // Simulate API call to WhatsApp bot service
        await new Promise(resolve => setTimeout(resolve, 2000));
        const selectedClass = classes.find(c => c.class_id === parentClass);
        const className = selectedClass ? selectedClass.class_name : parentClass;
        
        const newMessage = {
            id: Date.now().toString(),
            className,
            message: parentMessage,
            date: new Date().toISOString(),
            status: 'sent'
        };
        
        setParentBroadcastHistory([newMessage, ...parentBroadcastHistory]);
        
        toast.success(`WhatsApp message scheduled for parents of ${className}`);
        setParentClass('');
        setParentMessage('');
        setLoading(false);

        // Simulate delivery/read status updates
        setTimeout(() => {
            setParentBroadcastHistory(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
        }, 5000);
        
        setTimeout(() => {
            setParentBroadcastHistory(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'read' } : m));
        }, 12000);
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
                            <Shield className="w-4 h-4" /> Send Message
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
                                                <Send className="w-4 h-4 mr-2" /> Send Message
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
                                        <p className="text-sm">Send your first message to admin</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                        {conversation.messages.map((msg: Message) => (
                                            <div
                                                key={msg.id}
                                                className={`p-4 rounded-lg border ${
                                                    msg.isFromMe
                                                        ? 'bg-primary/10 border-primary/20 ml-8'
                                                        : 'bg-secondary/20 border-border/50 mr-8'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="font-semibold text-sm">
                                                            {msg.isFromMe ? 'You' : conversation.otherUser.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    {msg.isUrgent && (
                                                        <span className="text-xs bg-red-500/20 text-red-500 px-2 py-1 rounded">
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-sm mb-1">{msg.subject}</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                    {msg.message}
                                                </p>
                                            </div>
                                        ))}
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
                                        {classes.length === 0 && !classesLoading && (
                                            <p className="text-xs text-muted-foreground">
                                                You don't have any classes assigned. Contact admin to get assigned to classes.
                                            </p>
                                        )}
                                    </div>
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
                                    <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                                        {loading ? "Processing..." : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> Broadcast via WhatsApp
                                            </>
                                        )}
                                    </Button>
                                </form>

                                {/* Broadcast History */}
                                {parentBroadcastHistory.length > 0 && (
                                    <div className="mt-12 space-y-6">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                <History className="w-6 h-6 text-primary" />
                                                Broadcast History
                                            </h3>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => {
                                                    setParentBroadcastHistory([]);
                                                    localStorage.removeItem('parent_broadcast_history');
                                                }}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                Clear History
                                            </Button>
                                        </div>
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {parentBroadcastHistory.map((item) => (
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
                                                                        {item.className}
                                                                    </Badge>
                                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {item.status === 'sent' && (
                                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        <Check className="w-3 h-3" /> Sent
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'delivered' && (
                                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        <CheckCheck className="w-3 h-3" /> Delivered
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'read' && (
                                                                    <Badge variant="outline" className="bg-blue-400/10 text-blue-400 border-blue-400/20 text-[10px] uppercase font-bold px-2 py-0.5 flex items-center gap-1.5">
                                                                        <CheckCheck className="w-3 h-3" /> Read
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
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
