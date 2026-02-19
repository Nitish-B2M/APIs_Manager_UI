import { toPng } from 'html-to-image';

export type ExportTheme = 'light' | 'dark';

// Helper to fetch font CSS
async function getFontCss() {
    try {
        const res = await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
        return await res.text();
    } catch (e) {
        console.warn('Failed to fetch font CSS for screenshot', e);
        return '';
    }
}

export async function exportNoteAsImage(
    element: HTMLElement,
    title: string,
    theme: ExportTheme = 'light'
): Promise<void> {
    // 1. Fetch fonts first
    const fontCss = await getFontCss();

    // 2. Prepare Wrapper
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.zIndex = '-9999';
    wrapper.style.width = '800px';
    wrapper.style.padding = '40px';
    wrapper.style.fontFamily = getComputedStyle(element).fontFamily || 'Inter, sans-serif';
    wrapper.style.lineHeight = '1.8';
    wrapper.style.fontSize = '16px';
    wrapper.style.visibility = 'visible';
    wrapper.style.pointerEvents = 'none';

    // Theme Logic
    const bgColor = theme === 'dark' ? '#0f1117' : '#ffffff';
    const textColor = theme === 'dark' ? '#e2e8f0' : '#1a1a2e';
    wrapper.style.background = bgColor;
    wrapper.style.color = textColor;

    // 3. Clone content
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.maxHeight = 'none';

    // Clean up interactive elements
    clone.querySelectorAll('button, input[type="checkbox"]').forEach(el => {
        if (el.tagName === 'INPUT') {
            const span = document.createElement('span');
            span.textContent = (el as HTMLInputElement).checked ? '☑' : '☐';
            span.style.marginRight = '8px';
            el.replaceWith(span);
        }
    });

    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 200));

        const dataUrl = await toPng(wrapper, {
            pixelRatio: 2,
            quality: 1,
            cacheBust: true,
            backgroundColor: bgColor,
            fontEmbedCSS: fontCss,
        });

        // Download
        const link = document.createElement('a');
        link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_note.png`;
        link.href = dataUrl;
        link.click();
    } catch (err) {
        console.error('Screenshot failed:', err);
    } finally {
        if (document.body.contains(wrapper)) {
            document.body.removeChild(wrapper);
        }
    }
}
