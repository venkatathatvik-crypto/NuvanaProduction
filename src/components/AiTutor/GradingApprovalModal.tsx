import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/apiClient';
import { academicService } from '@/services/academicApiService';
import { logger } from '@/lib/logger';

interface GradingApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradingData: {
    marksObtained: number;
    totalMarks: number;
    aiFeedback: string;
  };
  teacherId: string;
  schoolId: string;
  selectedClassId: string;
  selectedSubject: string;
}

export const GradingApprovalModal: React.FC<GradingApprovalModalProps> = ({
  isOpen,
  onClose,
  gradingData,
  teacherId,
  schoolId,
  selectedClassId,
  selectedSubject,
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [testName, setTestName] = useState('');
  const [marksObtained, setMarksObtained] = useState(gradingData.marksObtained);
  const [totalMarks, setTotalMarks] = useState(gradingData.totalMarks);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Generate default test name
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setTestName(`AI Graded - ${selectedSubject || 'Assignment'} - ${today}`);
    setMarksObtained(gradingData.marksObtained);
    setTotalMarks(gradingData.totalMarks);
  }, [gradingData, selectedSubject]);

  // Load students when class is selected
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClassId) return;
      
      setLoadingStudents(true);
      try {
        const studentsData = await academicService.getStudentsByClass(selectedClassId);
        setStudents(studentsData || []);
      } catch (error) {
        logger.error('Failed to load students:', error);
        toast.error('Failed to load students');
      } finally {
        setLoadingStudents(false);
      }
    };

    if (isOpen) {
      loadStudents();
    }
  }, [isOpen, selectedClassId]);

  const handleApprove = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    if (!testName.trim()) {
      toast.error('Please enter a test name');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/tests/from-ai-grading', {
        student_id: selectedStudentId,
        test_name: testName,
        subject: selectedSubject,
        class_id: selectedClassId,
        total_marks: totalMarks,
        marks_obtained: marksObtained,
        ai_feedback: gradingData.aiFeedback,
        teacher_id: teacherId,
        school_id: schoolId,
      });

      toast.success('✅ Grading saved successfully!', {
        description: 'The test has been created and marks have been recorded.',
      });
      
      onClose();
    } catch (error: any) {
      logger.error('Failed to save grading:', error);
      toast.error('Failed to save grading', {
        description: error?.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Save AI Grading to Marks
          </DialogTitle>
          <DialogDescription>
            Review and approve the AI grading to save it as a test record
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            {loadingStudents ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading students...
              </div>
            ) : (
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger id="student">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} {student.roll_number ? `(${student.roll_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Test Name */}
          <div className="space-y-2">
            <Label htmlFor="testName">Test/Assignment Name *</Label>
            <Input
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter test name"
            />
          </div>

          {/* Marks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marksObtained">Marks Obtained *</Label>
              <Input
                id="marksObtained"
                type="number"
                min={0}
                max={totalMarks}
                value={marksObtained}
                onChange={(e) => setMarksObtained(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalMarks">Total Marks *</Label>
              <Input
                id="totalMarks"
                type="number"
                min={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Subject (Read-only) */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={selectedSubject || 'Not specified'} disabled />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading || !selectedStudentId}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Approve & Save'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
