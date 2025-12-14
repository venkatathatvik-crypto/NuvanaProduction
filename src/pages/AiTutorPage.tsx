import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import AiTutorChat from '@/components/AiTutor/AiTutorChat';
import AiTeacherChat from '@/components/AiTutor/AiTeacherChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AiTutorPage = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const isTeacher = profile?.role === 'teacher';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="p-4 border-b border-white/10 flex items-center gap-4 bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                <h1 className="text-xl font-bold neon-text">
                    {isTeacher ? 'AI Teaching Assistant' : 'AI Tutor'} - Fullscreen Mode
                </h1>
            </header>
            <main className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
                <div className="flex-1 max-w-5xl mx-auto w-full h-full glass-card rounded-xl overflow-hidden shadow-2xl border-white/10">
                    {isTeacher ? <AiTeacherChat /> : <AiTutorChat />}
                </div>
            </main>
        </div>
    );
};

export default AiTutorPage;
