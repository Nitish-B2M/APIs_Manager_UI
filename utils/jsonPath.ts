/**
 * Best-effort detection of the JSON key path for a selected value in a JSON string.
 * Returns a dot-path like "data.user.token" or just the key ("token") when only
 * the immediate parent is detectable.
 */
export function detectJsonPath(jsonText: string, selectedValue: string): string | null {
    if (!jsonText || !selectedValue) return null;

    // Parse the JSON — if it fails, fall back to regex on the surrounding line
    let parsed: any;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        // Fallback: find "key": "value" or "key": value on the same line
        const escaped = selectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = jsonText.match(new RegExp(`"(\\w+)"\\s*:\\s*"?${escaped}"?`));
        return match ? match[1] : null;
    }

    // Recursive search through the parsed object
    function find(obj: any, path: string[] = []): string[] | null {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') {
            if (String(obj) === selectedValue) return path;
            return null;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const r = find(obj[i], [...path, String(i)]);
                if (r) return r;
            }
            return null;
        }
        for (const key of Object.keys(obj)) {
            const r = find(obj[key], [...path, key]);
            if (r) return r;
        }
        return null;
    }

    const path = find(parsed);
    if (!path || path.length === 0) return null;

    // Return the last key as the suggested name (simpler for env variables)
    // Full path like "data.user.token" is less friendly for a variable name.
    return path[path.length - 1];
}

/** Sanitize a string to a valid env-variable identifier */
export function toVariableName(raw: string): string {
    return raw.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
}
