'use client';

import { useState, useCallback, useRef } from 'react';
import { Endpoint, AuthConfig } from '@/types';

export interface RunResult {
    endpointId: string;
    name: string;
    method: string;
    url: string;
    status: number | null;
    statusText: string;
    time: number;
    passed: boolean;
    error?: string;
    responseData?: unknown;
}

interface UseCollectionRunnerProps {
    variables: Record<string, string>;
}

interface UseCollectionRunnerReturn {
    results: RunResult[];
    isRunning: boolean;
    currentIndex: number;
    runVariables: Record<string, string>;
    start: (endpoints: Endpoint[], delay: number, enableChaining?: boolean) => void;
    stop: () => void;
}

export function useCollectionRunner({ variables }: UseCollectionRunnerProps): UseCollectionRunnerReturn {
    const [results, setResults] = useState<RunResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [runVariables, setRunVariables] = useState<Record<string, string>>({});
    const abortRef = useRef(false);

    const resolveVars = (text: string, vars: Record<string, string>, endpoint: Endpoint): string => {
        let result = text || '';
        Object.entries(vars).forEach(([key, value]) => {
            const cleanKey = key.replace(/[{}]/g, '');
            result = result.replace(new RegExp(`\\{\\{${cleanKey}\\}\\}`, 'g'), value);
        });
        (endpoint.params || []).forEach(p => {
            if (p.type === 'path' && p.key) {
                result = result.replace(new RegExp(`:${p.key}`, 'g'), p.value || `:${p.key}`);
            }
        });
        return result;
    };

    const buildUrl = (endpoint: Endpoint, vars: Record<string, string>): string => {
        let finalUrl = resolveVars(endpoint.url, vars, endpoint);
        const queryParams = (endpoint.params || []).filter(p => p.type === 'query' && p.key);
        if (queryParams.length > 0) {
            const urlSegments = finalUrl.split('?');
            const searchParams = new URLSearchParams(urlSegments[1] || '');
            queryParams.forEach(p => searchParams.set(p.key, resolveVars(p.value, vars, endpoint)));
            const qs = searchParams.toString();
            finalUrl = qs ? `${urlSegments[0]}?${qs}` : urlSegments[0];
        }
        return finalUrl;
    };

    const injectAuth = (headers: Record<string, string>, auth: AuthConfig | undefined, vars: Record<string, string>, endpoint: Endpoint, url: string): string => {
        let requestUrl = url;
        const authConfig = auth || { type: 'none' as const };
        if (authConfig.type === 'bearer' && authConfig.token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${resolveVars(authConfig.token, vars, endpoint)}`;
        } else if (authConfig.type === 'basic' && !headers['Authorization']) {
            const user = resolveVars(authConfig.username || '', vars, endpoint);
            const pass = resolveVars(authConfig.password || '', vars, endpoint);
            headers['Authorization'] = `Basic ${btoa(`${user}:${pass}`)}`;
        } else if (authConfig.type === 'apikey' && authConfig.key) {
            const resolvedKey = resolveVars(authConfig.key, vars, endpoint);
            const resolvedValue = resolveVars(authConfig.value || '', vars, endpoint);
            if (authConfig.addTo === 'header' && !headers[resolvedKey]) {
                headers[resolvedKey] = resolvedValue;
            } else if (authConfig.addTo === 'query') {
                const sep = requestUrl.includes('?') ? '&' : '?';
                requestUrl = `${requestUrl}${sep}${encodeURIComponent(resolvedKey)}=${encodeURIComponent(resolvedValue)}`;
            }
        }
        return requestUrl;
    };

    const extractVariables = (responseData: unknown, existingVars: Record<string, string>): Record<string, string> => {
        const extracted: Record<string, string> = {};
        if (!responseData || typeof responseData !== 'object') return extracted;

        const flatData = responseData as Record<string, unknown>;
        // Also check nested 'data' property (common API pattern)
        const dataObj = (flatData.data && typeof flatData.data === 'object') ? flatData.data as Record<string, unknown> : {};

        const allKeys = Object.keys(existingVars);
        for (const key of allKeys) {
            const cleanKey = key.replace(/[{}]/g, '');
            if (cleanKey in flatData && flatData[cleanKey] != null) {
                extracted[cleanKey] = String(flatData[cleanKey]);
            } else if (cleanKey in dataObj && dataObj[cleanKey] != null) {
                extracted[cleanKey] = String(dataObj[cleanKey]);
            }
        }
        return extracted;
    };

    const executeOne = async (endpoint: Endpoint, vars: Record<string, string>): Promise<RunResult> => {
        const startTime = Date.now();
        try {
            let finalUrl = buildUrl(endpoint, vars);
            const rawBody = endpoint.body?.raw || '';
            const finalBody = rawBody ? resolveVars(rawBody, vars, endpoint) : undefined;

            const headers = (endpoint.headers || []).reduce((acc: Record<string, string>, h) => {
                if (h.key) acc[h.key] = resolveVars(h.value, vars, endpoint);
                return acc;
            }, {});

            if (finalBody && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            finalUrl = injectAuth(headers, endpoint.auth, vars, endpoint, finalUrl);

            const res = await fetch(finalUrl, {
                method: endpoint.method,
                headers,
                body: ['GET', 'HEAD'].includes(endpoint.method) ? undefined : finalBody,
            });

            const endTime = Date.now();
            let responseData: unknown;
            try {
                responseData = await res.json();
            } catch {
                responseData = null;
            }

            return {
                endpointId: endpoint.id || '',
                name: endpoint.name,
                method: endpoint.method,
                url: finalUrl,
                status: res.status,
                statusText: res.statusText,
                time: endTime - startTime,
                passed: res.status >= 200 && res.status < 400,
                responseData,
            };
        } catch (error) {
            return {
                endpointId: endpoint.id || '',
                name: endpoint.name,
                method: endpoint.method,
                url: endpoint.url,
                status: null,
                statusText: 'Error',
                time: Date.now() - startTime,
                passed: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    };

    const start = useCallback((endpoints: Endpoint[], delay: number, enableChaining: boolean = true) => {
        abortRef.current = false;
        setIsRunning(true);
        setResults([]);
        setCurrentIndex(0);

        const currentVars = { ...variables };
        setRunVariables(currentVars);

        (async () => {
            for (let i = 0; i < endpoints.length; i++) {
                if (abortRef.current) break;
                setCurrentIndex(i);

                const result = await executeOne(endpoints[i], currentVars);
                setResults(prev => [...prev, result]);

                // Extract variables from response
                if (enableChaining && result.responseData) {
                    const extracted = extractVariables(result.responseData, currentVars);
                    if (Object.keys(extracted).length > 0) {
                        Object.assign(currentVars, extracted);
                        setRunVariables({ ...currentVars });
                    }
                }

                // Delay between requests
                if (delay > 0 && i < endpoints.length - 1 && !abortRef.current) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            setIsRunning(false);
            setCurrentIndex(-1);
        })();
    }, [variables]);

    const stop = useCallback(() => {
        abortRef.current = true;
        setIsRunning(false);
        setCurrentIndex(-1);
    }, []);

    return { results, isRunning, currentIndex, runVariables, start, stop };
}
