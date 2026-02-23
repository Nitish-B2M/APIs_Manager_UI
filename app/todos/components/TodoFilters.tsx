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
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl w-full max-w-2xl mx-auto">
            {/* Status Tabs */}
            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl flex-1 w-full sm:w-auto">
                {(['all', 'unfinished', 'completed'] as const).map((filter) => (
                    <button
                        key={filter}
                        onClick={() => onChange(filter)}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium capitalize transition-colors duration-200 ease-in-out ${isSelected(filter)
                            ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 w-full sm:w-auto focus-within:ring-2 focus-within:ring-indigo-500/20 transition-shadow duration-200 shadow-sm">
                <Calendar size={16} className="text-gray-400 dark:text-gray-500" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none mb-0.5">Filter by Date</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 dark:text-gray-200 p-0 w-full h-auto appearance-none focus:ring-0 focus:ring-offset-0 focus:ring-indigo-500/20"
                    />
                </div>
                {selectedDate && (
                    <button
                        onClick={() => onDateChange('')}
                        className="ml-2 text-xs text-red-500 hover:text-red-600 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors duration-200 focus:ring-0 focus:ring-offset-0 outline-none focus:outline-none"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
