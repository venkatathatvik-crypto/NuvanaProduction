import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Maximize2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";

// --- Components ---

interface ChartCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    onClick?: () => void;
    children: React.ReactNode;
    isLoading?: boolean;
}

export const ChartCard = ({ title, description, onClick, children, className, isLoading, ...props }: ChartCardProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Card
            className={cn(
                "transition-all duration-300 relative overflow-hidden group glass-card",
                !isLoading && "cursor-pointer hover:shadow-lg hover:scale-[1.01]",
                className
            )}
            onClick={!isLoading ? onClick : undefined}
            onMouseEnter={() => !isLoading && setIsHovered(true)}
            onMouseLeave={() => !isLoading && setIsHovered(false)}
            {...props}
        >
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span className={cn(isLoading && "h-6 w-3/4 animate-pulse bg-muted rounded")}>
                        {!isLoading ? title : null}
                    </span>
                    {!isLoading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
                            className="text-muted-foreground bg-secondary/50 p-1.5 rounded-full"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </motion.div>
                    )}
                </CardTitle>
                {isLoading ? (
                    <div className="h-4 w-1/2 animate-pulse bg-muted/60 rounded mt-2" />
                ) : (
                    description && <CardDescription>{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="h-[320px] relative">
                {isLoading ? (
                    <div className="w-full h-full flex flex-col gap-4">
                        <div className="flex-1 w-full bg-muted/40 animate-pulse rounded-lg" />
                        <div className="h-4 w-full bg-muted/20 animate-pulse rounded" />
                    </div>
                ) : (
                    <>
                        {children}
                        {/* Hover overlay hint */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isHovered ? 1 : 0 }}
                            className="absolute inset-0 bg-background/5 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none transition-opacity z-10"
                        >
                            <span className="bg-background/90 text-foreground px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm backdrop-blur-md">
                                Click to expand
                            </span>
                        </motion.div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

interface ExpandedChartProps {
    title: string;
    description?: string;
    insights?: string;
    children: React.ReactNode;
    onClose: () => void;
}

export const ExpandedChart = ({ title, description, insights, children, onClose }: ExpandedChartProps) => {
    return (
        <div className="flex flex-col h-full w-full">
            <DialogHeader className="mb-4 space-y-2">
                <div className="flex items-start justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                        {description && <DialogDescription className="text-base mt-1">{description}</DialogDescription>}
                    </div>
                </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 w-full bg-card/50 rounded-lg border p-6 mb-4 overflow-hidden relative">
                {/* Chart Container */}
                <div className="w-full h-full">
                    {children}
                </div>
            </div>

            {insights && (
                <div className="bg-muted/30 border rounded-lg p-4 mt-auto">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-primary">
                        <Lightbulb className="w-4 h-4" /> Insights & Analysis
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {insights}
                    </p>
                </div>
            )}
        </div>
    );
};

// --- Main Widget ---

interface ExpandableChartWidgetProps {
    title: string;
    description?: string;
    insights?: string;
    renderSmall: () => React.ReactNode;
    renderExpanded: () => React.ReactNode;
    className?: string; // For the card
    isLoading?: boolean;
}

export const ExpandableChartWidget = ({
    title,
    description,
    insights,
    renderSmall,
    renderExpanded,
    className,
    isLoading
}: ExpandableChartWidgetProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <ChartCard
                title={title}
                description={description}
                onClick={() => setIsOpen(true)}
                className={className}
                isLoading={isLoading}
            >
                {renderSmall()}
            </ChartCard>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] sm:h-[85vh] flex flex-col p-6 border-none shadow-2xl glass-card">
                    <ExpandedChart
                        title={title}
                        description={description}
                        insights={insights}
                        onClose={() => setIsOpen(false)}
                    >
                        {renderExpanded()}
                    </ExpandedChart>
                </DialogContent>
            </Dialog>
        </>
    );
};

