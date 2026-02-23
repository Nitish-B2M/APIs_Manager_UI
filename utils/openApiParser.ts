/**
 * Utility to parse OpenAPI 3.0/3.1 JSON into the internal documentation format.
 */

export interface OpenApiSpec {
    openapi?: string;
    swagger?: string;
    info: {
        title: string;
        description?: string;
        version?: string;
    };
    paths: Record<string, any>;
    servers?: Array<{ url: string; description?: string }>;
    components?: {
        schemas?: Record<string, any>;
        securitySchemes?: Record<string, any>;
    };
}

export const parseOpenApi = (spec: OpenApiSpec) => {
    const title = spec.info.title || 'Imported API';
    const baseUrl = spec.servers?.[0]?.url || '';

    const endpoints: any[] = [];
    let idCounter = 1;

    Object.entries(spec.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, detail]: [string, any]) => {
            // Skip non-HTTP methods like 'parameters', 'servers' at path level
            if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
                return;
            }

            const endpoint = {
                id: `temp_${idCounter++}`,
                name: detail.summary || detail.operationId || `${method.toUpperCase()} ${path}`,
                method: method.toUpperCase(),
                url: path.startsWith('http') ? path : (baseUrl.replace(/\/$/, '') + path),
                description: detail.description || detail.summary || '',
                headers: [],
                params: [],
                body: {
                    mode: 'raw',
                    raw: ''
                },
                lastResponse: null,
                history: []
            };

            // Parse Parameters (Query & Path)
            const allParams = [...(detail.parameters || []), ...(methods.parameters || [])];
            allParams.forEach((p: any) => {
                const param = {
                    key: p.name,
                    value: '',
                    type: p.in === 'path' ? 'path' : 'query',
                    description: p.description || ''
                };
                (endpoint.params as any).push(param);
            });

            // Parse Request Body (simplified for MVP)
            if (detail.requestBody) {
                const content = detail.requestBody.content;
                if (content && content['application/json']) {
                    const schema = content['application/json'].schema;
                    // In a real implementation, we'd resolve refs and generate sample JSON
                    // For now, we'll just put a placeholder if it exists
                    endpoint.body.raw = JSON.stringify({ note: "Schema-based body import planned" }, null, 2);
                }
            }

            // Parse Headers (from parameters)
            allParams.filter((p: any) => p.in === 'header').forEach((p: any) => {
                (endpoint.headers as any).push({
                    key: p.name,
                    value: '',
                    description: p.description || ''
                });
            });

            endpoints.push(endpoint);
        });
    });

    return {
        info: {
            name: title,
            description: spec.info.description || ''
        },
        endpoints,
        variables: {} // Future: extract from servers/auth
    };
};
