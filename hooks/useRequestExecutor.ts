import { useState, useCallback } from 'react';
import { Endpoint, ApiResponse, ApiErrorResponse, ResponseResult, AuthConfig, RequestAssertion, TestResult } from '@/types';

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

        // Built-in dynamic variables
        const dynamicVars: Record<string, () => string> = {
            '$timestamp': () => String(Math.floor(Date.now() / 1000)),
            '$isoTimestamp': () => new Date().toISOString(),
            '$randomUUID': () => (crypto as any).randomUUID ? (crypto as any).randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }),
            '$randomInt': () => String(Math.floor(Math.random() * 1000)),
            '$randomBool': () => String(Math.random() > 0.5),
            '$randomEmail': () => `user${Math.floor(Math.random() * 9999)}@example.com`,
            '$randomFirstName': () => ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'][Math.floor(Math.random() * 5)],
            '$randomLastName': () => ['Smith', 'Jones', 'Williams', 'Brown', 'Davis'][Math.floor(Math.random() * 5)],
        };
        Object.entries(dynamicVars).forEach(([key, generate]) => {
            result = result.replace(new RegExp(`{{\\${key}}}`, 'g'), generate);
        });

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

    const runAssertions = (response: ApiResponse, assertions: RequestAssertion[]): TestResult[] => {
        return (assertions || []).map(assertion => {
            try {
                switch (assertion.type) {
                    case 'status_code': {
                        const expected = parseInt(assertion.expected, 10);
                        const passed = response.status === expected;
                        return {
                            assertionId: assertion.id,
                            name: `Status code is ${assertion.expected}`,
                            passed,
                            message: passed
                                ? `Status code is ${response.status} ✓`
                                : `Expected ${assertion.expected}, got ${response.status}`
                        };
                    }
                    case 'response_time': {
                        const limit = parseInt(assertion.expected, 10);
                        const passed = response.time < limit;
                        return {
                            assertionId: assertion.id,
                            name: `Response time < ${assertion.expected}ms`,
                            passed,
                            message: passed
                                ? `Response time ${response.time}ms is within ${limit}ms ✓`
                                : `Response time ${response.time}ms exceeded ${limit}ms`
                        };
                    }
                    case 'body_contains': {
                        const bodyStr = typeof response.data === 'string'
                            ? response.data
                            : JSON.stringify(response.data);
                        const passed = bodyStr.includes(assertion.expected);
                        return {
                            assertionId: assertion.id,
                            name: `Body contains "${assertion.expected}"`,
                            passed,
                            message: passed
                                ? `Body contains "${assertion.expected}" ✓`
                                : `Body does not contain "${assertion.expected}"`
                        };
                    }
                    case 'json_value': {
                        const path = assertion.property || '';
                        const keys = path.split('.').filter(Boolean);
                        let actual: unknown = response.data;
                        for (const key of keys) {
                            if (actual === null || typeof actual !== 'object') { actual = undefined; break; }
                            actual = (actual as Record<string, unknown>)[key];
                        }
                        const actualStr = String(actual ?? '');
                        const passed = actualStr === assertion.expected;
                        return {
                            assertionId: assertion.id,
                            name: `${path || 'JSON'} equals "${assertion.expected}"`,
                            passed,
                            message: passed
                                ? `${path} is "${actualStr}" ✓`
                                : `Expected "${assertion.expected}", got "${actualStr}"`
                        };
                    }
                    default:
                        return { assertionId: assertion.id, name: 'Unknown', passed: false, message: 'Unknown assertion type' };
                }
            } catch {
                return { assertionId: assertion.id, name: assertion.type, passed: false, message: 'Error evaluating assertion' };
            }
        });
    };

    const executeRequest = useCallback(async (endpoint: Endpoint): Promise<ApiResponse | null> => {
        setIsLoading(true);
        setResponse(null);

        try {
            const finalUrl = buildFinalUrl(endpoint);
            const isFormData = endpoint.body?.mode === 'formdata';
            const rawBody = endpoint.body?.raw || '';
            const finalBody = rawBody ? resolveVariables(rawBody, endpoint) : undefined;

            const headers = (endpoint.headers || []).reduce((acc: Record<string, string>, h) => {
                if (h.key) {
                    acc[h.key] = resolveVariables(h.value, endpoint);
                }
                return acc;
            }, {});

            // Only set Content-Type for raw body, not for FormData (browser sets it with boundary)
            if (!isFormData && finalBody && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            // Inject auth headers (don't override manually set headers)
            const authConfig: AuthConfig = endpoint.auth || { type: 'none' };
            if (authConfig.type === 'bearer' && authConfig.token && !headers['Authorization']) {
                headers['Authorization'] = `Bearer ${resolveVariables(authConfig.token, endpoint)}`;
            } else if (authConfig.type === 'basic' && !headers['Authorization']) {
                const user = resolveVariables(authConfig.username || '', endpoint);
                const pass = resolveVariables(authConfig.password || '', endpoint);
                headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
            } else if (authConfig.type === 'apikey' && authConfig.key) {
                const resolvedKey = resolveVariables(authConfig.key, endpoint);
                const resolvedValue = resolveVariables(authConfig.value || '', endpoint);
                if (authConfig.addTo === 'header' && !headers[resolvedKey]) {
                    headers[resolvedKey] = resolvedValue;
                }
                // query param injection is handled below in URL building
            }

            const startTime = Date.now();

            // Handle API Key query param injection
            let requestUrl = finalUrl;
            if (authConfig.type === 'apikey' && authConfig.addTo === 'query' && authConfig.key) {
                const resolvedKey = resolveVariables(authConfig.key, endpoint);
                const resolvedValue = resolveVariables(authConfig.value || '', endpoint);
                const separator = requestUrl.includes('?') ? '&' : '?';
                requestUrl = `${requestUrl}${separator}${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedValue)}`;
            }

            // Build request body based on mode
            let requestBody: BodyInit | undefined;
            if (['GET', 'HEAD'].includes(endpoint.method)) {
                requestBody = undefined;
            } else if (isFormData && endpoint.body?.formdata) {
                const formData = new FormData();
                for (const field of endpoint.body.formdata) {
                    if (!field.key) continue;
                    if (field.type === 'file' && field.file) {
                        formData.append(field.key, field.file);
                    } else {
                        formData.append(field.key, resolveVariables(field.value, endpoint));
                    }
                }
                requestBody = formData;
                // Remove Content-Type if manually set — FormData needs auto boundary
                delete headers['Content-Type'];
            } else {
                requestBody = finalBody;
            }

            // Build fetch headers — skip Content-Type for FormData
            const fetchHeaders: Record<string, string> = {};
            Object.entries(headers).forEach(([key, val]) => {
                if (isFormData && key.toLowerCase() === 'content-type') return;
                fetchHeaders[key] = val;
            });

            const res = await fetch(requestUrl, {
                method: endpoint.method,
                headers: fetchHeaders,
                body: requestBody
            });
            const endTime = Date.now();

            const textData = await res.text();

            // Calculate size in bytes
            const contentLength = res.headers.get('Content-Length');
            const responseSize = contentLength ? parseInt(contentLength, 10) : new Blob([textData]).size;

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
                size: responseSize,
                data: responseData,
                timestamp: new Date().toISOString(),
                testResults: [] // Will be populated next
            };

            // Now run assertions with the full object
            apiResponse.testResults = runAssertions(apiResponse, endpoint.assertions || []);

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
