import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Copy, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import TodoItem from './TodoItem';
import type { Todo } from './TodoItem';
import moment from 'moment';

import { toBlob } from 'html-to-image';

interface TodoGroupProps {
    title: string;
    date: string;
    items: Todo[];
    onUpdate: () => void;
    hideHeader?: boolean;
    showTimestamp?: boolean;
}

export default function TodoGroup({ title, date, items, onUpdate, hideHeader = false, showTimestamp = false }: TodoGroupProps) {
    const { setNodeRef } = useDroppable({
        id: `group:${title}::${date}`,
    });

    const displayDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    const handleCopyScreenshot = async () => {
        const element = document.getElementById(`group-${title}-${date}`);
        if (!element) return;
        const backgroundColor = localStorage.getItem('theme') === 'dark' ? '#0a0a0a' : '#ffffff';

        try {
            // Fetch font CSS manually to embed it
            let fontCss = '';
            try {
                const res = await fetch('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
                fontCss = await res.text();
            } catch (e) {
                console.warn('Failed to fetch font CSS for screenshot', e);
            }

            const blob = await toBlob(element, {
                cacheBust: true,
                backgroundColor: backgroundColor,
                style: {
                    fontFamily: 'Poppins, sans-serif',
                },
                fontEmbedCSS: fontCss, // Pass the actual CSS text, not the URL
                filter: (node) => {
                    // Exclude the copy buttons from the screenshot
                    if (node.tagName === 'BUTTON' && (
                        node.getAttribute('title') === 'Copy screenshot to clipboard' ||
                        node.getAttribute('title') === 'Copy as Markdown'
                    )) {
                        return false;
                    }
                    return true;
                }
            });

            if (!blob) {
                toast.error('Failed to generate screenshot');
                return;
            }

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success('Screenshot copied to clipboard');
        } catch (error) {
            console.error(error);
            toast.error('Failed to capture screenshot');
        }
    };

    const handleCopyMarkdown = () => {
        let formatDate = moment(date).format('DD-MM-YYYY');
        // date is today then instead of Task Update use Today's Task Update
        let md = '';
        if (moment(date).isSame(moment(), 'day')) {
            md = `## Todo (${formatDate})\n\n`;
        } else {
            md = `## Task Update (${formatDate})\n\n`;
        }

        items.forEach(item => {
            md += `- ${item.title} ${item.is_completed ? '- done' : '- pending'}\n`;
        });
        navigator.clipboard.writeText(md);
        toast.success('Markdown copied to clipboard');
    };

    return (
        <div
            id={`group-${title}-${date}`}
            ref={setNodeRef}
            className="flex flex-col gap-2 p-4"
        >
            {/* Header - Optional, can be removed for pure flatness if same date/title */}
            {!hideHeader && (
                <div className="px-2 pb-1 flex items-center justify-between group/header">
                    <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{displayDate}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={handleCopyMarkdown}
                            className="text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 p-1 cursor-pointer"
                            title="Copy as Markdown"
                        >
                            <FileText size={16} />
                        </button>
                        <button
                            onClick={handleCopyScreenshot}
                            className="text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 p-1 cursor-pointer"
                            title="Copy screenshot to clipboard"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div
                className="flex flex-col shadow-sm rounded-xl bg-white dark:bg-gray-800/50 dark:shadow-none border border-transparent dark:border-gray-700/50 overflow-hidden"
            >
                <SortableContext
                    items={items.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map((todo) => (
                        <TodoItem key={todo.id} todo={todo} onUpdate={onUpdate} showTimestamp={showTimestamp} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
