/**
 * Shared request display helpers — protocol-aware labels, colors, badges.
 * Use across ALL pages (docs, public, dashboard, etc.)
 */

export function getRequestLabel(method: string, protocol?: string): string {
    if (protocol === 'WS') return 'WS';
    if (protocol === 'SSE') return 'SSE';
    if (protocol === 'GRAPHQL') return 'GQL';
    return method;
}

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
