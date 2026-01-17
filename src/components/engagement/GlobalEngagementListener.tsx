import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getStudentData } from '@/services/academic';
import { EngagementListener } from './EngagementListener';

/**
 * GlobalEngagementListener
 * 
 * Ensures students receive real-time engagement questions regardless of which page they are on.
 * It fetches the student's classId automatically if not already available in the profile.
 */
export const GlobalEngagementListener: React.FC = () => {
  const { profile, profileLoading } = useAuth();

  // 1. Only run for students
  const isStudent = profile?.role === 'student';

  // 2. Fetch Student Data (to get class_id) if we don't have it in the profile
  const { data: studentData } = useQuery({
    queryKey: ['student-data-global', profile?.id],
    queryFn: () => getStudentData(profile!.id),
    enabled: isStudent && !!profile?.id && !profileLoading && !profile?.class_id,
  });

  const classId = profile?.class_id || studentData?.class_id;

  console.log('[GlobalEngagementListener] Student:', profile?.name, 'Role:', profile?.role, 'ClassID:', classId);

  if (!isStudent || !classId) return null;

  return <EngagementListener classId={classId} />;
};
