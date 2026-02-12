import { apiClient } from "@/lib/apiClient";

export interface PdfAnnotation {
  id: string;
  file_id: string;
  page_number: number;
  annotation_data: any;
  note_type: 'ANNOTATION' | 'SCRATCHPAD';
  created_at?: string;
  updated_at?: string;
}

export const savePdfAnnotation = async (
  fileId: string,
  pageNumber: number,
  annotationData: any,
  noteType: 'ANNOTATION' | 'SCRATCHPAD' = 'ANNOTATION'
): Promise<PdfAnnotation> => {
  return apiClient.post<PdfAnnotation>("/pdf-annotations", {
    file_id: fileId,
    page_number: pageNumber,
    annotation_data: annotationData,
    note_type: noteType,
  });
};

export const getPdfAnnotations = async (fileId: string): Promise<PdfAnnotation[]> => {
  return apiClient.get<PdfAnnotation[]>(`/pdf-annotations/${fileId}`);
};

export const deletePdfAnnotations = async (fileId: string): Promise<void> => {
  return apiClient.delete(`/pdf-annotations/${fileId}`);
};
