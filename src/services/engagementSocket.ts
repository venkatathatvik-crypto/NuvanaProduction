import { io, Socket } from 'socket.io-client';

class EngagementSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(userId: string, userRole: 'student' | 'teacher') {
    if (this.socket?.connected) {
      return this.socket;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    
    this.socket = io(`${backendUrl}/engagement`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to engagement socket');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from engagement socket');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Student joins a class room
  joinClass(classId: string, studentId: string, studentName: string) {
    if (!this.socket) return;
    
    this.socket.emit('join:class', {
      classId,
      studentId,
      studentName,
    });
  }

  // Teacher joins a session room
  joinSession(sessionId: string, teacherId: string) {
    if (!this.socket) return;
    
    this.socket.emit('join:session', {
      sessionId,
      teacherId,
    });
  }

  // Teacher sends a question
  sendQuestion(questionData: any, callback?: (response: any) => void) {
    if (!this.socket) return;
    
    this.socket.emit('question:send', questionData, callback);
  }

  // Student submits a response
  submitResponse(responseData: any, callback?: (response: any) => void) {
    if (!this.socket) return;
    
    this.socket.emit('response:submit', responseData, callback);
  }

  // End session
  endSession(sessionId: string, callback?: (response: any) => void) {
    if (!this.socket) return;
    
    this.socket.emit('session:end', { sessionId }, callback);
  }

  // Send a live reaction
  sendReaction(reactionData: { sessionId: string; emoji: string; studentName: string }) {
    if (!this.socket) return;
    this.socket.emit('reaction:send', reactionData);
  }

  // Listen for new questions
  onNewQuestion(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('question:new', callback);
    
    // Store listener for cleanup
    if (!this.listeners.has('question:new')) {
      this.listeners.set('question:new', new Set());
    }
    this.listeners.get('question:new')!.add(callback);
  }

  // Listen for question expiration
  onQuestionExpired(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('question:expired', callback);
    
    if (!this.listeners.has('question:expired')) {
      this.listeners.set('question:expired', new Set());
    }
    this.listeners.get('question:expired')!.add(callback);
  }

  // Listen for response result
  onResponseResult(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('response:result', callback);
    
    if (!this.listeners.has('response:result')) {
      this.listeners.set('response:result', new Set());
    }
    this.listeners.get('response:result')!.add(callback);
  }

  // Listen for responses (teacher dashboard)
  onResponseReceived(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('response:received', callback);
    
    if (!this.listeners.has('response:received')) {
      this.listeners.set('response:received', new Set());
    }
    this.listeners.get('response:received')!.add(callback);
  }

  // Listen for session end
  onSessionEnded(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('session:ended', callback);
    
    if (!this.listeners.has('session:ended')) {
      this.listeners.set('session:ended', new Set());
    }
    this.listeners.get('session:ended')!.add(callback);
  }

  // Listen for live reactions
  onReactionReceived(callback: (data: any) => void) {
    if (!this.socket) return;
    
    this.socket.on('reaction:received', callback);
    
    if (!this.listeners.has('reaction:received')) {
      this.listeners.set('reaction:received', new Set());
    }
    this.listeners.get('reaction:received')!.add(callback);
  }

  // Remove specific listener
  off(event: string, callback: Function) {
    if (!this.socket) return;
    
    this.socket.off(event, callback as any);
    
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event?: string) {
    if (!this.socket) return;
    
    if (event) {
      this.socket.off(event);
      this.listeners.delete(event);
    } else {
      this.socket.removeAllListeners();
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const engagementSocket = new EngagementSocketService();
