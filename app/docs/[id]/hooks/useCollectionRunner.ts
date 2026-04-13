'use client';

import { useState, useCallback, useRef } from 'react';
import { Endpoint, AuthConfig } from '@/types';
import { api } from '../../../../utils/api';

export interface ScriptOutput {
    success: boolean;
    output: string[];
    variables?: Record<string, string>;
    error?: string;
    duration: number;
}

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
    preScriptResult?: ScriptOutput | null;
    postScriptResult?: ScriptOutput | null;
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

    const hasScripts = (endpoint: Endpoint): boolean => {
        return !!(endpoint as any).pre_script?.trim() || !!(endpoint as any).post_script?.trim();
    };

    /**
     * Execute a single request — uses server execute API if scripts exist,
     * otherwise uses direct fetch for speed.
     */
    const executeOne = async (endpoint: Endpoint, vars: Record<string, string>): Promise<{ result: RunResult; updatedVars: Record<string, string> }> => {
        const startTime = Date.now();
        const ep = endpoint as any;

        try {
            let finalUrl = buildUrl(endpoint, vars);
            const headers = (endpoint.headers || []).reduce((acc: Record<string, string>, h) => {
                if (h.key) acc[h.key] = resolveVars(h.value, vars, endpoint);
                return acc;
            }, {});
            const rawBody = endpoint.body?.raw || '';
            const finalBody = rawBody ? resolveVars(rawBody, vars, endpoint) : undefined;

            if (finalBody && !headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
            finalUrl = injectAuth(headers, endpoint.auth, vars, endpoint, finalUrl);

            let updatedVars = { ...vars };

            if (hasScripts(endpoint)) {
                // Route through server execute API for script execution
                const execRes = await api.execute.run({
                    url: finalUrl,
                    method: endpoint.method,
                    headers,
                    body: finalBody,
                    protocol: endpoint.protocol || 'REST',
                    preScript: ep.pre_script || undefined,
                    postScript: ep.post_script || undefined,
                    variables: vars,
                });
                const d = execRes.data;

                // Merge script-extracted variables
                if (d.variables) updatedVars = { ...updatedVars, ...d.variables };

                return {
                    result: {
                        endpointId: endpoint.id || '',
                        name: endpoint.name,
                        method: endpoint.method,
                        url: finalUrl,
                        status: d.status,
                        statusText: d.statusText || '',
                        time: d.time,
                        passed: d.status >= 200 && d.status < 400,
                        responseData: d.body,
                        preScriptResult: d.preScriptResult || null,
                        postScriptResult: d.postScriptResult || null,
                    },
                    updatedVars,
                };
            } else {
                // Direct fetch (no scripts)
                const res = await fetch(finalUrl, {
                    method: endpoint.method,
                    headers,
                    body: ['GET', 'HEAD'].includes(endpoint.method) ? undefined : finalBody,
                });

                let responseData: unknown;
                try { responseData = await res.json(); } catch { responseData = null; }

                // Auto-extract variables from response for chaining
                if (responseData && typeof responseData === 'object') {
                    const flat = responseData as Record<string, unknown>;
                    const dataObj = (flat.data && typeof flat.data === 'object') ? flat.data as Record<string, unknown> : {};
                    for (const key of Object.keys(updatedVars)) {
                        const cleanKey = key.replace(/[{}]/g, '');
                        if (cleanKey in flat && flat[cleanKey] != null) updatedVars[cleanKey] = String(flat[cleanKey]);
                        else if (cleanKey in dataObj && dataObj[cleanKey] != null) updatedVars[cleanKey] = String(dataObj[cleanKey]);
                    }
                }

                return {
                    result: {
                        endpointId: endpoint.id || '',
                        name: endpoint.name,
                        method: endpoint.method,
                        url: finalUrl,
                        status: res.status,
                        statusText: res.statusText,
                        time: Date.now() - startTime,
                        passed: res.status >= 200 && res.status < 400,
                        responseData,
                    },
                    updatedVars,
                };
            }
        } catch (error) {
            return {
                result: {
                    endpointId: endpoint.id || '',
                    name: endpoint.name,
                    method: endpoint.method,
                    url: endpoint.url,
                    status: null,
                    statusText: 'Error',
                    time: Date.now() - startTime,
                    passed: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
                updatedVars: vars,
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

                const { result, updatedVars } = await executeOne(endpoints[i], currentVars);
                setResults(prev => [...prev, result]);

                // Merge extracted/script variables for chaining
                if (enableChaining) {
                    Object.assign(currentVars, updatedVars);
                    setRunVariables({ ...currentVars });
                }

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
