import { SchoolAnnouncementData, UseCase } from './whatsapp.types';

export interface TemplateConfig<T> {
  build: (data: T) => any[];
}

export const WHATSAPP_REGISTRY: { [K in UseCase]: TemplateConfig<any> } = {
  school_announcement: {
    build: (data: SchoolAnnouncementData) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.parentName || 'Parent' },
          { type: 'text', text: data.studentName || 'Student' },
          { type: 'text', text: data.messageText },
          { type: 'text', text: data.schoolName || 'School' },
        ],
      },
    ],
  },
};
