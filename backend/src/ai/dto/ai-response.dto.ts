export class QuickReplyButton {
    text: string;           // Display text: "10 Questions"
    value: any;             // Actual value: 10
    payload?: any;          // Additional data for backend
    icon?: string;          // Optional emoji/icon
    recommended?: boolean;  // Highlight as recommended option
}

export class AiResponseDto {
    title: string;
    keyPoints: string[];
    explanation: string;
    personalizedFeedback?: string;
    followUpQuestion?: string;
    rawResponse?: string;
    metadata?: any;
    
    // Quick Reply Button Support
    quickReplies?: QuickReplyButton[];  // Quick reply buttons to show
    waitingForInput?: boolean;          // Indicates AI is waiting for user selection
    inputType?: 'quizConfig' | 'studyPlanConfig' | 'lessonPlanConfig' | 'questionCount' | 'questionType' | 'difficulty' | 'studyPlanDays' | 'studyPlanHours';  // What we're asking for
}
