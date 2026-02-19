import toast from 'react-hot-toast';

/**
 * Copy note content as formatted HTML to clipboard.
 */
export async function copyAsHtml(html: string): Promise<void> {
    try {
        const blob = new Blob([html], { type: 'text/html' });
        const plainBlob = new Blob([htmlToPlainText(html)], { type: 'text/plain' });

        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': blob,
                'text/plain': plainBlob,
            }),
        ]);

        toast.success('Copied as formatted HTML');
    } catch (err) {
        // Fallback for older browsers / Electron
        try {
            await navigator.clipboard.writeText(htmlToPlainText(html));
            toast.success('Copied as plain text (HTML not supported)');
        } catch {
            toast.error('Failed to copy to clipboard');
        }
    }
}

/**
 * Copy note content as plain text to clipboard.
 */
export async function copyAsPlainText(html: string): Promise<void> {
    try {
        const text = htmlToPlainText(html);
        await navigator.clipboard.writeText(text);
        toast.success('Copied as plain text');
    } catch {
        toast.error('Failed to copy to clipboard');
    }
}

/**
 * Convert HTML to plain text preserving basic structure.
 */
function htmlToPlainText(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Replace common block elements with newlines
    temp.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    temp.querySelectorAll('p, div, h1, h2, h3, h4, li, blockquote').forEach(el => {
        el.prepend(document.createTextNode('\n'));
    });
    temp.querySelectorAll('li').forEach(el => {
        el.prepend(document.createTextNode('• '));
    });

    return (temp.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
