
export const resolveAll = (text: string, variables: Record<string, string>, ep?: any) => {
    let result = text || '';

    // Resolve workspace/collection variables {{key}}
    Object.entries(variables).forEach(([key, value]) => {
        // Simple replacement of {{key}} with value
        result = result.replace(new RegExp(`{{${key.replace(/[{}]/g, '')}}}`, 'g'), value);
    });

    // Resolve path parameters :key
    if (ep?.params) {
        ep.params.forEach((p: any) => {
            if (p.type === 'path' && p.key) {
                // Ensure value is present, otherwise keep :key or use empty
                result = result.replace(new RegExp(`:${p.key}`, 'g'), p.value || `:${p.key}`);
            }
        });
    }

    return result;
};

export const resolveUrl = (ep: any, variables: Record<string, string>) => {
    let finalUrl = resolveAll(ep.url, variables, ep);

    // Resolve Params (Query)
    const queryParams = (ep.params || []).filter((p: any) => p.type === 'query' && p.key && p.inserted !== false); // Filter out disabled if applicable

    if (queryParams.length > 0) {
        try {
            const [baseUrl, existingQuery = ''] = finalUrl.split('?');
            const searchParams = new URLSearchParams(existingQuery);

            queryParams.forEach((p: any) => {
                // Resolve value of query param as well
                searchParams.set(p.key, resolveAll(p.value, variables, ep));
            });

            const newQuery = searchParams.toString();
            finalUrl = newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
        } catch (e) {
            console.warn('Failed to construct URL with params', e);
        }
    }

    return finalUrl;
};

export const resolveHeaders = (headers: any[], variables: Record<string, string>, ep?: any) => {
    return headers.map(h => ({
        key: h.key, // Keys usually don't have variables, but could support them if valid
        value: resolveAll(h.value, variables, ep)
    })).filter(h => h.key); // Ensure valid key
};
