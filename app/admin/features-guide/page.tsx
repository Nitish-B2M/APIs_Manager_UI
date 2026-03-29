'use client';
import { useState } from 'react';
import {
    Shield, Key, Mail, Lock, Users, GitBranch, Zap, Code, Database, Search,
    FileText, Clock, Bell, Tag, MessageSquare, Globe, Monitor, Webhook,
    BookOpen, Cpu, Layers, Terminal, Settings, ChevronDown, ChevronRight,
    CheckCircle, ArrowRight, ExternalLink, Copy, Lightbulb
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import toast from 'react-hot-toast';

// ─── Feature data ────────────────────────────────────────────────────

interface Feature {
    title: string;
    description: string;
    steps: string[];
    apiEndpoint?: string;
    tips?: string[];
    tag: 'new' | 'enhanced' | 'existing';
}

interface FeatureGroup {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    features: Feature[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
    {
        id: 'auth',
        title: 'Authentication & Security',
        icon: <Shield size={20} />,
        color: '#ef4444',
        features: [
            {
                title: 'JWT Refresh Token Rotation',
                description: 'Access tokens expire in 15 minutes. Refresh tokens (7-day) are stored in httpOnly cookies and rotated on each refresh.',
                steps: [
                    'User logs in → receives access token (15min) + refresh token (cookie)',
                    'When access token expires, client calls POST /api/auth/refresh',
                    'Server validates refresh token, revokes old one, issues new pair',
                    'On logout, POST /api/auth/logout revokes all tokens',
                ],
                apiEndpoint: 'POST /api/auth/refresh',
                tag: 'new',
            },
            {
                title: 'Email Verification',
                description: 'New users must verify their email before accessing all features.',
                steps: [
                    'User registers → verification email sent automatically',
                    'User clicks link → redirected to /verify-email?token=xxx',
                    'Page auto-verifies and shows success/error state',
                    'Dashboard shows amber banner with "Resend Email" for unverified users',
                ],
                apiEndpoint: 'POST /api/auth/verify-email',
                tips: ['Verification links expire in 24 hours', 'Users can resend from the dashboard banner'],
                tag: 'new',
            },
            {
                title: 'Password Policy & Strength Meter',
                description: 'Passwords must meet 5 rules: 8+ chars, uppercase, lowercase, number, special character.',
                steps: [
                    'Register page shows real-time strength meter with ✓/○ checklist',
                    'Server validates with validatePassword() before accepting',
                    'Reset password page also enforces the same rules',
                ],
                tips: ['Bcrypt cost factor is 12 (not the default 10)', 'Password rules are checked on both client AND server'],
                tag: 'new',
            },
            {
                title: 'Account Lockout',
                description: '5 failed login attempts → account locked for 15 minutes.',
                steps: [
                    'Each failed login increments failed_login_attempts in DB',
                    'At 5 attempts, locked_until is set to NOW + 15min',
                    'Returns 423 "Account is temporarily locked"',
                    'Lock auto-expires — no admin intervention needed',
                    'Successful login resets the counter to 0',
                ],
                tag: 'new',
            },
            {
                title: 'Rate Limiting',
                description: 'Per-user (not just IP) rate limits with X-RateLimit headers.',
                steps: [
                    'Auth endpoints: 10 requests per 15 minutes',
                    'General endpoints: 100 requests per minute',
                    'Password reset: 5 requests per hour',
                    'Check response headers: X-RateLimit-Limit, X-RateLimit-Remaining',
                ],
                tag: 'enhanced',
            },
            {
                title: 'Security Headers (Helmet.js)',
                description: 'All responses include security headers automatically.',
                steps: [
                    'X-Content-Type-Options: nosniff',
                    'X-Frame-Options: SAMEORIGIN',
                    'X-DNS-Prefetch-Control: off',
                    'Strict-Transport-Security (in production)',
                    'X-Request-Id: unique UUID per request',
                ],
                tag: 'new',
            },
        ],
    },
    {
        id: 'api-client',
        title: 'API Client & Execution',
        icon: <Zap size={20} />,
        color: '#3b82f6',
        features: [
            {
                title: 'Multi-Protocol Execution',
                description: 'Execute REST, GraphQL, WebSocket, and SSE requests from the server.',
                steps: [
                    'POST /api/execute with protocol: "REST" — standard HTTP request',
                    'protocol: "GRAPHQL" — sends query + variables to GraphQL endpoint',
                    'protocol: "WS" — opens WebSocket, sends message, collects responses',
                    'protocol: "SSE" — connects to SSE stream, parses events for 5 seconds',
                ],
                apiEndpoint: 'POST /api/execute',
                tips: ['WebSocket/SSE collection time configurable via collectMs param (max 30s)', 'Assertions can be included in the execute call'],
                tag: 'new',
            },
            {
                title: 'GraphQL Schema Introspection',
                description: 'Fetch and explore a GraphQL API schema from any endpoint.',
                steps: [
                    'POST /api/execute/graphql/introspect with { url, headers }',
                    'Server sends introspection query to the endpoint',
                    'Returns full schema: types, fields, args, enums',
                ],
                apiEndpoint: 'POST /api/execute/graphql/introspect',
                tag: 'new',
            },
            {
                title: 'Pre/Post Request Scripts',
                description: 'Execute JavaScript before/after each request in a sandboxed VM.',
                steps: [
                    'Write script using pm.variables.set("key", "value")',
                    'Access response: pm.response.code, pm.response.json()',
                    'Run assertions: pm.test("name", () => pm.expect(value).to.equal(expected))',
                    'Available helpers: JSON, Math, Buffer, atob/btoa, console.log',
                    'Scripts timeout after 5 seconds for safety',
                ],
                tips: ['Scripts run in Node.js vm — no file system or network access', 'SCRIPT_RUNNER feature flag can disable this in production'],
                tag: 'new',
            },
            {
                title: 'Test Runner Engine',
                description: 'Server-side assertion execution for automated testing.',
                steps: [
                    'Include assertions array in POST /api/execute call',
                    'Supported types: status_code, response_time, body_contains, json_value',
                    'json_value uses dot-path notation: "data.user.name"',
                    'Results include: assertionId, name, passed, message, actual value',
                ],
                tag: 'new',
            },
            {
                title: 'Collection Runner',
                description: 'Run multiple requests in sequence with assertions and delays.',
                steps: [
                    'POST /api/execute/collection with array of requests',
                    'Each request can have its own assertions',
                    'Set delayMs between requests (e.g., 500ms)',
                    'Set stopOnFailure: true to halt on first failed assertion',
                    'Response includes per-request results + summary (total/passed/failed/duration)',
                ],
                apiEndpoint: 'POST /api/execute/collection',
                tag: 'enhanced',
            },
            {
                title: 'Response Schema Validation',
                description: 'Validate API responses against JSON Schema definitions.',
                steps: [
                    'Auto-generate schema from a sample response using generateSchema()',
                    'Validate future responses against the schema',
                    'Detects: wrong types, missing required fields, enum violations, min/max',
                    'Schema stored per request in responseSchema field',
                ],
                tag: 'new',
            },
            {
                title: 'Environment Secrets',
                description: 'Secret variables are encrypted at rest using AES-256-GCM.',
                steps: [
                    'Mark a variable as secret in the environment editor',
                    'Value is encrypted before storing in database',
                    'UI shows masked value: ****last4',
                    'Full value only decrypted when executing requests',
                    'Secrets are NEVER included in exports',
                ],
                tag: 'enhanced',
            },
        ],
    },
    {
        id: 'collections',
        title: 'Collections & Organization',
        icon: <Layers size={20} />,
        color: '#8b5cf6',
        features: [
            {
                title: 'Import from Multiple Sources',
                description: 'Import API collections from 5 different formats.',
                steps: [
                    'Postman Collection v2.1 — use the dedicated import page',
                    'Insomnia v4 — paste JSON export content',
                    'HAR files — export from browser DevTools Network tab',
                    'OpenAPI/Swagger — paste spec JSON',
                    'Bulk URLs — paste one URL per line, all become GET requests',
                ],
                tips: ['Format is auto-detected from the JSON structure', 'Thunder Client format also supported'],
                tag: 'new',
            },
            {
                title: 'Tags & Labels',
                description: 'Color-coded tags for organizing requests, collections, and notes.',
                steps: [
                    'Go to any collection → create tags with custom colors',
                    'Assign tags to requests, collections, or notes',
                    'Filter sidebar by tag to find grouped items',
                    'Bulk assign: tag up to 100 entities at once',
                    'Search by tag to find all tagged items',
                ],
                apiEndpoint: 'POST /api/tags/assign',
                tag: 'new',
            },
            {
                title: 'Request Templates',
                description: 'Save and reuse common request patterns.',
                steps: [
                    'Create template from scratch: POST /api/templates',
                    'Save existing request as template: POST /api/templates/from-request/:id',
                    'Templates can be categorized (auth, CRUD, pagination, etc.)',
                    'Templates shared across workspace if workspaceId is set',
                ],
                tag: 'new',
            },
            {
                title: 'Optimistic Concurrency Control',
                description: 'Prevents two users from overwriting each other\'s changes.',
                steps: [
                    'Every request has a version column (starts at 1)',
                    'When updating, include expectedVersion in the PATCH body',
                    'If version doesn\'t match, server returns 409 Conflict',
                    'Client shows: "This request was modified by another user. Please refresh."',
                ],
                tips: ['Version is optional — if not sent, update always succeeds (backward compatible)'],
                tag: 'new',
            },
            {
                title: 'Pagination on All Lists',
                description: 'Every list endpoint supports page, limit, sortBy, sortOrder.',
                steps: [
                    'Add ?page=1&limit=20 to any list endpoint',
                    'Response includes pagination: { page, limit, total, totalPages, hasNext, hasPrev }',
                    'Paginated endpoints: /documentation/list, /todos, /notes, /scheduler/tasks, /scheduler/habits',
                    'Default limits: docs=20, todos=50, notes=30, tasks=50',
                ],
                tag: 'new',
            },
        ],
    },
    {
        id: 'collaboration',
        title: 'Collaboration & Teams',
        icon: <Users size={20} />,
        color: '#06b6d4',
        features: [
            {
                title: 'Team Workspaces',
                description: 'Create teams with members and shared collections.',
                steps: [
                    'Create workspace: POST /api/workspaces with name + description',
                    'Add members by email: POST /api/workspaces/:id/members',
                    'Roles: OWNER, ADMIN, MEMBER, VIEWER',
                    'Move collections to workspace: PATCH /api/workspaces/:id/collections/:docId',
                    'Members see all workspace collections in their dashboard',
                ],
                apiEndpoint: 'GET /api/workspaces',
                tag: 'new',
            },
            {
                title: 'Request Comments',
                description: 'Threaded discussions on specific API requests.',
                steps: [
                    'Open a request → Comments tab → write a comment',
                    'Use @username to mention a collaborator (triggers notification)',
                    'Reply to comments (threaded via parentId)',
                    'Mark comments as resolved/unresolved',
                    'Comments visible to all collaborators on the collection',
                ],
                apiEndpoint: 'POST /api/comments/:requestId',
                tag: 'new',
            },
            {
                title: 'Notifications',
                description: 'In-app notification center for mentions, invites, and changes.',
                steps: [
                    'Bell icon shows unread count',
                    'Types: comment_mention, invite, monitor_failure, etc.',
                    'Mark individual or all notifications as read',
                    'Notifications auto-created by: comments (@mentions), webhook failures',
                ],
                apiEndpoint: 'GET /api/notifications',
                tag: 'new',
            },
            {
                title: 'Role-Based UI Rendering',
                description: 'UI elements automatically hide/disable based on user\'s role.',
                steps: [
                    'Use <RoleGate canEdit> to show element only to EDITOR+',
                    'Use <RoleGate canAdmin> for ADMIN+ only content',
                    'Use disableInstead prop to grey out instead of hiding',
                    '<RoleBadge role={role} /> shows colored role chip',
                    'Programmatic: checkCanEdit(role), checkCanAdmin(role)',
                ],
                tips: ['Permission checks happen on BOTH client and server', 'RoleGate never replaces server-side auth — always validate on the backend'],
                tag: 'new',
            },
        ],
    },
    {
        id: 'monitoring',
        title: 'Monitoring & Webhooks',
        icon: <Monitor size={20} />,
        color: '#f59e0b',
        features: [
            {
                title: 'Webhook Retry with Exponential Backoff',
                description: 'Failed webhook deliveries are retried 3 times before dead-lettering.',
                steps: [
                    'First delivery fails → retry after 1 minute',
                    'Second failure → retry after 5 minutes',
                    'Third failure → retry after 30 minutes',
                    'After all retries exhausted → logged as DEAD_LETTER in webhook_logs',
                    'Check webhook_logs table for delivery history',
                ],
                tips: ['Retries are non-blocking (setTimeout)', 'HMAC signature included in every delivery'],
                tag: 'new',
            },
            {
                title: 'Monitor Health Reports',
                description: 'Export monitor uptime data as HTML reports.',
                steps: [
                    'Collect monitor data from /api/monitor/:id/history',
                    'Call generateHealthReport() with monitor stats',
                    'Generates styled HTML with uptime %, response times, failure counts',
                    'Color-coded: green (99.9%+), amber (95%+), red (<95%)',
                ],
                tag: 'new',
            },
        ],
    },
    {
        id: 'github',
        title: 'GitHub & Git Integration',
        icon: <GitBranch size={20} />,
        color: '#22c55e',
        features: [
            {
                title: 'GitHub Account Switcher',
                description: 'Connect multiple GitHub accounts and switch between them.',
                steps: [
                    'Go to /github-accounts → Click "Add Account"',
                    'Authorize via GitHub OAuth → redirected back',
                    'Account stored in database with AES-256 encrypted token',
                    'Click "Switch" to change active account',
                    'Git config (user.name, user.email) updated automatically',
                    'Windows Credential Manager updated for git push authentication',
                ],
                apiEndpoint: 'GET /api/auth/github/authorize',
                tag: 'new',
            },
            {
                title: 'Git Manager (GitHub Desktop Alternative)',
                description: 'Full git GUI built into the web app.',
                steps: [
                    'Go to /git-manager → Add repository by path',
                    'View changed/staged/untracked files in sidebar',
                    'Click file to see diff with green/red line highlighting',
                    'Stage/unstage files individually or all at once',
                    'Write commit message → Commit',
                    'Push/Pull buttons in the top bar',
                    'Branches tab: create, switch, delete branches',
                    'History tab: view commit log with authors and hashes',
                    'Stash tab: stash/pop uncommitted changes',
                ],
                tips: ['When switching branches with uncommitted changes, you\'ll be prompted to stash first', 'Collapsible sidebar shows GitHub user avatar'],
                tag: 'new',
            },
        ],
    },
    {
        id: 'search',
        title: 'Search & Discovery',
        icon: <Search size={20} />,
        color: '#ec4899',
        features: [
            {
                title: 'Full-Text Search',
                description: 'Search across all collections, requests, and notes using PostgreSQL GIN indexes.',
                steps: [
                    'GET /api/search?q=keyword — searches everywhere',
                    'Add &type=collection to search only collections',
                    'Add &type=request to search only requests',
                    'Add &type=note to search only notes',
                    'Add &method=POST to filter requests by HTTP method',
                ],
                apiEndpoint: 'GET /api/search',
                tips: ['Uses PostgreSQL tsvector/tsquery for fast full-text search', 'GIN indexes on requests (name+url+description) and documentation (title)'],
                tag: 'new',
            },
        ],
    },
    {
        id: 'performance',
        title: 'Performance & Scalability',
        icon: <Cpu size={20} />,
        color: '#14b8a6',
        features: [
            {
                title: 'Caching & ETag Support',
                description: 'In-memory TTL cache with ETag-based 304 responses.',
                steps: [
                    'Server caches frequently accessed data with configurable TTL',
                    'Client sends If-None-Match header → server returns 304 if unchanged',
                    'Cache automatically invalidated on mutations',
                    'Max 500 entries, auto-cleanup of expired items every 60s',
                ],
                tips: ['ETags are MD5-based', 'Apply etagCache() middleware to any GET endpoint for instant caching'],
                tag: 'new',
            },
            {
                title: 'Database Health Monitoring',
                description: 'Health endpoint shows real-time database stats.',
                steps: [
                    'GET /api/health returns: connected, latencyMs, activeConnections, idleConnections',
                    'Also returns: uptime (seconds), heapUsedMB (memory)',
                    'Returns 503 if database is unreachable',
                    'Connection pool: min 2, max 20, 30s idle timeout, 5s connect timeout',
                ],
                apiEndpoint: 'GET /api/health',
                tag: 'enhanced',
            },
            {
                title: 'Background Job Queue',
                description: 'In-process job queue for async tasks with retry support.',
                steps: [
                    'Register handler: jobQueue.register("email", sendEmailHandler)',
                    'Enqueue job: jobQueue.enqueue("email", { to, subject })',
                    'Jobs retry up to 3 times on failure',
                    'Monitor stats: jobQueue.getStats() → pending, running, completed, failed',
                ],
                tips: ['Replace with BullMQ + Redis for production scale', 'Jobs process sequentially to avoid race conditions'],
                tag: 'new',
            },
        ],
    },
    {
        id: 'dx',
        title: 'Developer Experience',
        icon: <Terminal size={20} />,
        color: '#a855f7',
        features: [
            {
                title: 'Swagger UI (API Docs)',
                description: 'Interactive API documentation at /api/docs (development only).',
                steps: [
                    'Start the server in development mode',
                    'Open http://localhost:4001/api/docs in your browser',
                    'Browse all endpoints organized by tags',
                    'Download OpenAPI spec: GET /api/docs/spec.json',
                ],
                apiEndpoint: 'GET /api/docs',
                tips: ['Only available when NODE_ENV !== production', 'Spec auto-generated from route definitions'],
                tag: 'new',
            },
            {
                title: 'Database Migration Framework',
                description: 'Track and run SQL migrations with up/down support.',
                steps: [
                    'npm run db:migrate — apply all pending migrations',
                    'npm run db:migrate:status — show applied vs pending',
                    'npm run db:migrate:down — rollback last migration',
                    'Migrations tracked in _migrations table',
                    'Create new migration: add NNN_name.sql to server/src/db/',
                ],
                tips: ['Migrations run automatically in CI/CD pipeline', '38 migrations currently applied'],
                tag: 'new',
            },
            {
                title: 'Feature Flags',
                description: 'Toggle features per environment without code changes.',
                steps: [
                    'Check flag: isFeatureEnabled("AI_FEATURES")',
                    'Override via env var: FF_AI_FEATURES=false',
                    'View all flags: getAllFlags() → array with name, description, enabled',
                    'Per-environment defaults (e.g., SCRIPT_RUNNER disabled in production)',
                ],
                tips: ['10 flags defined: EMAIL_VERIFICATION, AI_FEATURES, WORKSPACES, SCRIPT_RUNNER, etc.', 'Flags checked at runtime — no restart needed for env var overrides'],
                tag: 'new',
            },
            {
                title: 'CI/CD Pipeline',
                description: 'GitHub Actions runs on every push/PR to main and dev.',
                steps: [
                    'Server job: install → TypeScript check → run migrations → vitest',
                    'Client job: install → Next.js build',
                    'Uses PostgreSQL 15 service container for integration tests',
                    'Node 20, runs in parallel',
                ],
                tag: 'new',
            },
            {
                title: 'Structured Logging',
                description: 'JSON logs in production, pretty console in development.',
                steps: [
                    'Production: {"time":"...","level":"info","msg":"GET /api/health","duration":5}',
                    'Development: [12:34:56.789] [INFO] GET /api/health 5ms',
                    'Log levels: debug, info, warn, error (configurable via LOG_LEVEL)',
                    'Request logger middleware tracks timing per request',
                    'SSE listener pattern preserved for admin dashboard log streaming',
                ],
                tag: 'new',
            },
        ],
    },
    {
        id: 'ux',
        title: 'UX & Accessibility',
        icon: <Globe size={20} />,
        color: '#f97316',
        features: [
            {
                title: 'PWA (Installable App)',
                description: 'Install DevManus as a standalone app on mobile or desktop.',
                steps: [
                    'Visit the app in Chrome/Edge',
                    'Click the install icon in the address bar',
                    'App opens in its own window without browser chrome',
                    'manifest.json configured with icons, theme color, start URL',
                ],
                tag: 'new',
            },
            {
                title: 'Customizable Keyboard Shortcuts',
                description: 'Remap keyboard shortcuts to your preference.',
                steps: [
                    'Default shortcuts work out of the box (Ctrl+K for search, etc.)',
                    'Custom bindings saved to localStorage',
                    'Conflict detection warns if two actions share the same key',
                    'resetAll() clears all custom bindings',
                    'Input-aware: shortcuts don\'t fire when typing in text fields',
                ],
                tag: 'enhanced',
            },
            {
                title: 'Onboarding Tour',
                description: '5-step guided walkthrough for first-time users.',
                steps: [
                    'Shows automatically on first login',
                    'Steps: Create Collection → Add Requests → Code Snippets → Collaborate → Connect GitHub',
                    'Progress bar at top, skip/next buttons',
                    'Dismissible — stored in localStorage',
                    'resetOnboarding() to show again',
                ],
                tag: 'new',
            },
            {
                title: 'Accessibility (WCAG 2.1 AA)',
                description: 'Screen reader support, focus management, reduced motion.',
                steps: [
                    '<SkipLink /> — hidden "Skip to content" link on Tab key',
                    '<FocusTrap /> — traps focus inside modals',
                    '<VisuallyHidden /> — screen reader only text',
                    '<LiveRegion /> — announces dynamic content to screen readers',
                    'useReducedMotion() — respects prefers-reduced-motion setting',
                ],
                tag: 'new',
            },
            {
                title: 'Design System Components',
                description: 'Standardized form components with consistent styling.',
                steps: [
                    '<FormInput label="Name" error="Required" /> — input with label + error',
                    '<FormSelect options={[...]} /> — dropdown',
                    '<Button variant="primary|secondary|danger|ghost|outline" size="sm|md|lg" />',
                    '<StatusBadge variant="success|warning|danger|info" />',
                    '<Card />, <EmptyState />, tokens object for colors/spacing/radius',
                ],
                tag: 'new',
            },
        ],
    },
];

// ─── Component ───────────────────────────────────────────────────────

export default function FeaturesGuidePage() {
    const { theme } = useTheme();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ auth: true });
    const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const dark = theme === 'dark';
    const cardBg = dark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200';
    const sub = dark ? 'text-gray-400' : 'text-gray-500';

    const toggleGroup = (id: string) => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleFeature = (key: string) => setExpandedFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    const copyEndpoint = (ep: string) => { navigator.clipboard.writeText(ep); toast.success('Copied!'); };

    // Filter features by search
    const filteredGroups = FEATURE_GROUPS.map(group => ({
        ...group,
        features: group.features.filter(f =>
            !searchQuery ||
            f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.steps.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
        ),
    })).filter(g => g.features.length > 0);

    const totalFeatures = FEATURE_GROUPS.reduce((sum, g) => sum + g.features.length, 0);
    const newCount = FEATURE_GROUPS.reduce((sum, g) => sum + g.features.filter(f => f.tag === 'new').length, 0);

    return (
        <div className="max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#249d9f] to-[#1a7a7c] text-white shadow-lg">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Features Guide</h1>
                        <p className={`text-sm ${sub}`}>
                            {totalFeatures} features documented · {newCount} new · Step-by-step instructions for every feature
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search features, steps, endpoints..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#249d9f] ${dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}
                    />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                    { label: 'Total Features', value: totalFeatures, color: '#249d9f' },
                    { label: 'New Features', value: newCount, color: '#22c55e' },
                    { label: 'API Endpoints', value: '80+', color: '#3b82f6' },
                    { label: 'Test Coverage', value: '105 tests', color: '#f59e0b' },
                ].map(stat => (
                    <div key={stat.label} className={`${cardBg} border rounded-xl p-4 text-center`}>
                        <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Feature Groups */}
            <div className="space-y-4">
                {filteredGroups.map(group => (
                    <div key={group.id} className={`${cardBg} border rounded-xl overflow-hidden`}>
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-all text-left"
                        >
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${group.color}15`, color: group.color }}>
                                {group.icon}
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold">{group.title}</h2>
                                <p className={`text-xs ${sub}`}>{group.features.length} features</p>
                            </div>
                            {expandedGroups[group.id] ? <ChevronDown size={16} className={sub} /> : <ChevronRight size={16} className={sub} />}
                        </button>

                        {/* Features List */}
                        {expandedGroups[group.id] && (
                            <div className={`border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                                {group.features.map((feature, fi) => {
                                    const featureKey = `${group.id}-${fi}`;
                                    const isExpanded = expandedFeatures[featureKey];

                                    return (
                                        <div key={fi} className={`border-b last:border-b-0 ${dark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                                            {/* Feature Header */}
                                            <button
                                                onClick={() => toggleFeature(featureKey)}
                                                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-all text-left"
                                            >
                                                <CheckCircle size={14} style={{ color: group.color }} />
                                                <span className="flex-1 text-sm font-medium">{feature.title}</span>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    feature.tag === 'new' ? 'bg-green-500/20 text-green-400' :
                                                    feature.tag === 'enhanced' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {feature.tag}
                                                </span>
                                                {isExpanded ? <ChevronDown size={14} className={sub} /> : <ChevronRight size={14} className={sub} />}
                                            </button>

                                            {/* Feature Details */}
                                            {isExpanded && (
                                                <div className={`px-5 pb-4 ml-8 space-y-3 ${dark ? 'bg-gray-900/30' : 'bg-gray-50/50'}`}>
                                                    <p className={`text-sm ${sub} leading-relaxed pt-2`}>{feature.description}</p>

                                                    {/* Steps */}
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2ec4c7] mb-2">How to use</p>
                                                        <ol className="space-y-1.5">
                                                            {feature.steps.map((step, si) => (
                                                                <li key={si} className="flex items-start gap-2 text-xs">
                                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#249d9f]/20 text-[#2ec4c7] flex items-center justify-center text-[10px] font-bold mt-0.5">
                                                                        {si + 1}
                                                                    </span>
                                                                    <span className={sub}>{step}</span>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>

                                                    {/* API Endpoint */}
                                                    {feature.apiEndpoint && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Endpoint:</span>
                                                            <code className={`text-xs px-2 py-1 rounded ${dark ? 'bg-gray-800 text-green-400' : 'bg-gray-100 text-green-700'}`}>
                                                                {feature.apiEndpoint}
                                                            </code>
                                                            <button onClick={() => copyEndpoint(feature.apiEndpoint!)} className="p-1 rounded text-muted hover:text-heading">
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Tips */}
                                                    {feature.tips && feature.tips.length > 0 && (
                                                        <div className={`p-3 rounded-lg ${dark ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <Lightbulb size={12} className="text-amber-400" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Tips</span>
                                                            </div>
                                                            {feature.tips.map((tip, ti) => (
                                                                <p key={ti} className={`text-xs ${sub} ${ti > 0 ? 'mt-1' : ''}`}>• {tip}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className={`mt-8 p-4 rounded-xl text-center ${dark ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
                <p className={`text-xs ${sub}`}>
                    This guide covers all features implemented across Phases 1-6. Last updated: March 2026.
                </p>
            </div>
        </div>
    );
}
