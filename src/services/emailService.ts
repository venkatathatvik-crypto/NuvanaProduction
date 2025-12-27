// Email service - Supabase removed
// TODO: Implement backend email API endpoint when needed

interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
}

/**
 * Send an email via backend API
 * This is non-blocking - errors are logged but don't throw
 * Currently returns false as email API is not yet implemented in backend
 */
export const sendEmail = async (params: SendEmailParams): Promise<boolean> => {
  // TODO: Implement backend email API endpoint
  console.warn('Email functionality not yet implemented in backend API');
  return false;
};

/**
 * Get student emails for a class
 * TODO: Implement backend API endpoint for fetching student emails
 */
export const getStudentEmailsInClass = async (classId: string): Promise<string[]> => {
  // TODO: Implement backend API endpoint to get student emails by class
  console.warn('getStudentEmailsInClass not yet implemented in backend API');
  return [];
};

/**
 * Send attendance notification email
 */
export const sendAttendanceEmail = async (
  studentEmails: string[],
  date: string,
  className: string
): Promise<void> => {
  if (studentEmails.length === 0) return;

  await sendEmail({
    to: studentEmails,
    subject: `📋 Attendance Updated - ${className}`,
    body: `Attendance for ${date} has been updated for ${className}. Please check your attendance record.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">📋 Attendance Updated</h2>
        <p>Hello,</p>
        <p>Attendance for <strong>${date}</strong> has been updated for <strong>${className}</strong>.</p>
        <p>Please log in to Nuvana to check your attendance record.</p>
        <br>
        <p style="color: #666;">- The Nuvana Team</p>
      </div>
    `,
  });
};

/**
 * Send file upload notification email
 */
export const sendFileUploadEmail = async (
  studentEmails: string[],
  fileName: string,
  fileType: 'pdf' | 'video',
  className: string
): Promise<void> => {
  if (studentEmails.length === 0) return;

  const emoji = fileType === 'video' ? '🎬' : '📄';
  const typeLabel = fileType === 'video' ? 'Video' : 'Document';

  await sendEmail({
    to: studentEmails,
    subject: `${emoji} New ${typeLabel} Uploaded - ${className}`,
    body: `A new ${typeLabel.toLowerCase()} "${fileName}" has been uploaded for ${className}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">${emoji} New ${typeLabel} Available</h2>
        <p>Hello,</p>
        <p>A new ${typeLabel.toLowerCase()} has been uploaded for <strong>${className}</strong>:</p>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 8px;"><strong>${fileName}</strong></p>
        <p>Log in to Nuvana to access this ${typeLabel.toLowerCase()}.</p>
        <br>
        <p style="color: #666;">- The Nuvana Team</p>
      </div>
    `,
  });
};

/**
 * Send test published notification email
 */
export const sendTestPublishedEmail = async (
  studentEmails: string[],
  testTitle: string,
  className: string
): Promise<void> => {
  if (studentEmails.length === 0) return;

  await sendEmail({
    to: studentEmails,
    subject: `📝 New Test Available - ${testTitle}`,
    body: `A new test "${testTitle}" is now available for ${className}. Log in to Nuvana to take the test.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">📝 New Test Available</h2>
        <p>Hello,</p>
        <p>A new test is now available for <strong>${className}</strong>:</p>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 8px;"><strong>${testTitle}</strong></p>
        <p>Log in to Nuvana to take the test.</p>
        <br>
        <p style="color: #666;">- The Nuvana Team</p>
      </div>
    `,
  });
};

/**
 * Send announcement notification email
 */
export const sendAnnouncementEmail = async (
  studentEmails: string[],
  title: string,
  message: string,
  isUrgent: boolean
): Promise<void> => {
  if (studentEmails.length === 0) return;

  const emoji = isUrgent ? '🚨' : '📢';
  const urgentLabel = isUrgent ? 'URGENT: ' : '';

  await sendEmail({
    to: studentEmails,
    subject: `${emoji} ${urgentLabel}${title}`,
    body: `${message}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isUrgent ? '#dc2626' : '#7c3aed'};">${emoji} ${urgentLabel}Announcement</h2>
        <h3>${title}</h3>
        <p>${message}</p>
        <br>
        <p style="color: #666;">- The Nuvana Team</p>
      </div>
    `,
  });
};

/**
 * Send grade notification email to a single student
 */
export const sendGradeEmail = async (
  studentEmail: string,
  testTitle: string
): Promise<void> => {
  if (!studentEmail) return;

  await sendEmail({
    to: studentEmail,
    subject: `✅ Your Test Has Been Graded - ${testTitle}`,
    body: `Your submission for "${testTitle}" has been graded. Log in to Nuvana to view your results.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">✅ Test Graded</h2>
        <p>Hello,</p>
        <p>Your submission for <strong>${testTitle}</strong> has been graded.</p>
        <p>Log in to Nuvana to view your results and detailed feedback.</p>
        <br>
        <p style="color: #666;">- The Nuvana Team</p>
      </div>
    `,
  });
};
