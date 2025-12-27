import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, ArrowLeft, Loader2, Mail, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { messagesService, type Conversation, type Message } from "@/services/messagesService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export default function AdminMessages() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch all conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['messages-conversations'],
    queryFn: () => messagesService.getConversations(),
    enabled: !!profile,
  });

  // Fetch selected conversation details
  const { data: conversationDetail, isLoading: conversationLoading } = useQuery({
    queryKey: ['messages-conversation', selectedConversation?.userId],
    queryFn: () => selectedConversation ? messagesService.getConversation(selectedConversation.userId) : null,
    enabled: !!selectedConversation,
  });

  const handleSendReply = async () => {
    if (!selectedConversation || !replyMessage.trim()) return;

    setSending(true);
    try {
      await messagesService.sendMessage({
        recipientId: selectedConversation.userId,
        subject: `Re: ${conversationDetail?.messages[conversationDetail.messages.length - 1]?.subject || 'Message'}`,
        message: replyMessage,
        isUrgent: false,
      });

      toast.success("Reply sent successfully!");
      setReplyMessage("");

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['messages-conversation', selectedConversation.userId] });
      queryClient.invalidateQueries({ queryKey: ['messages-conversations'] });
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);

    // Mark unread messages as read
    if (conv.unreadCount > 0 && conversationDetail) {
      const unreadMessages = conversationDetail.messages.filter(
        (msg: Message) => !msg.isFromMe && !msg.isRead
      );
      
      for (const msg of unreadMessages) {
        try {
          await messagesService.markAsRead(msg.id);
        } catch (error) {
          console.error("Error marking message as read:", error);
        }
      }

      // Refresh conversations to update unread count
      queryClient.invalidateQueries({ queryKey: ['messages-conversations'] });
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
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
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Messages</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Communicate with teachers
            </p>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Conversations List */}
          <Card className="glass-card lg:col-span-1">
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
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-secondary/50 ${
                        selectedConversation?.userId === conv.userId
                          ? 'bg-primary/10 border-primary/50'
                          : 'bg-secondary/20 border-border/50'
                      }`}
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

          {/* Conversation Detail */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedConversation ? (
                  <>
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Conversation with {selectedConversation.userName}
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    Select a conversation
                  </>
                )}
              </CardTitle>
              {selectedConversation && (
                <CardDescription>{selectedConversation.userEmail}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!selectedConversation ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              ) : conversationLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Messages */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto p-2">
                    {conversationDetail?.messages.map((msg: Message) => (
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
                              {msg.isFromMe ? 'You (Admin)' : selectedConversation.userName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                            </p>
                          </div>
                          {msg.isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm mb-1">{msg.subject}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <div className="border-t pt-4 space-y-3">
                    <label className="text-sm font-medium">Reply</label>
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-[100px] bg-secondary/50 border-white/10"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={sending || !replyMessage.trim()}
                      className="w-full sm:w-auto"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
