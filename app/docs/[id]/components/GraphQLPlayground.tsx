'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Book, Search, ChevronRight, ChevronDown, Loader2, Wand2, RefreshCw } from 'lucide-react';
import { api } from '../../../../utils/api';
import toast from 'react-hot-toast';

const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div style={{ height: 200, background: '#0D1117' }} />,
});

interface GraphQLPlaygroundProps {
    query: string;
    variables: string;
    url: string;
    headers: Record<string, string>;
    canEdit: boolean;
    onQueryChange: (query: string) => void;
    onVariablesChange: (variables: string) => void;
    operationName?: string;
    onOperationNameChange?: (name: string) => void;
}

interface GQLField {
    name: string;
    type: { name?: string; kind: string; ofType?: any };
    description?: string;
    args?: Array<{ name: string; type: any; description?: string }>;
}

interface GQLType {
    name: string;
    kind: string;
    description?: string;
    fields?: GQLField[];
}

export function GraphQLPlayground({
    query, variables, url, headers, canEdit,
    onQueryChange, onVariablesChange, operationName, onOperationNameChange,
}: GraphQLPlaygroundProps) {
    const [schema, setSchema] = useState<any>(null);
    const [loadingSchema, setLoadingSchema] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['Query', 'Mutation']));
    const [search, setSearch] = useState('');
    const [showSchema, setShowSchema] = useState(true);

    // Extract all operation names from the query
    const operations = useMemo(() => {
        if (!query) return [];
        const matches = query.matchAll(/(?:query|mutation|subscription)\s+(\w+)/g);
        return Array.from(matches).map(m => m[1]);
    }, [query]);

    const fetchSchema = async () => {
        if (!url) { toast.error('Enter a URL first'); return; }
        setLoadingSchema(true); setSchemaError(null);
        try {
            const res = await api.execute.graphqlIntrospect(url, headers);
            setSchema(res.data);
            toast.success('Schema loaded');
        } catch (e: any) {
            setSchemaError(e.message || 'Introspection failed');
            toast.error('Failed to load schema');
        } finally {
            setLoadingSchema(false);
        }
    };

    const formatQuery = () => {
        const formatted = query
            .replace(/\s+/g, ' ')
            .replace(/\{\s*/g, ' {\n  ')
            .replace(/\s*\}/g, '\n}')
            .replace(/,\s*/g, '\n  ')
            .trim();
        onQueryChange(formatted);
        toast.success('Query formatted');
    };

    const formatVariables = () => {
        try {
            const parsed = JSON.parse(variables || '{}');
            onVariablesChange(JSON.stringify(parsed, null, 2));
            toast.success('Variables formatted');
        } catch {
            toast.error('Invalid JSON in variables');
        }
    };

    const toggleType = (name: string) => {
        setExpandedTypes(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const typeName = (t: any): string => {
        if (!t) return 'Unknown';
        if (t.kind === 'NON_NULL') return `${typeName(t.ofType)}!`;
        if (t.kind === 'LIST') return `[${typeName(t.ofType)}]`;
        return t.name || t.kind;
    };

    // Filter schema types for display
    const displayTypes = useMemo(() => {
        if (!schema) return [];
        const types = (schema.types || []) as GQLType[];
        // Prioritize Query/Mutation/Subscription, then filter out internal types
        const importantNames = ['Query', 'Mutation', 'Subscription'];
        const filtered = types.filter(t =>
            !t.name.startsWith('__') &&
            t.kind === 'OBJECT' &&
            (importantNames.includes(t.name) || (t.fields && t.fields.length > 0))
        );
        const sorted = filtered.sort((a, b) => {
            const aImp = importantNames.indexOf(a.name);
            const bImp = importantNames.indexOf(b.name);
            if (aImp !== -1 && bImp === -1) return -1;
            if (aImp === -1 && bImp !== -1) return 1;
            if (aImp !== -1 && bImp !== -1) return aImp - bImp;
            return a.name.localeCompare(b.name);
        });
        if (!search.trim()) return sorted;
        const s = search.toLowerCase();
        return sorted.filter(t =>
            t.name.toLowerCase().includes(s) ||
            t.fields?.some(f => f.name.toLowerCase().includes(s))
        );
    }, [schema, search]);

    return (
        <div style={{ display: 'flex', height: '100%', gap: 8 }}>
            {/* Main editor column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {operations.length > 1 && (
                        <select
                            value={operationName || ''}
                            onChange={(e) => onOperationNameChange?.(e.target.value)}
                            style={{
                                padding: '6px 10px', background: '#161B22', border: '1px solid #30363D',
                                borderRadius: 6, color: '#E6EDF3', fontSize: 12, outline: 'none',
                            }}
                        >
                            <option value="">Auto-select operation</option>
                            {operations.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    )}
                    <button
                        onClick={formatQuery}
                        disabled={!canEdit}
                        style={{
                            padding: '6px 10px', background: '#161B22', border: '1px solid #30363D',
                            borderRadius: 6, color: '#8B949E', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        <Wand2 size={11} /> Prettify
                    </button>
                    <button
                        onClick={() => setShowSchema(!showSchema)}
                        style={{
                            padding: '6px 10px', background: showSchema ? 'rgba(36,157,159,0.15)' : '#161B22',
                            border: `1px solid ${showSchema ? '#249d9f' : '#30363D'}`, borderRadius: 6,
                            color: showSchema ? '#249d9f' : '#8B949E', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto',
                        }}
                    >
                        <Book size={11} /> {showSchema ? 'Hide' : 'Show'} Schema
                    </button>
                </div>

                {/* Query editor */}
                <div style={{ flex: 1, position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #21262D', minHeight: 0 }}>
                    <div style={{ position: 'absolute', top: 6, right: 10, fontSize: 9, fontWeight: 700, color: '#249d9f', opacity: 0.7, zIndex: 5, letterSpacing: 1 }}>QUERY</div>
                    <Editor
                        height="100%"
                        language="graphql"
                        value={query}
                        theme="vs-dark"
                        onChange={(v) => onQueryChange(v || '')}
                        options={{
                            readOnly: !canEdit,
                            fontSize: 13, fontFamily: 'ui-monospace, monospace',
                            minimap: { enabled: false }, scrollBeyondLastLine: false,
                            automaticLayout: true, padding: { top: 12, bottom: 12 },
                            lineNumbers: 'on', renderLineHighlight: 'none', tabSize: 2,
                        }}
                    />
                </div>

                {/* Variables editor */}
                <div style={{ height: 140, position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #21262D', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 6, right: 50, fontSize: 9, fontWeight: 700, color: '#249d9f', opacity: 0.7, zIndex: 5, letterSpacing: 1 }}>VARIABLES</div>
                    <button
                        onClick={formatVariables}
                        style={{ position: 'absolute', top: 4, right: 6, zIndex: 5, padding: '2px 6px', background: '#21262D', border: '1px solid #30363D', borderRadius: 4, color: '#8B949E', fontSize: 10, cursor: 'pointer' }}
                    >
                        Format
                    </button>
                    <Editor
                        height="100%"
                        language="json"
                        value={variables}
                        theme="vs-dark"
                        onChange={(v) => onVariablesChange(v || '')}
                        options={{
                            readOnly: !canEdit,
                            fontSize: 12, fontFamily: 'ui-monospace, monospace',
                            minimap: { enabled: false }, scrollBeyondLastLine: false,
                            automaticLayout: true, padding: { top: 12, bottom: 12 },
                            lineNumbers: 'off', renderLineHighlight: 'none', tabSize: 2,
                        }}
                    />
                </div>
            </div>

            {/* Schema explorer sidebar */}
            {showSchema && (
                <div style={{
                    width: 260, flexShrink: 0, background: '#0D1117', border: '1px solid #21262D',
                    borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #21262D', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Book size={13} style={{ color: '#249d9f' }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3' }}>Schema</span>
                            <button
                                onClick={fetchSchema}
                                disabled={loadingSchema || !url}
                                style={{ marginLeft: 'auto', padding: 4, borderRadius: 4, background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}
                                title="Refresh schema"
                            >
                                {loadingSchema ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            </button>
                        </div>
                        {schema && (
                            <div style={{ position: 'relative' }}>
                                <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#484F58' }} />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search types..."
                                    style={{ width: '100%', padding: '5px 8px 5px 26px', background: '#161B22', border: '1px solid #30363D', borderRadius: 5, color: '#E6EDF3', fontSize: 11, outline: 'none' }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                        {!schema && !loadingSchema && !schemaError && (
                            <div style={{ padding: 16, textAlign: 'center' }}>
                                <Book size={20} style={{ color: '#484F58', margin: '0 auto 8px' }} />
                                <p style={{ fontSize: 11, color: '#8B949E', marginBottom: 10 }}>Load the schema to explore queries, mutations, and types.</p>
                                <button
                                    onClick={fetchSchema}
                                    disabled={!url}
                                    style={{
                                        padding: '6px 12px', background: '#249d9f', border: 'none',
                                        borderRadius: 6, color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                        opacity: url ? 1 : 0.4,
                                    }}
                                >
                                    Load Schema
                                </button>
                            </div>
                        )}
                        {loadingSchema && (
                            <div style={{ padding: 16, textAlign: 'center', color: '#8B949E', fontSize: 11 }}>
                                <Loader2 size={14} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                                Loading schema...
                            </div>
                        )}
                        {schemaError && (
                            <div style={{ padding: 12, fontSize: 11, color: '#F85149' }}>{schemaError}</div>
                        )}
                        {schema && displayTypes.length === 0 && (
                            <p style={{ padding: 12, fontSize: 11, color: '#6E7681', fontStyle: 'italic' }}>No matching types</p>
                        )}
                        {displayTypes.map(type => (
                            <div key={type.name} style={{ marginBottom: 2 }}>
                                <button
                                    onClick={() => toggleType(type.name)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                                        padding: '4px 8px', background: 'none', border: 'none',
                                        color: '#E6EDF3', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                        textAlign: 'left', borderRadius: 4,
                                    }}
                                    className="hover:bg-white/5"
                                >
                                    {expandedTypes.has(type.name) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    <span style={{ color: type.name === 'Query' ? '#58A6FF' : type.name === 'Mutation' ? '#F85149' : type.name === 'Subscription' ? '#D29922' : '#E6EDF3' }}>
                                        {type.name}
                                    </span>
                                    <span style={{ fontSize: 9, color: '#6E7681', marginLeft: 'auto' }}>{type.fields?.length || 0}</span>
                                </button>
                                {expandedTypes.has(type.name) && type.fields && (
                                    <div style={{ paddingLeft: 14 }}>
                                        {type.fields.map(field => (
                                            <button
                                                key={field.name}
                                                onClick={() => {
                                                    const snippet = field.args?.length
                                                        ? `${field.name}(${field.args.map(a => `${a.name}: $${a.name}`).join(', ')}) {\n  \n}`
                                                        : `${field.name} {\n  \n}`;
                                                    const insertion = query.trim() ? `\n${snippet}` : `{\n  ${snippet}\n}`;
                                                    onQueryChange(query + insertion);
                                                }}
                                                style={{
                                                    display: 'block', width: '100%', padding: '3px 8px',
                                                    background: 'none', border: 'none', color: '#8B949E',
                                                    fontSize: 10, cursor: 'pointer', textAlign: 'left',
                                                    fontFamily: 'monospace', borderRadius: 3,
                                                }}
                                                className="hover:bg-white/5 hover:text-[#E6EDF3]"
                                                title={field.description || undefined}
                                            >
                                                <span style={{ color: '#E6EDF3' }}>{field.name}</span>
                                                <span style={{ color: '#6E7681', marginLeft: 6 }}>: {typeName(field.type)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
