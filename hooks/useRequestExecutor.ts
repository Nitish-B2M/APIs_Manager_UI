import { useState, useCallback } from 'react';
import { Endpoint, ApiResponse, ApiErrorResponse, ResponseResult } from '@/types';

interface UseRequestExecutorProps {
    variables: Record<string, string>;
    onResponseReceived?: (response: ApiResponse, endpoint: Endpoint) => void;
}

interface UseRequestExecutorReturn {
    response: ResponseResult | null;
    setResponse: React.Dispatch<React.SetStateAction<ResponseResult | null>>;
    isLoading: boolean;
    executeRequest: (endpoint: Endpoint) => Promise<ApiResponse | null>;
    clearResponse: () => void;
}

export function useRequestExecutor({ 
    variables, 
    onResponseReceived 
}: UseRequestExecutorProps): UseRequestExecutorReturn {
    const [response, setResponse] = useState<ResponseResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resolveVariables = useCallback((text: string, endpoint: Endpoint): string => {
        let result = text || '';
        
        // Replace environment variables {{var}}
        Object.entries(variables).forEach(([key, value]) => {
            const cleanKey = key.replace(/[{}]/g, '');
            const regex = new RegExp(`{{${cleanKey}}}`, 'g');
            result = result.replace(regex, value);
        });
        
        // Replace path variables :var
        (endpoint.params || []).forEach((p) => {
            if (p.type === 'path' && p.key) {
                const regex = new RegExp(`:${p.key}`, 'g');
                result = result.replace(regex, p.value || `:${p.key}`);
            }
        });
        
        return result;
    }, [variables]);

    const buildFinalUrl = useCallback((endpoint: Endpoint): string => {
        let finalUrl = resolveVariables(endpoint.url, endpoint);
        
        const queryParams = (endpoint.params || []).filter(p => p.type === 'query' && p.key);
        if (queryParams.length > 0) {
            try {
                const urlSegments = finalUrl.split('?');
                const baseUrl = urlSegments[0];
                const existingQuery = urlSegments[1] || '';
                const searchParams = new URLSearchParams(existingQuery);
                
                queryParams.forEach((p) => {
                    searchParams.set(p.key, resolveVariables(p.value, endpoint));
                });
                
                const newQuery = searchParams.toString();
                finalUrl = newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
            } catch (error) {
                console.warn('URL enhancement failed:', error);
            }
        }
        
        return finalUrl;
    }, [resolveVariables]);

    const deepParseJson = (obj: unknown): unknown => {
        if (typeof obj === 'string') {
            try {
                const parsed = JSON.parse(obj);
                return deepParseJson(parsed);
            } catch {
                // Check for "Error: JSON" patterns
                const firstBrace = obj.search(/[{[]/);
                if (firstBrace > -1) {
                    const stackStart = obj.indexOf('\n    at ');
                    
                    let potentialJson = '';
                    const prefix = obj.substring(0, firstBrace);
                    let suffix = '';
                    
                    if (stackStart > -1 && stackStart > firstBrace) {
                        potentialJson = obj.substring(firstBrace, stackStart);
                        suffix = obj.substring(stackStart);
                    } else {
                        potentialJson = obj.substring(firstBrace);
                    }
                    
                    try {
                        const parsed = JSON.parse(potentialJson);
                        const deepParsed = deepParseJson(parsed);
                        return {
                            errorType: prefix.trim().replace(/:$/, ''),
                            errorDetails: deepParsed,
                            stackTrace: suffix.trim().split('\n').map(line => line.trim())
                        };
                    } catch {
                        // If extraction fails, return original string
                    }
                }
                return obj;
            }
        } else if (Array.isArray(obj)) {
            return obj.map(deepParseJson);
        } else if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc: Record<string, unknown>, key) => {
                acc[key] = deepParseJson((obj as Record<string, unknown>)[key]);
                return acc;
            }, {});
        }
        return obj;
    };

    const executeRequest = useCallback(async (endpoint: Endpoint): Promise<ApiResponse | null> => {
        setIsLoading(true);
        setResponse(null);
        
        try {
            const finalUrl = buildFinalUrl(endpoint);
            const rawBody = endpoint.body?.raw || '';
            const finalBody = rawBody ? resolveVariables(rawBody, endpoint) : undefined;
            
            const headers = (endpoint.headers || []).reduce((acc: Record<string, string>, h) => {
                if (h.key) {
                    acc[h.key] = resolveVariables(h.value, endpoint);
                }
                return acc;
            }, {});
            
            if (finalBody && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
            
            const startTime = Date.now();
            const res = await fetch(finalUrl, {
                method: endpoint.method,
                headers,
                body: ['GET', 'HEAD'].includes(endpoint.method) ? undefined : finalBody
            });
            const endTime = Date.now();
            
            const textData = await res.text();
            
            let responseData: unknown;
            try {
                const initialParse = JSON.parse(textData);
                responseData = deepParseJson(initialParse);
            } catch {
                responseData = deepParseJson(textData);
            }
            
            const apiResponse: ApiResponse = {
                status: res.status,
                statusText: res.statusText,
                time: endTime - startTime,
                data: responseData,
                timestamp: new Date().toISOString()
            };
            
            setResponse(apiResponse);
            onResponseReceived?.(apiResponse, endpoint);
            
            return apiResponse;
        } catch (error) {
            const errorResponse: ApiErrorResponse = {
                error: true,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
            setResponse(errorResponse);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [buildFinalUrl, resolveVariables, onResponseReceived]);

    const clearResponse = useCallback(() => {
        setResponse(null);
    }, []);

    return {
        response,
        setResponse,
        isLoading,
        executeRequest,
        clearResponse
    };
}
