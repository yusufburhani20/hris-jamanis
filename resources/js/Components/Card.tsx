import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    noPadding?: boolean;
}

export default function Card({ children, className = '', noPadding = false }: CardProps) {
    return (
        <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 overflow-hidden transition-colors duration-300 \${className}`}>
            <div className={`\${noPadding ? '' : 'p-6'}`}>
                {children}
            </div>
        </div>
    );
}

export function CardHeader({ title, description, action }: { title: string, description?: string, action?: ReactNode }) {
    return (
        <div className="flex justify-between items-center mb-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
