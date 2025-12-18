import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Send, Users, Shield, Smartphone, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TeacherCommunication = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form states
    const [adminSubject, setAdminSubject] = useState('');
    const [adminMessage, setAdminMessage] = useState('');
    const [parentClass, setParentClass] = useState('');
    const [parentMessage, setParentMessage] = useState('');

    const handleSendToAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success("Message sent to Admin successfully!");
        setAdminSubject('');
        setAdminMessage('');
        setLoading(false);
    };

    const handleSendToParents = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call to WhatsApp bot service
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success(`WhatsApp message scheduled for parents of Class ${parentClass}`);
        setParentClass('');
        setParentMessage('');
        setLoading(false);
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

                <Tabs defaultValue="admin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-8">
                        <TabsTrigger value="admin" className="gap-2">
                            <Shield className="w-4 h-4" /> Admin Support
                        </TabsTrigger>
                        <TabsTrigger value="parents" className="gap-2">
                            <Users className="w-4 h-4" /> Parent Connect
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="admin">
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
                                    <Button type="submit" disabled={loading} className="w-full sm:w-auto">
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
                                        <Select onValueChange={setParentClass} value={parentClass} required>
                                            <SelectTrigger className="bg-secondary/50 border-white/10">
                                                <SelectValue placeholder="Choose a class group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10-A">Class 10-A</SelectItem>
                                                <SelectItem value="10-B">Class 10-B</SelectItem>
                                                <SelectItem value="9-A">Class 9-A</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                    <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                                        {loading ? "Processing..." : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" /> Broadcast via WhatsApp
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
};

export default TeacherCommunication;
