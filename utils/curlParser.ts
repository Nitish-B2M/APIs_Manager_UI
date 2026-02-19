
interface ParsedRequest {
    method: string;
    url: string;
    headers: { key: string; value: string }[];
    body?: { mode: string; raw: string };
}

export function parseCurl(curlCommand: string): ParsedRequest | null {
    if (!curlCommand || !curlCommand.trim().toLowerCase().startsWith('curl')) return null;

    let method = 'GET';
    let url = '';
    const headers: { key: string; value: string }[] = [];
    let body: string | null = null;

    // Helper to safely extract quoted string (single or double)
    // This is a simplified parser, robust parsing of shell commands is complex
    const normalize = (cmd: string) => {
        // Remove newlines and backslashes for multi-line commands
        return cmd.replace(/\\\n/g, ' ').replace(/\n/g, ' ').trim();
    };

    const normalized = normalize(curlCommand);

    // Extract URL (simplistic assumption: URL starts with http/https or is a positional arg)
    // Regex for URL: https?://[^\s'"]+
    const urlMatch = normalized.match(/https?:\/\/[^\s'"]+/);
    if (urlMatch) {
        // remove potential trailing quote if it was inside quotes
        url = urlMatch[0];
    }

    // Extract Method (-X POST or --request POST)
    const methodMatch = normalized.match(/(-X|--request)\s+['"]?([A-Z]+)['"]?/);
    if (methodMatch) {
        method = methodMatch[2];
    }

    // Extract Headers (-H "Key: Value" or --header "Key: Value")
    // Regex global match with backreference for quotes
    const headerRegex = /(-H|--header)\s+(['"])(.*?)\2/g;
    let hMatch;
    while ((hMatch = headerRegex.exec(normalized)) !== null) {
        const headerStr = hMatch[3]; // Group 3 is the content
        const firstColon = headerStr.indexOf(':');
        if (firstColon > -1) {
            const key = headerStr.substring(0, firstColon).trim();
            const value = headerStr.substring(firstColon + 1).trim();
            headers.push({ key, value });
        }
    }

    // Extract Body (-d "data" or --data "data" or --data-raw "data")
    const dataRegex = /(-d|--data|--data-raw|--data-binary)\s+(['"])(.*?)\2/;
    const bodyMatch = normalized.match(dataRegex);
    if (bodyMatch) {
        body = bodyMatch[3]; // Group 3 is the content
        // If method wasn't explicitly set, likely POST if body is present
        if (!methodMatch) method = 'POST';
    }

    // Fallback if URL extraction failed via regex (it might be single quoted)
    if (!url) {
        const urlQuotedMatch = normalized.match(/curl\s+.*?['"](https?:\/\/[^'"]+)['"]/);
        if (urlQuotedMatch) url = urlQuotedMatch[1];
    }

    return {
        method,
        url,
        headers,
        body: body ? { mode: 'raw', raw: body } : undefined
    };
}
