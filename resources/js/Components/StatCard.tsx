import React, { ReactNode } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    trend?: {
        value: number | string;
        isPositive: boolean;
        label: string;
        suffix?: string;
    };
    colorClass?: string; // Tailwind color classes for the icon background e.g. 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400'
}

export default function StatCard({ title, value, icon, trend, colorClass = 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' }: StatCardProps) {
    return (
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-5 sm:p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <h4 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-300 group-hover:text-indigo-500 dark:group-hover:text-indigo-400">{value}</h4>
                </div>
                <div className={`p-3 rounded-xl \${colorClass} transition-transform duration-300 group-hover:scale-110`}>
                    {icon}
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`flex items-center font-semibold \${trend.isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {trend.isPositive ? (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        ) : (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        )}
                        {trend.value}{trend.suffix !== undefined ? trend.suffix : '%'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">{trend.label}</span>
                </div>
            )}
        </div>
    );
}
