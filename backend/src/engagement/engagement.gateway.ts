import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { SendQuestionDto } from './dto/send-question.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      process.env.FRONTEND_URL || '*',
    ],
    credentials: true,
  },
  namespace: '/engagement',
})
export class EngagementGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EngagementGateway');
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private engagementService: EngagementService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from userSockets
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  // Student joins a class room
  @SubscribeMessage('join:class')
  async handleJoinClass(
    @MessageBody() rawData: any,
    @ConnectedSocket() client: Socket,
  ) {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const { classId, studentId, studentName } = data;
    
    // Join the class room
    await client.join(`class:${classId}`);
    this.userSockets.set(studentId, client.id);
    
    this.logger.log(`Student ${studentName} (${studentId}) joined class ${classId}`);
    
    // Check if there's an active session with pending questions
    const activeSession = await this.engagementService.getActiveSessionForClass(classId);
    
    if (activeSession && activeSession.pop_questions.length > 0) {
      const latestQuestion = activeSession.pop_questions[0];
      
      // Send the active question to the newly joined student
      client.emit('question:new', {
        questionId: latestQuestion.id,
        questionText: latestQuestion.question_text,
        options: {
          A: latestQuestion.option_a,
          B: latestQuestion.option_b,
          C: latestQuestion.option_c,
          D: latestQuestion.option_d,
        },
        timeLimit: latestQuestion.time_limit_seconds,
        points: latestQuestion.points,
        expiresAt: latestQuestion.expires_at,
        sessionId: activeSession.id,
      });
    }
    
    return { success: true, message: 'Joined class room' };
  }

  // Teacher sends a question
  @SubscribeMessage('question:send')
  async handleSendQuestion(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Handle potential array payoff [dto, callback]
      const dto: SendQuestionDto = Array.isArray(data) ? data[0] : data;
      this.logger.log(`[DEBUG] question:send DTO: ${JSON.stringify(dto)}`);
      
      const question = await this.engagementService.sendQuestion(dto);
      
      // Get session to find class_id
      const session = await this.engagementService.getSession(dto.session_id);
      
      // Broadcast question to all students in the class
      this.server.to(`class:${session.class_id}`).emit('question:new', {
        questionId: question.id,
        questionText: question.question_text,
        options: {
          A: question.option_a,
          B: question.option_b,
          C: question.option_c,
          D: question.option_d,
        },
        timeLimit: question.time_limit_seconds,
        points: question.points,
        expiresAt: question.expires_at,
        sessionId: dto.session_id,
      });
      
      this.logger.log(`Question sent to class ${session.class_id}`);
      
      // Schedule question expiration
      setTimeout(() => {
        this.server.to(`class:${session.class_id}`).emit('question:expired', {
          questionId: question.id,
        });
        this.logger.log(`Question ${question.id} expired`);
      }, dto.time_limit_seconds * 1000);
      
      return { success: true, question };
    } catch (error) {
      this.logger.error('Error sending question:', error);
      return { success: false, error: error.message };
    }
  }

  // Student submits a response
  @SubscribeMessage('response:submit')
  async handleSubmitResponse(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Handle potential array payoff [dto, callback]
      const dto: SubmitResponseDto = Array.isArray(data) ? data[0] : data;
      
      // Debug log to see what's being received
      this.logger.log(`[DEBUG] Raw DTO received: ${JSON.stringify(dto)}`);
      
      const response = await this.engagementService.submitResponse(dto);
      
      // Send result back to the student
      client.emit('response:result', {
        isCorrect: response.is_correct,
        correctOption: response.correct_option,
        pointsEarned: response.points_earned,
      });
      
      // Notify teacher about the response
      // Emit to teacher's dashboard (they should join room `session:${sessionId}`)
      const sessionId = (response as any).pop_questions?.session_id;
      const studentName = (response as any).profiles?.name || 'Unknown Student';
      
      if (sessionId) {
        this.server.to(`session:${sessionId}`).emit('response:received', {
          studentId: response.student_id,
          studentName: studentName,
          isCorrect: response.is_correct,
          responseTime: response.response_time_ms,
          selectedOption: response.selected_option,
        });
      }
      
      this.logger.log(`Response received from student ${response.student_id}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error('Error submitting response:', error);
      return { success: false, error: error.message };
    }
  }

  // Teacher joins session room (for real-time dashboard updates)
  @SubscribeMessage('join:session')
  async handleJoinSession(
    @MessageBody() rawData: any,
    @ConnectedSocket() client: Socket,
  ) {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const { sessionId, teacherId } = data;
    
    await client.join(`session:${sessionId}`);
    this.userSockets.set(teacherId, client.id);
    
    this.logger.log(`Teacher ${teacherId} joined session ${sessionId}`);
    
    return { success: true, message: 'Joined session room' };
  }

  // End session
  @SubscribeMessage('session:end')
  async handleEndSession(
    @MessageBody() rawData: any,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const data = Array.isArray(rawData) ? rawData[0] : rawData;
      const session = await this.engagementService.endSession(data.sessionId);
      
      // Notify all students in the class
      this.server.to(`class:${session.class_id}`).emit('session:ended', {
        sessionId: session.id,
      });
      
      this.logger.log(`Session ${session.id} ended`);
      
      return { success: true, session };
    } catch (error) {
      this.logger.error('Error ending session:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle live reactions (floating emojis)
  @SubscribeMessage('reaction:send')
  async handleSendReaction(
    @MessageBody() rawData: any,
    @ConnectedSocket() client: Socket,
  ) {
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const { sessionId, emoji, studentName } = data;

    // Broadcast reaction only to the session room (teacher's dashboard)
    this.server.to(`session:${sessionId}`).emit('reaction:received', {
      emoji,
      studentName,
      id: Math.random().toString(36).substring(7), // Unique ID for animations
    });

    return { success: true };
  }
}
