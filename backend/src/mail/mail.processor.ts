import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';

@Processor('email-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing ${job.name} job ${job.id}`);
    
    switch (job.name) {
      case 'send-login-notification':
        return this.handleLoginNotificationEmail(job.data);
      case 'send-welcome':
        return this.handleWelcomeEmail(job.data);
      case 'send-password-reset':
        return this.handlePasswordResetEmail(job.data);
      case 'send-account-deletion':
        return this.handleAccountDeletionEmail(job.data);
      case 'send-test-published':
        return this.handleTestPublishedEmail(job.data);
      case 'send-test-graded':
        return this.handleTestGradedEmail(job.data);
      case 'send-announcement':
        return this.handleAnnouncementEmail(job.data);
      case 'send-absence-notice':
        return this.handleAbsenceNoticeEmail(job.data);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async getSchoolLogo(email: string): Promise<string | null> {
    try {
      const profile = await this.prisma.profiles.findUnique({
        where: { email },
        include: { schools: { select: { logo_url: true } } },
      });
      return profile?.schools?.logo_url || null;
    } catch (error) {
      this.logger.error(`Error fetching school logo for ${email}: ${error.message}`);
      return null;
    }
  }

  private async handleLoginNotificationEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: '🔒 New Login to Your Nuvana Account',
      template: './login-notification',
      context: {
        name: data.user.name,
        email: data.user.email,
        loginTime: data.loginTime,
        ipAddress: data.ipAddress || null,
        device: data.device || null,
        schoolLogo,
      },
    });
    this.logger.log(`Login notification email processed for ${data.user.email}`);
  }

  private async handleWelcomeEmail(data: any) {
    let schoolLogo = null;
    if (data.school_id) {
      const school = await this.prisma.schools.findUnique({
        where: { id: data.school_id },
        select: { logo_url: true },
      });
      schoolLogo = school?.logo_url;
    } else {
      schoolLogo = await this.getSchoolLogo(data.user.email);
    }

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: 'Welcome to Nuvana!',
      template: './welcome',
      context: {
        name: data.user.name,
        email: data.user.email,
        password: data.defaultPassword || 'Please click forgot password to set your password',
        schoolLogo,
      },
    });
    this.logger.log(`Welcome email successfully processed for ${data.user.email}`);
  }

  private async handlePasswordResetEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: '🔑 Your Nuvana Password Reset Code',
      template: './reset-password',
      context: {
        name: data.user.name,
        otp: data.otp,
        schoolLogo,
      },
    });
    this.logger.log(`Password reset OTP email processed for ${data.user.email}`);
  }

  private async handleAccountDeletionEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: 'Account Suspended/Deleted',
      template: './notification',
      context: {
        name: data.user.name,
        subject: 'Account Deletion Notice',
        message: 'Your account on Nuvana has been suspended or deleted by an administrator. If you believe this is a mistake, please contact your school administrator.',
        schoolLogo,
      },
    });
  }

  private async handleTestPublishedEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: `New Assignment/Test Published: ${data.testTitle}`,
      template: './notification',
      context: {
        name: data.user.name,
        subject: 'New Assignment Published',
        message: `A new test/assignment titled "${data.testTitle}" has been published by your teacher.`,
        details: data.dueDate ? `<strong>Due Date:</strong> ${data.dueDate}` : null,
        schoolLogo,
      },
    });
  }

  private async handleTestGradedEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: `Test Graded: ${data.testTitle}`,
      template: './notification',
      context: {
        name: data.user.name,
        subject: 'Your Test Has Been Graded',
        message: `Your recent submission for "${data.testTitle}" has been fully graded by your teacher.`,
        details: `<strong>Your Score:</strong> ${data.score} points`,
        schoolLogo,
      },
    });
  }

  private async handleAnnouncementEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: `Important Announcement: ${data.announcementDetails.title}`,
      template: './notification',
      context: {
        name: data.user.name,
        subject: 'Important Announcement',
        message: `You have received a new important announcement from ${data.announcementDetails.createdBy}:`,
        details: `<strong>${data.announcementDetails.title}</strong><br/>${data.announcementDetails.content}`,
        schoolLogo,
      },
    });
  }

  private async handleAbsenceNoticeEmail(data: any) {
    const schoolLogo = await this.getSchoolLogo(data.user.email);

    await this.mailerService.sendMail({
      to: data.user.email,
      subject: 'Absence Notice',
      template: './notification',
      context: {
        name: data.user.name,
        subject: 'Absence Notice',
        message: 'This is an automated notice that you have been marked absent from your classes for today.',
        details: `<strong>Date:</strong> ${data.date}<br/>Please contact your teacher or the administration if this is an error.`,
        schoolLogo,
      },
    });
  }
}
