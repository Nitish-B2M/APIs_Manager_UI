// Theme utility functions — 3-tier elevation system

export type Theme = 'dark' | 'light';

export interface ThemeClasses {
    secondaryBg: string;   // Tier 1: panels, toolbar
    borderCol: string;     // Border subtle
    textColor: string;     // Text primary
    subTextColor: string;  // Text secondary
    mainBg: string;        // Tier 0: page base
    inputBg: string;       // Tier 3: inputs
    hoverBg: string;
    activeHoverBg: string;
}

export function getThemeClasses(theme: Theme): ThemeClasses {
    return {
        secondaryBg: theme === 'dark' ? 'bg-[#161B22]' : 'bg-white',
        borderCol: theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200',
        textColor: theme === 'dark' ? 'text-[#E6EDF3]' : 'text-gray-900',
        subTextColor: theme === 'dark' ? 'text-[#8B949E]' : 'text-gray-500',
        mainBg: theme === 'dark' ? 'bg-[#0D1117]' : 'bg-gray-50',
        inputBg: theme === 'dark' ? 'bg-[#21262D]' : 'bg-white',
        hoverBg: theme === 'dark' ? 'hover:bg-[#21262D]' : 'hover:bg-gray-100',
        activeHoverBg: theme === 'dark' ? 'hover:bg-[#30363D]' : 'hover:bg-gray-200',
    };
}

export function getMethodColor(method: string, _theme: Theme): string {
    switch (method) {
        case 'GET':    return 'bg-[#1A3A2A] text-[#3FB950]';
        case 'POST':   return 'bg-[#1E2D3D] text-[#58A6FF]';
        case 'PUT':    return 'bg-[#1E2D3D] text-[#58A6FF]';
        case 'DELETE': return 'bg-[#3D1A1A] text-[#F85149]';
        case 'PATCH':  return 'bg-[#2D2416] text-[#D29922]';
        // Protocol types
        case 'WS':     return 'bg-[#2D1E3D] text-[#BC8CFF]';
        case 'SSE':    return 'bg-[#2D2416] text-[#D29922]';
        case 'GQL':    return 'bg-[#3D1A2D] text-[#FF6B9D]';
        default:       return 'bg-[#21262D] text-[#8B949E]';
    }
}

/**
 * Get the display label for a request — shows protocol if not REST.
 * WebSocket shows "WS", SSE shows "SSE", GraphQL shows "GQL", REST shows the HTTP method.
 */
export function getRequestLabel(method: string, protocol?: string): string {
    if (protocol === 'WS') return 'WS';
    if (protocol === 'SSE') return 'SSE';
    if (protocol === 'GRAPHQL') return 'GQL';
    return method;
}

/**
 * Get the dot color (hex) for a request — accounts for protocol.
 */
export function getRequestDotColor(method: string, protocol?: string): string {
    if (protocol === 'WS') return '#BC8CFF';
    if (protocol === 'SSE') return '#D29922';
    if (protocol === 'GRAPHQL') return '#FF6B9D';
    switch (method) {
        case 'GET':    return '#3FB950';
        case 'POST':   return '#58A6FF';
        case 'PUT':    return '#58A6FF';
        case 'DELETE': return '#F85149';
        case 'PATCH':  return '#D29922';
        default:       return '#8B949E';
    }
}

/**
 * Get the Tailwind badge class for a request — single source of truth.
 * Use everywhere a method/protocol badge is shown.
 */
export function getRequestBadgeClass(method: string, protocol?: string): string {
    if (protocol === 'WS') return 'bg-[#2D1E3D] text-[#BC8CFF]';
    if (protocol === 'SSE') return 'bg-[#2D2416] text-[#D29922]';
    if (protocol === 'GRAPHQL') return 'bg-[#3D1A2D] text-[#FF6B9D]';
    switch (method) {
        case 'GET':    return 'bg-[#1A3A2A] text-[#3FB950]';
        case 'POST':   return 'bg-[#1E2D3D] text-[#58A6FF]';
        case 'PUT':    return 'bg-[#1E2D3D] text-[#58A6FF]';
        case 'DELETE': return 'bg-[#3D1A1A] text-[#F85149]';
        case 'PATCH':  return 'bg-[#2D2416] text-[#D29922]';
        default:       return 'bg-[#21262D] text-[#8B949E]';
    }
}

export function getStatusColor(status: number): { bg: string; text: string } {
    if (status >= 200 && status < 300) return { bg: 'bg-[#1A3A2A]', text: 'text-[#3FB950]' };
    if (status >= 400 && status < 500) return { bg: 'bg-[#2D2416]', text: 'text-[#D29922]' };
    if (status >= 500) return { bg: 'bg-[#3D1A1A]', text: 'text-[#F85149]' };
    return { bg: 'bg-[#21262D]', text: 'text-[#8B949E]' };
}
