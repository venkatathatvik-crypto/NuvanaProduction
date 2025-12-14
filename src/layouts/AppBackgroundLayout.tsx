import React from "react";
import AiTutorWidget from "@/components/AiTutor/AiTutorWidget";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";

const AppBackgroundLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

            {/* Doodle Background */}
            <div
                className="absolute inset-0 opacity-60 bg-cover bg-center pointer-events-none"
                style={{
                    backgroundImage: "url('/doodle-bg.png')",
                }}
            />

            {/* Global Back to Dashboard Button */}
            <BackToDashboardButton />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>

            {/* Global AI Chatbot Widget */}
            <AiTutorWidget />
        </div>
    );
};

export default AppBackgroundLayout;
