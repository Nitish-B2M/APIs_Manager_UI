"use client";

import { Calendar } from 'lucide-react';

interface TodoFiltersProps {
    current: 'all' | 'completed' | 'unfinished';
    onChange: (filter: 'all' | 'completed' | 'unfinished') => void;
    selectedDate: string;
    onDateChange: (date: string) => void;
}

export default function TodoFilters({ current, onChange, selectedDate, onDateChange }: TodoFiltersProps) {
    const isSelected = (val: string) => current === val;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-2 rounded-2xl w-full max-w-2xl mx-auto">
            {/* Status Tabs */}
            <div className="flex bg-white p-1 rounded-2xl border-[2.5px] border-[#2D3436] shadow-[4px_4px_0px_#2D3436] w-full sm:w-auto">
                {(['all', 'unfinished', 'completed'] as const).map((filter) => (
                    <button
                        key={filter}
                        onClick={() => onChange(filter)}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${isSelected(filter)
                            ? 'bg-[#FFE27D] text-[#2D3436] shadow-sm'
                            : 'text-[#2D3436]/40 hover:text-[#2D3436]'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-[2.5px] border-[#2D3436] w-full sm:w-auto shadow-[4px_4px_0px_#2D3436] transition-all hover:translate-y-[-2px]">
                <Calendar size={16} className="text-[#2D3436]" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-[#2D3436]/40 uppercase tracking-widest leading-none mb-1">Filter by Date</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs font-black text-[#2D3436] p-0 w-full h-auto appearance-none focus:ring-0"
                    />
                </div>
                {selectedDate && (
                    <button
                        onClick={() => onDateChange('')}
                        className="ml-2 text-[10px] text-red-500 font-black uppercase hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
