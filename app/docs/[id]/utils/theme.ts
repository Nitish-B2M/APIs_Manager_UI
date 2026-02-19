// Theme utility functions and types for the API Client

export type Theme = 'dark' | 'light';

export interface ThemeClasses {
    secondaryBg: string;
    borderCol: string;
    textColor: string;
    subTextColor: string;
    mainBg: string;
    inputBg: string;
    hoverBg: string;
    activeHoverBg: string;
}

export function getThemeClasses(theme: Theme): ThemeClasses {
    return {
        secondaryBg: theme === 'dark' ? 'bg-gray-800' : 'bg-white',
        borderCol: theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
        textColor: theme === 'dark' ? 'text-gray-100' : 'text-gray-900',
        subTextColor: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
        mainBg: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
        inputBg: theme === 'dark' ? 'bg-gray-950' : 'bg-white',
        hoverBg: theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
        activeHoverBg: theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200',
    };
}

export function getMethodColor(method: string, theme: Theme): string {
    switch (method) {
        case 'GET':
            return 'bg-green-600/20 text-green-500';
        case 'POST':
            return 'bg-blue-600/20 text-blue-500';
        case 'PUT':
            return 'bg-yellow-600/20 text-yellow-600';
        case 'DELETE':
            return 'bg-red-600/20 text-red-500';
        case 'PATCH':
            return 'bg-purple-600/20 text-purple-500';
        default:
            return theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600';
    }
}

export function getStatusColor(status: number): { bg: string; text: string } {
    if (status >= 200 && status < 300) {
        return { bg: 'bg-green-500/10', text: 'text-green-500' };
    } else if (status >= 400 && status < 500) {
        return { bg: 'bg-yellow-500/10', text: 'text-yellow-500' };
    } else if (status >= 500) {
        return { bg: 'bg-red-500/10', text: 'text-red-500' };
    }
    return { bg: 'bg-gray-500/10', text: 'text-gray-500' };
}
