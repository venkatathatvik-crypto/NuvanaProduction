import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // Default BullMQ Options for network reliability
  private readonly defaultJobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true,
  };

  constructor(
    @InjectQueue('email-queue') private readonly emailQueue: Queue
  ) {}

  /**
   * Send a welcome email with initial credentials
   */
  async sendWelcomeEmail(user: { email: string; name: string }, defaultPassword?: string, loginUrl?: string) {
    try {
      await this.emailQueue.add('send-welcome', {
        user,
        defaultPassword,
        loginUrl: loginUrl || process.env.FRONTEND_URL || 'http://localhost:4173'
      }, this.defaultJobOptions);
      this.logger.log(`Queued welcome email for ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue welcome email for ${user.email}`, error.stack);
    }
  }

  /**
   * Send a password reset OTP email
   */
  async sendPasswordResetEmail(user: { email: string; name: string }, otp: string) {
    try {
      await this.emailQueue.add('send-password-reset', { user, otp }, this.defaultJobOptions);
      this.logger.log(`Queued password reset OTP email for ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue password reset for ${user.email}`, error.stack);
    }
  }

  /**
   * Notify user of account deletion
   */
  async sendAccountDeletionEmail(user: { email: string; name: string }) {
    try {
      await this.emailQueue.add('send-account-deletion', { user }, this.defaultJobOptions);
      this.logger.log(`Queued account deletion email for ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue account deletion for ${user.email}`, error.stack);
    }
  }

  /**
   * Send a login notification/security alert
   */
  async sendLoginNotificationEmail(
    user: { email: string; name: string },
    loginTime: string,
    ipAddress?: string,
    device?: string,
  ) {
    try {
      await this.emailQueue.add(
        'send-login-notification',
        { user, loginTime, ipAddress, device },
        this.defaultJobOptions,
      );
      this.logger.log(`Queued login notification email for ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue login notification for ${user.email}`, error.stack);
    }
  }

  /**
   * Notify students of a newly published test/assignment
   */
  async sendNewTestPublishedEmail(user: { email: string; name: string }, testTitle: string, dueDate?: string) {
    try {
      await this.emailQueue.add('send-test-published', { user, testTitle, dueDate }, this.defaultJobOptions);
    } catch (error) {
       this.logger.error(`Failed to queue test publish email to ${user.email}`, error.stack);
    }
  }

  /**
   * Notify students of test results
   */
  async sendTestGradedEmail(user: { email: string; name: string }, testTitle: string, score: number) {
    try {
      await this.emailQueue.add('send-test-graded', { user, testTitle, score }, this.defaultJobOptions);
    } catch (error) {
       this.logger.error(`Failed to queue test graded email to ${user.email}`, error.stack);
    }
  }

  /**
   * Notify a user about an important announcement
   */
  async sendAnnouncementEmail(user: { email: string; name: string }, announcementDetails: { title: string; content: string; createdBy: string; }) {
    try {
      await this.emailQueue.add('send-announcement', { user, announcementDetails }, this.defaultJobOptions);
    } catch (error) {
       this.logger.error(`Failed to queue announcement email to ${user.email}`, error.stack);
    }
  }

  /**
   * Notify about student absence
   */
  async sendAbsenceNotificationEmail(user: { email: string; name: string }, date: string) {
    try {
      await this.emailQueue.add('send-absence-notice', { user, date }, this.defaultJobOptions);
    } catch (error) {
       this.logger.error(`Failed to queue absence email to ${user.email}`, error.stack);
    }
  }
}
