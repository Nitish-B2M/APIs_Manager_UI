'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface FlipUnitProps {
    value: number | string;
    label: string;
    shuffle: boolean;
}

const FlipUnit = ({ value, label, shuffle }: FlipUnitProps) => {
    const { theme } = useTheme();
    const [prevValue, setPrevValue] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);

    useEffect(() => {
        if (value !== prevValue) {
            if (shuffle) {
                setIsShuffling(true);
                const timer = setTimeout(() => {
                    setPrevValue(value);
                    setIsShuffling(false);
                }, 600); // Animation duration
                return () => clearTimeout(timer);
            }
            setIsFlipping(true);
            const timer = setTimeout(() => {
                setPrevValue(value);
                setIsFlipping(false);
            }, 600); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [value, prevValue]);

    return (
        <div className={`flex flex-col items-center gap-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <div className="relative w-8 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-lg shadow-2xl perspective-1000 px-8">
                {/* 1. Static Top (Background - New Value) */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gray-800 border-b border-black/20 flex items-end justify-center overflow-hidden rounded-t-lg">
                    <span className="text-[14px] sm:text-[28px] font-black text-white translate-y-1/2 leading-none">
                        {value}
                    </span>
                </div>

                {/* 2. Static Bottom (Background - Old Value) */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gray-900 flex items-start justify-center overflow-hidden rounded-b-lg">
                    <span className="text-[14px] sm:text-[28px] font-black text-white -translate-y-1/2 leading-none">
                        {prevValue}
                    </span>
                </div>

                {/* 3. Flipping Top Flap (Old Value swinging down) */}
                <div
                    className={`absolute inset-x-0 top-0 h-1/2 bg-gray-800 border-b border-black/20 flex items-end justify-center overflow-hidden rounded-t-lg origin-bottom transition-all duration-300 ease-in z-10
                    ${isFlipping ? '[transform:rotateX(-90deg)] opacity-0' : '[transform:rotateX(0deg)] opacity-100'}`}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <span className="text-[14px] sm:text-[28px] font-black text-white translate-y-1/2 leading-none">
                        {prevValue}
                    </span>
                </div>

                {/* 4. Flipping Bottom Flap (New Value swinging open) */}
                <div
                    className={`absolute inset-x-0 bottom-0 h-1/2 bg-gray-900 flex items-start justify-center overflow-hidden rounded-b-lg origin-top transition-all duration-300 delay-300 ease-out z-10
                    ${isFlipping ? '[transform:rotateX(0deg)] opacity-100' : '[transform:rotateX(90deg)] opacity-0'}`}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <span className="text-[14px] sm:text-[28px] font-black text-white -translate-y-1/2 leading-none">
                        {value}
                    </span>
                </div>

                {/* Middle line separator */}
                <div className="absolute top-1/2 inset-x-0 h-px bg-black/30 z-20" />
            </div>
            {/* <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500/80">{label}</span> */}
        </div>
    );
};

export const FlipClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    const displayHours = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';

    const day = time.getDate();
    const month = time.toLocaleString('default', { month: 'short' });

    return (
        <div className="flex items-center gap-3 py-2 scale-65 sm:scale-75 lg:scale-85 origin-right">
            {/* Calendar Part */}
            <div className="flex gap-1.5">
                <FlipUnit value={month} label="Month" shuffle={false} />
                <FlipUnit value={day < 10 ? `0${day}` : day} label="Day" shuffle={false} />
            </div>

            {/* Clock Part */}
            <div className="flex gap-1.5 border-l border-white/10 pl-3">
                <FlipUnit value={displayHours < 10 ? `0${displayHours}` : displayHours} label="Hours" shuffle={false} />
                <div className="flex flex-col justify-center gap-1.5 mb-2.5">
                    <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                </div>
                <FlipUnit value={minutes < 10 ? `0${minutes}` : minutes} label="Min" shuffle={false} />
                {/* <div className="flex flex-col justify-center gap-1.5 mb-2.5">
                    <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                    <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                </div>
                <FlipUnit value={seconds < 10 ? `0${seconds}` : seconds} label="Sec" shuffle={false} /> */}
            </div>

            {/* AM/PM Indicator */}
            <div className="flex flex-col items-center justify-center gap-1">
                <div className={`px-1 py-0.5 rounded text-[11px] font-black ${ampm === 'AM' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>AM</div>
                <div className={`px-1 py-0.5 rounded text-[11px] font-black ${ampm === 'PM' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>PM</div>
            </div>
        </div>
    );
};

export default FlipClock;
