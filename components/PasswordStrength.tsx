'use client';

interface PasswordStrengthProps {
    password: string;
}

const RULES = [
    { label: '8+ characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export function getPasswordStrength(password: string) {
    const passed = RULES.filter(r => r.test(password)).length;
    return { passed, total: RULES.length, rules: RULES.map(r => ({ ...r, met: r.test(password) })) };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
    if (!password) return null;

    const { passed, total, rules } = getPasswordStrength(password);
    const percentage = (passed / total) * 100;
    const color = percentage <= 40 ? '#ef4444' : percentage <= 70 ? '#f59e0b' : '#22c55e';
    const label = percentage <= 40 ? 'Weak' : percentage <= 70 ? 'Medium' : percentage < 100 ? 'Strong' : 'Very Strong';

    return (
        <div className="mt-2 space-y-2">
            {/* Strength bar */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-700/30 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                    {label}
                </span>
            </div>

            {/* Rules checklist */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {rules.map(rule => (
                    <span
                        key={rule.label}
                        className={`text-[10px] font-medium transition-colors ${rule.met ? 'text-green-400' : 'text-gray-500'}`}
                    >
                        {rule.met ? '✓' : '○'} {rule.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
