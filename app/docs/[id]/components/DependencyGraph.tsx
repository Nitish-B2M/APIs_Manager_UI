'use client';

import React, { useMemo, useState } from 'react';
import ReactFlow, {
    Background, Controls, MiniMap,
    Node, Edge, MarkerType, Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { X, Network, Eye, EyeOff } from 'lucide-react';
import { Endpoint } from '@/types';

interface Props {
    endpoints: Endpoint[];
    onClose: () => void;
    onSelectEndpoint: (idx: number) => void;
}

// Attached at runtime by the doc loader but absent from the TS type.
interface EndpointWithScripts extends Endpoint {
    pre_script?: string;
    post_script?: string;
}

const METHOD_COLORS: Record<string, string> = {
    GET: '#10B981', POST: '#F59E0B', PUT: '#3B82F6',
    PATCH: '#8B5CF6', DELETE: '#EF4444', OPTIONS: '#6B7280', HEAD: '#6B7280',
};

// ─── Dependency detection ────────────────────────────────────────────

/** Extract variable names the script writes via pm.variables/environment.set. */
function extractProducedVars(script?: string): string[] {
    if (!script) return [];
    const names = new Set<string>();
    const re = /pm\.(?:variables|environment|globals)\.set\s*\(\s*['"`]([\w.-]+)['"`]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(script))) names.add(m[1]);
    return Array.from(names);
}

/** Extract {{varName}} references from any string. */
function extractConsumedVars(text: string): string[] {
    const out = new Set<string>();
    const re = /\{\{(\w+)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) out.add(m[1]);
    return Array.from(out);
}

function collectConsumed(ep: Endpoint): Set<string> {
    const parts: string[] = [];
    parts.push(ep.url || '');
    for (const h of ep.headers || []) parts.push(h?.value || '');
    if (ep.body?.mode === 'raw' && ep.body.raw) parts.push(ep.body.raw);
    if (ep.body?.mode === 'graphql') {
        parts.push(ep.body.graphql?.query || '');
        parts.push(ep.body.graphql?.variables || '');
    }
    // Auth tokens often contain {{token}}-style refs.
    if (ep.auth && 'token' in ep.auth && typeof (ep.auth as any).token === 'string') {
        parts.push((ep.auth as any).token);
    }
    if (ep.auth && 'key' in ep.auth && typeof (ep.auth as any).key === 'string') {
        parts.push((ep.auth as any).key);
    }
    const out = new Set<string>();
    for (const p of parts) for (const v of extractConsumedVars(p)) out.add(v);
    return out;
}

function baseUrl(url: string): string {
    try {
        const u = new URL(url.replace(/\{\{\w+\}\}/g, 'placeholder'));
        return `${u.protocol}//${u.host}`;
    } catch {
        // Fallback: everything up to the first "/" after the scheme, or the whole url.
        const m = url.match(/^[a-z]+:\/\/[^/]+/i);
        return m ? m[0] : '(unparseable)';
    }
}

function authSignature(ep: Endpoint): string | null {
    const a = ep.auth as any;
    if (!a || a.type === 'none' || !a.type) return null;
    if (a.type === 'bearer' && a.token) return `bearer:${a.token}`;
    if (a.type === 'basic' && (a.username || a.password)) return `basic:${a.username}:${a.password}`;
    if (a.type === 'apikey' && a.key) return `apikey:${a.key}:${a.value || ''}`;
    return null;
}

// ─── Layout ──────────────────────────────────────────────────────────
// Group endpoints by URL *path prefix* (first 1–2 path segments) rather
// than by origin. A large single-origin collection (typical) still lays
// out as multiple columns — one per resource — instead of one giant stack.
// Groups with many endpoints wrap into sub-columns.

function pathGroupKey(url: string): string {
    try {
        const u = new URL((url || '').replace(/\{\{\w+\}\}/g, 'x'));
        const segs = u.pathname.split('/').filter(Boolean);
        if (segs.length === 0) return '/';
        // Use first two segments if the first is a version/namespace prefix.
        if (/^(api|v\d+)$/i.test(segs[0]) && segs[1]) return `/${segs[0]}/${segs[1]}`;
        return `/${segs[0]}`;
    } catch {
        return '/_';
    }
}

const MAX_PER_COLUMN = 18;
const COL_GAP = 520;   // node width ~280 → ~240px of free gap for edge routing
const ROW_GAP = 100;
const GROUP_LABEL_OFFSET = 36;

interface Layout {
    positions: Record<number, { x: number; y: number }>;
    groupLabels: Array<{ key: string; x: number; count: number }>;
}

function buildLayout(endpoints: EndpointWithScripts[]): Layout {
    const groups = new Map<string, number[]>();
    endpoints.forEach((ep, i) => {
        const key = pathGroupKey(ep.url);
        const arr = groups.get(key) ?? [];
        arr.push(i);
        groups.set(key, arr);
    });

    // Deterministic ordering: alphabetical, but keep auth-ish groups left-most.
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
        const aAuth = /auth|login|token/i.test(a) ? 0 : 1;
        const bAuth = /auth|login|token/i.test(b) ? 0 : 1;
        if (aAuth !== bAuth) return aAuth - bAuth;
        return a.localeCompare(b);
    });

    const positions: Record<number, { x: number; y: number }> = {};
    const groupLabels: Layout['groupLabels'] = [];
    let col = 0;
    for (const key of sortedKeys) {
        const indices = groups.get(key)!;
        const subCols = Math.ceil(indices.length / MAX_PER_COLUMN);
        const startCol = col;
        indices.forEach((idx, i) => {
            const sub = Math.floor(i / MAX_PER_COLUMN);
            const row = i % MAX_PER_COLUMN;
            positions[idx] = { x: (col + sub) * COL_GAP, y: row * ROW_GAP + GROUP_LABEL_OFFSET };
        });
        groupLabels.push({ key, x: startCol * COL_GAP, count: indices.length });
        col += subCols;
    }
    return { positions, groupLabels };
}

// ─── Component ───────────────────────────────────────────────────────

export function DependencyGraph({ endpoints, onClose, onSelectEndpoint }: Props) {
    const [showVarFlows, setShowVarFlows] = useState(true);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    const { nodes, edges, stats } = useMemo(() => {
        const eps = endpoints as EndpointWithScripts[];
        const { positions, groupLabels } = buildLayout(eps);

        // Build producer index: varName -> producer indices
        const producers = new Map<string, number[]>();
        eps.forEach((ep, i) => {
            const names = [
                ...extractProducedVars(ep.post_script),
                ...extractProducedVars(ep.pre_script),
            ];
            for (const n of names) {
                const arr = producers.get(n) ?? [];
                arr.push(i);
                producers.set(n, arr);
            }
        });

        // Group label nodes — rendered as non-interactive text markers at the
        // top of each column so users can see which resource a stack belongs to.
        const labelNodes: Node[] = groupLabels.map((g, i) => ({
            id: `group-${i}`,
            data: { label: <span style={{ fontSize: 11, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5 }}>{g.key} · {g.count}</span> },
            position: { x: g.x, y: 0 },
            draggable: false,
            selectable: false,
            style: { background: 'transparent', border: 'none', padding: 0, width: 280 },
        }));

        const nodes: Node[] = eps.map((ep, i) => ({
            id: String(i),
            data: {
                label: (
                    <div style={{ textAlign: 'left', width: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                background: METHOD_COLORS[ep.method] || '#6B7280',
                                color: '#fff', flexShrink: 0,
                            }}>{ep.method}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ep.name || '(unnamed)'}
                            </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#8B949E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</div>
                    </div>
                ),
            },
            position: positions[i] ?? { x: 0, y: i * 90 },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
                background: '#161B22',
                border: `1px solid ${METHOD_COLORS[ep.method] || '#6B7280'}33`,
                borderRadius: 8,
                padding: 8,
                width: 280,
            },
        }));

        // Edges
        const edges: Edge[] = [];
        let varEdgeCount = 0;
        let authEdgeCount = 0;

        // Variable flow: producer -> consumer. Edges are dim by default to
        // keep the graph readable; selecting a node highlights its edges.
        // Bezier curves are used so paths bend through column gaps instead of
        // slicing straight through middle-column nodes.
        if (showVarFlows) {
            eps.forEach((ep, ci) => {
                const consumed = collectConsumed(ep);
                for (const v of consumed) {
                    const prods = producers.get(v) || [];
                    for (const pi of prods) {
                        if (pi === ci) continue;
                        const related = selectedNode === String(pi) || selectedNode === String(ci);
                        const strong = related || !selectedNode;
                        edges.push({
                            id: `var-${pi}-${ci}-${v}`,
                            source: String(pi),
                            target: String(ci),
                            label: related ? `{{${v}}}` : undefined,
                            animated: related,
                            type: 'default', // bezier — curves around obstacles better than smoothstep
                            style: {
                                stroke: '#F97316',
                                strokeWidth: related ? 2 : 1,
                                opacity: !selectedNode ? 0.15 : (related ? 1 : 0.04),
                            },
                            labelStyle: { fill: '#F97316', fontSize: 10, fontWeight: 600 },
                            labelBgStyle: { fill: '#161B22' },
                            markerEnd: strong ? { type: MarkerType.ArrowClosed, color: '#F97316' } : undefined,
                        });
                        varEdgeCount++;
                    }
                }
            });
        }

        // Shared auth config: link endpoints pairwise within each auth group
        // (capped to avoid O(n²) edge explosion for large collections).
        const authGroups = new Map<string, number[]>();
        eps.forEach((ep, i) => {
            const sig = authSignature(ep);
            if (!sig) return;
            const arr = authGroups.get(sig) ?? [];
            arr.push(i);
            authGroups.set(sig, arr);
        });
        for (const [, group] of authGroups) {
            if (group.length < 2) continue;
            // Only link each node to the next in the group — a chain, not a clique.
            for (let i = 0; i < group.length - 1 && authEdgeCount < 100; i++) {
                edges.push({
                    id: `auth-${group[i]}-${group[i + 1]}`,
                    source: String(group[i]),
                    target: String(group[i + 1]),
                    style: { stroke: '#6B7280', strokeDasharray: '4 4', strokeWidth: 1 },
                    label: 'shared auth',
                    labelStyle: { fill: '#8B949E', fontSize: 9 },
                    labelBgStyle: { fill: '#161B22' },
                    type: 'straight',
                });
                authEdgeCount++;
            }
        }

        return {
            nodes: [...labelNodes, ...nodes],
            edges,
            stats: { varEdges: varEdgeCount, authEdges: authEdgeCount, groups: new Set(eps.map(e => pathGroupKey(e.url))).size },
        };
    }, [endpoints, showVarFlows, selectedNode]);

    const handleNodeClick = (_e: any, node: Node) => {
        if (node.id.startsWith('group-')) return;
        // First click selects (highlights edges). Second click on the same
        // node navigates to the request.
        if (selectedNode === node.id) {
            const idx = Number(node.id);
            if (!Number.isNaN(idx)) {
                onSelectEndpoint(idx);
                onClose();
            }
            return;
        }
        setSelectedNode(node.id);
    };

    const handlePaneClick = () => setSelectedNode(null);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
             onClick={onClose}>
            <div className="flex flex-col"
                 style={{ background: '#0D1117', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', width: '92vw', height: '88vh', overflow: 'hidden' }}
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                        <Network size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Dependency Graph</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>
                            {endpoints.length} endpoints · {stats.groups} group{stats.groups === 1 ? '' : 's'} · {stats.varEdges} variable flow{stats.varEdges === 1 ? '' : 's'} · {stats.authEdges} shared-auth link{stats.authEdges === 1 ? '' : 's'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowVarFlows(v => !v)}
                        title={showVarFlows ? 'Hide variable flow edges' : 'Show variable flow edges'}
                        style={{
                            padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: showVarFlows ? 'rgba(249,115,22,0.15)' : '#0D1117',
                            color: showVarFlows ? '#F97316' : '#8B949E',
                            border: `1px solid ${showVarFlows ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.12)'}`,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        {showVarFlows ? <Eye size={13} /> : <EyeOff size={13} />} Variable flows
                    </button>
                    <Legend />
                    {selectedNode !== null && (
                        <span style={{ fontSize: 11, color: '#8B949E', marginRight: 8 }}>Click selected node again to open</span>
                    )}
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                {/* Graph */}
                <div style={{ flex: 1, minHeight: 0 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodeClick={handleNodeClick}
                        onPaneClick={handlePaneClick}
                        fitView
                        minZoom={0.15}
                        maxZoom={1.5}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="rgba(255,255,255,0.08)" gap={20} />
                        <Controls style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <MiniMap
                            nodeColor={(n) => {
                                const idx = Number(n.id);
                                const ep = endpoints[idx];
                                return METHOD_COLORS[ep?.method] || '#6B7280';
                            }}
                            maskColor="rgba(0,0,0,0.6)"
                            style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}

function Legend() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#8B949E', marginRight: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#F97316" strokeWidth="2" /></svg>
                variable flow
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#6B7280" strokeDasharray="4 4" strokeWidth="1" /></svg>
                shared auth
            </span>
        </div>
    );
}
