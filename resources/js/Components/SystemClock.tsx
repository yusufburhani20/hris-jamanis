import { useState, useEffect } from 'react';

type Props = {
    light?: boolean;
};

export default function SystemClock({ light = false }: Props) {
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getTimezoneAbbr = (date: Date) => {
        const offset = -date.getTimezoneOffset() / 60;
        if (offset === 7) return 'WIB';
        if (offset === 8) return 'WITA';
        if (offset === 9) return 'WIT';
        return '';
    };

    if (!currentTime) {
        return (
            <div className={`w-32 h-10 animate-pulse rounded ${light ? 'bg-white/10' : 'bg-slate-200 dark:bg-slate-700'}`}>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-end ${light ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
            <div className={`text-base font-black leading-none ${light ? 'text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {formatTime(currentTime)} <span className="text-[10px] opacity-80 ml-0.5">{getTimezoneAbbr(currentTime)}</span>
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 ${light ? 'opacity-80' : 'opacity-60'}`}>
                {formatDate(currentTime)}
            </div>
        </div>
    );
}
