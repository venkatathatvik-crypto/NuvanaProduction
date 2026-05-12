import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { engagementApi } from '@/services/engagementApi';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CheckCircle2, XCircle, Clock, Award, Zap } from 'lucide-react';

interface SessionDetailDialogProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SessionDetailDialog: React.FC<SessionDetailDialogProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  const token = localStorage.getItem('access_token') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['session-student-details', sessionId],
    queryFn: () => engagementApi.getSessionStudentDetails(sessionId!, token),
    enabled: !!sessionId && isOpen,
  });

  const sessionData = data?.data || data;
  const students = sessionData?.students || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass-card border-border/50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold">
                {sessionData?.sessionName || 'Session Details'}
              </DialogTitle>
              <DialogDescription className="font-medium opacity-70">
                {sessionData?.className} • Student Participation Report
              </DialogDescription>
            </div>
            {sessionData && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-8 px-4 font-bold">
                {students.filter((s: any) => s.answered).length} / {students.length} Students Answered
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="font-bold">Student Name</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Participation</TableHead>
                  <TableHead className="font-bold text-center">Accuracy</TableHead>
                  <TableHead className="font-bold text-center">Avg Speed</TableHead>
                  <TableHead className="font-bold text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student.id} className="border-border/50 transition-colors hover:bg-primary/5">
                    <TableCell>
                      <div>
                        <p className="font-bold text-foreground">{student.name}</p>
                        <p className="text-[10px] text-muted-foreground opacity-60 uppercase font-black tracking-tighter truncate max-w-[150px]">
                          {student.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {student.answered ? (
                        <div className="flex items-center justify-center gap-1.5 text-green-500 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Answered
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground opacity-40 font-bold text-xs">
                          <XCircle className="w-3.5 h-3.5" />
                          No Answer
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold">{student.participation}%</span>
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden border border-border/30">
                          <div 
                            className="h-full bg-yellow-500" 
                            style={{ width: `${student.participation}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`font-black ${
                          student.answered 
                            ? (student.accuracy > 70 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                               student.accuracy > 40 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                               'bg-red-500/10 text-red-500 border-red-500/20')
                            : 'opacity-20'
                        }`}
                      >
                        {student.accuracy}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium opacity-70">
                      {student.answered ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          {(student.speed / 1000).toFixed(1)}s / {sessionData?.avgTimeLimit || 30}s
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-primary font-black">
                        <Zap className="w-3.5 h-3.5" />
                        {student.points}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
