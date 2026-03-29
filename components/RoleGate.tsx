'use client';
import React from 'react';
import type { UserRole } from '../types';

/**
 * Permission hierarchy: OWNER > ADMIN > EDITOR > VIEWER
 * canEdit = OWNER | ADMIN | EDITOR
 * canAdmin = OWNER | ADMIN
 */

const ROLE_LEVEL: Record<UserRole, number> = {
    VIEWER: 0,
    EDITOR: 1,
    ADMIN: 2,
    OWNER: 3,
};

interface RoleGateProps {
    /** The user's current role in the collection */
    role: UserRole | undefined;
    /** Minimum role required to see children */
    minRole?: UserRole;
    /** Shortcut: requires at least EDITOR (can edit/delete) */
    canEdit?: boolean;
    /** Shortcut: requires at least ADMIN (can manage) */
    canAdmin?: boolean;
    /** What to render if access denied (default: nothing) */
    fallback?: React.ReactNode;
    /** Wrap children with disabled styling instead of hiding */
    disableInstead?: boolean;
    children: React.ReactNode;
}

/**
 * RoleGate — conditionally renders children based on the user's role.
 *
 * Usage:
 *   <RoleGate role={userRole} canEdit>
 *     <button>Delete</button>
 *   </RoleGate>
 *
 *   <RoleGate role={userRole} canAdmin disableInstead>
 *     <input ... />
 *   </RoleGate>
 */
export default function RoleGate({ role, minRole, canEdit, canAdmin, fallback, disableInstead, children }: RoleGateProps) {
    let requiredLevel = 0;

    if (minRole) requiredLevel = ROLE_LEVEL[minRole];
    if (canEdit) requiredLevel = Math.max(requiredLevel, ROLE_LEVEL.EDITOR);
    if (canAdmin) requiredLevel = Math.max(requiredLevel, ROLE_LEVEL.ADMIN);

    const userLevel = role ? ROLE_LEVEL[role] : -1;
    const hasAccess = userLevel >= requiredLevel;

    if (hasAccess) return <>{children}</>;

    if (disableInstead) {
        return (
            <div className="opacity-50 pointer-events-none select-none" aria-disabled="true" title="You don't have permission for this action">
                {children}
            </div>
        );
    }

    return fallback ? <>{fallback}</> : null;
}

/**
 * RoleBadge — displays the user's role as a colored badge.
 */
export function RoleBadge({ role }: { role: UserRole | undefined }) {
    if (!role) return null;

    const colors: Record<UserRole, string> = {
        OWNER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        EDITOR: 'bg-green-500/20 text-green-400 border-green-500/30',
        VIEWER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[role]}`}>
            {role}
        </span>
    );
}

/** Helper functions for programmatic use */
export function checkCanEdit(role: UserRole | undefined): boolean {
    return !!role && ROLE_LEVEL[role] >= ROLE_LEVEL.EDITOR;
}

export function checkCanAdmin(role: UserRole | undefined): boolean {
    return !!role && ROLE_LEVEL[role] >= ROLE_LEVEL.ADMIN;
}
