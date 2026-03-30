'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../utils/api';
import { Search, Shield, ShieldOff, Mail, Key, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    email_verified: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [verifiedFilter, setVerifiedFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.admin.getUsers({
                page, limit: 25, search: search || undefined,
                role: roleFilter || undefined, verified: verifiedFilter || undefined,
            });
            setUsers(res.data.users);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch { toast.error('Failed to load users'); }
        finally { setLoading(false); }
    }, [page, search, roleFilter, verifiedFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const toggleAdmin = async (user: User) => {
        setActionLoading(user.id);
        try {
            await api.admin.updateUser(user.id, { is_admin: !user.is_admin });
            toast.success(`${user.email} is now ${user.is_admin ? 'user' : 'admin'}`);
            fetchUsers();
        } catch (e: any) { toast.error(e.message || 'Failed'); }
        finally { setActionLoading(null); }
    };

    const toggleVerified = async (user: User) => {
        setActionLoading(user.id);
        try {
            await api.admin.updateUser(user.id, { email_verified: !user.email_verified });
            toast.success(`Email ${user.email_verified ? 'unverified' : 'verified'}`);
            fetchUsers();
        } catch { toast.error('Failed'); }
        finally { setActionLoading(null); }
    };

    const sendResetPassword = async (user: User) => {
        if (!confirm(`Send password reset to ${user.email}?`)) return;
        setActionLoading(user.id);
        try {
            await api.admin.resetUserPassword(user.id);
            toast.success(`Reset email sent to ${user.email}`);
        } catch { toast.error('Failed to send reset'); }
        finally { setActionLoading(null); }
    };

    const deleteUser = async (user: User) => {
        if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
        setActionLoading(user.id);
        try {
            await api.admin.deleteUser(user.id);
            toast.success('User deleted');
            fetchUsers();
        } catch (e: any) { toast.error(e.message || 'Failed'); }
        finally { setActionLoading(null); }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="space-y-5">
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E6EDF3', marginBottom: 4 }}>User Management</h1>
                <p style={{ fontSize: 13, color: '#8B949E' }}>{total} total users</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#484F58' }} />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by name or email..."
                        style={{ width: '100%', padding: '8px 12px 8px 34px', background: '#0D1117', border: '1px solid #21262D', borderRadius: 8, color: '#E6EDF3', fontSize: 13, outline: 'none' }}
                    />
                </div>
                <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                    style={{ padding: '8px 12px', background: '#0D1117', border: '1px solid #21262D', borderRadius: 8, color: '#E6EDF3', fontSize: 12 }}>
                    <option value="">All Roles</option>
                    <option value="admin">Admins</option>
                    <option value="user">Users</option>
                </select>
                <select value={verifiedFilter} onChange={e => { setVerifiedFilter(e.target.value); setPage(1); }}
                    style={{ padding: '8px 12px', background: '#0D1117', border: '1px solid #21262D', borderRadius: 8, color: '#E6EDF3', fontSize: 12 }}>
                    <option value="">All Status</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #21262D' }}>
                            {['User', 'Role', 'Verified', 'Joined', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#484F58', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#484F58' }}>Loading...</td></tr>
                        )}
                        {!loading && users.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#484F58' }}>No users found</td></tr>
                        )}
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #21262D' }}
                                className="hover:bg-white/[0.02] transition-colors">
                                <td style={{ padding: '10px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 16, background: '#1C2128', border: '1px solid #21262D',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#8B949E', overflow: 'hidden',
                                        }}>
                                            {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user.name || user.email)?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#E6EDF3' }}>{user.name || '—'}</div>
                                            <div style={{ fontSize: 11, color: '#8B949E' }}>{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                        background: user.is_admin ? '#249d9f15' : '#21262D', color: user.is_admin ? '#249d9f' : '#8B949E',
                                    }}>
                                        {user.is_admin ? 'ADMIN' : 'USER'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    {user.email_verified
                                        ? <CheckCircle size={15} style={{ color: '#3FB950' }} />
                                        : <XCircle size={15} style={{ color: '#484F58' }} />}
                                </td>
                                <td style={{ padding: '10px 16px', fontSize: 12, color: '#8B949E' }}>{formatDate(user.createdAt)}</td>
                                <td style={{ padding: '10px 16px' }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => toggleAdmin(user)} disabled={actionLoading === user.id}
                                            title={user.is_admin ? 'Remove admin' : 'Make admin'}
                                            style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid #21262D', color: '#8B949E', cursor: 'pointer' }}>
                                            {user.is_admin ? <ShieldOff size={13} /> : <Shield size={13} />}
                                        </button>
                                        <button onClick={() => toggleVerified(user)} disabled={actionLoading === user.id}
                                            title={user.email_verified ? 'Unverify email' : 'Verify email'}
                                            style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid #21262D', color: '#8B949E', cursor: 'pointer' }}>
                                            <Mail size={13} />
                                        </button>
                                        <button onClick={() => sendResetPassword(user)} disabled={actionLoading === user.id}
                                            title="Send password reset"
                                            style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid #21262D', color: '#8B949E', cursor: 'pointer' }}>
                                            <Key size={13} />
                                        </button>
                                        <button onClick={() => deleteUser(user)} disabled={actionLoading === user.id}
                                            title="Delete user"
                                            style={{ padding: 6, borderRadius: 6, background: 'none', border: '1px solid #F8514930', color: '#F85149', cursor: 'pointer' }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 12, borderTop: '1px solid #21262D' }}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            style={{ padding: '4px 10px', borderRadius: 6, background: '#0D1117', border: '1px solid #21262D', color: '#8B949E', fontSize: 12, cursor: 'pointer', opacity: page === 1 ? 0.3 : 1 }}>
                            <ChevronLeft size={14} />
                        </button>
                        <span style={{ fontSize: 12, color: '#8B949E' }}>Page {page} of {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            style={{ padding: '4px 10px', borderRadius: 6, background: '#0D1117', border: '1px solid #21262D', color: '#8B949E', fontSize: 12, cursor: 'pointer', opacity: page === totalPages ? 0.3 : 1 }}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
