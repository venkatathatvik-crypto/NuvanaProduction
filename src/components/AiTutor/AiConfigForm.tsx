import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, BookOpen, GraduationCap } from 'lucide-react';

// Shared toggle button component
const ToggleButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ selected, onClick, disabled, children, className = '' }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`py-1.5 text-sm rounded-lg border transition-all ${
      selected
        ? 'border-primary bg-primary/10 text-primary font-semibold'
        : 'border-border hover:border-primary/50'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
  >
    {children}
  </button>
);

// --- Mode configs ---

export type AiConfigMode = 'quiz' | 'studyPlan' | 'lessonPlan';

export interface AiConfigValues {
  // Quiz
  questionCount?: number;
  questionTypes?: string;
  difficulty?: string;
  chapter?: string;
  topic?: string;
  // Study Plan
  days?: number;
  hoursPerDay?: number;
  // Lesson Plan
  numberOfDays?: number;
  lessonDuration?: number;
  objectives?: string;
}

interface AiConfigFormProps {
  mode: AiConfigMode;
  defaultTopic?: string;
  onSubmit: (config: AiConfigValues) => void;
  disabled?: boolean;
}

const MODE_META: Record<AiConfigMode, { icon: React.ElementType; title: string; buttonLabel: string }> = {
  quiz: { icon: Sparkles, title: 'Quiz Configuration', buttonLabel: 'Generate Quiz' },
  studyPlan: { icon: BookOpen, title: 'Study Plan Configuration', buttonLabel: 'Generate Study Plan' },
  lessonPlan: { icon: GraduationCap, title: 'Lesson Plan Configuration', buttonLabel: 'Generate Lesson Plan' },
};

export const AiConfigForm: React.FC<AiConfigFormProps> = ({
  mode,
  defaultTopic = '',
  onSubmit,
  disabled = false,
}) => {
  const [config, setConfig] = useState<AiConfigValues>({
    // Quiz defaults
    questionCount: 15,
    questionTypes: 'mixed',
    difficulty: 'Medium',
    chapter: '',
    topic: defaultTopic,
    // Study plan defaults
    days: 7,
    hoursPerDay: 2,
    // Lesson plan defaults
    numberOfDays: 3,
    lessonDuration: 60,
    objectives: '',
  });

  const set = (key: keyof AiConfigValues, value: any) =>
    setConfig((p) => ({ ...p, [key]: value }));

  const meta = MODE_META[mode];
  const Icon = meta.icon;

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 space-y-4 max-w-md">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="w-4 h-4" />
        {meta.title}
      </div>

      {/* ===== QUIZ FIELDS ===== */}
      {mode === 'quiz' && (
        <>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Questions</label>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map((n) => (
                <ToggleButton key={n} selected={config.questionCount === n} onClick={() => set('questionCount', n)} disabled={disabled} className="flex-1">
                  {n}
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Mixed', value: 'mixed' },
                { label: 'MCQ Only', value: 'mcq' },
                { label: 'Short Answer', value: 'short' },
                { label: 'Essay', value: 'essay' },
              ].map((t) => (
                <ToggleButton key={t.value} selected={config.questionTypes === t.value} onClick={() => set('questionTypes', t.value)} disabled={disabled}>
                  {t.label}
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
            <div className="flex gap-2">
              {[
                { label: '🟢 Easy', value: 'Easy' },
                { label: '🟡 Medium', value: 'Medium' },
                { label: '🔴 Hard', value: 'Hard' },
              ].map((d) => (
                <ToggleButton key={d.value} selected={config.difficulty === d.value} onClick={() => set('difficulty', d.value)} disabled={disabled} className="flex-1">
                  {d.label}
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Chapter (optional)</label>
              <input
                type="text"
                disabled={disabled}
                value={config.chapter}
                onChange={(e) => set('chapter', e.target.value)}
                placeholder="e.g. Chapter 3"
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Topic (optional)</label>
              <input
                type="text"
                disabled={disabled}
                value={config.topic}
                onChange={(e) => set('topic', e.target.value)}
                placeholder="e.g. Earth's Rotation"
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </>
      )}

      {/* ===== STUDY PLAN FIELDS ===== */}
      {mode === 'studyPlan' && (
        <>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Duration (days)</label>
            <div className="flex gap-2">
              {[3, 5, 7, 14].map((n) => (
                <ToggleButton key={n} selected={config.days === n} onClick={() => set('days', n)} disabled={disabled} className="flex-1">
                  {n} days
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Hours per day</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <ToggleButton key={n} selected={config.hoursPerDay === n} onClick={() => set('hoursPerDay', n)} disabled={disabled} className="flex-1">
                  {n} hr{n > 1 ? 's' : ''}
                </ToggleButton>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== LESSON PLAN FIELDS ===== */}
      {mode === 'lessonPlan' && (
        <>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Number of days</label>
            <div className="flex gap-2">
              {[1, 2, 3, 5, 7].map((n) => (
                <ToggleButton key={n} selected={config.numberOfDays === n} onClick={() => set('numberOfDays', n)} disabled={disabled} className="flex-1">
                  {n} day{n > 1 ? 's' : ''}
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lesson duration (minutes)</label>
            <div className="flex gap-2">
              {[30, 45, 60, 90].map((n) => (
                <ToggleButton key={n} selected={config.lessonDuration === n} onClick={() => set('lessonDuration', n)} disabled={disabled} className="flex-1">
                  {n} min
                </ToggleButton>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Objectives (optional)</label>
            <input
              type="text"
              disabled={disabled}
              value={config.objectives}
              onChange={(e) => set('objectives', e.target.value)}
              placeholder="e.g. Understand photosynthesis process"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
        </>
      )}

      <Button onClick={() => onSubmit(config)} disabled={disabled} className="w-full" size="sm">
        <Icon className="w-4 h-4 mr-2" />
        {meta.buttonLabel}
      </Button>
    </div>
  );
};
