import React from 'react';

export interface QuickReplyButton {
  text: string;
  value: any;
  icon?: string;
  recommended?: boolean;
}

interface QuickReplyButtonsProps {
  buttons: QuickReplyButton[];
  onSelect: (button: QuickReplyButton) => void;
  disabled?: boolean;
}

export const QuickReplyButtons: React.FC<QuickReplyButtonsProps> = ({
  buttons,
  onSelect,
  disabled = false
}) => {
  return (
    <div className="quick-reply-container mt-4">
      <div className="flex flex-wrap gap-2.5">
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-full
              border-2 transition-all duration-300 ease-out
              font-medium text-sm
              ${button.recommended 
                ? 'border-green-500 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40' 
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-primary hover:bg-primary/5'
              }
              ${disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105 hover:shadow-lg cursor-pointer active:scale-95'
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
            `}
            onClick={() => !disabled && onSelect(button)}
            disabled={disabled}
            title={button.recommended ? 'Recommended option' : ''}
            style={{
              animation: `slideIn 0.3s ease-out forwards ${index * 0.05}s`,
              opacity: 0
            }}
          >
            {button.icon && (
              <span className="text-lg leading-none">{button.icon}</span>
            )}
            <span>{button.text}</span>
            {button.recommended && (
              <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                Recommended
              </span>
            )}
          </button>
        ))}
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
