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
        const backgroundColor = localStorage.getItem('theme') === 'dark' ? '#ffe1aaff' : '#bbf8fdff';

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
                    fontFamily: "'Poppins', sans-serif",
                    padding: '40px', // Extra padding for the absolute badges
                },
                fontEmbedCSS: fontCss,
                filter: (node) => {
                    // Exclude any button or element with copy title from the screenshot
                    if (node instanceof HTMLElement && (
                        node.tagName === 'BUTTON' ||
                        node.getAttribute('title')?.includes('Copy')
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
            className="flex flex-col gap-4 p-8"
        >
            {/* Header */}
            {!hideHeader && (
                <div className="px-6 pb-4 mb-4 flex items-center justify-between group/header border-b-[3px] border-[#2D3436]/10">
                    <div className="flex items-center gap-4">
                        <div className="w-4 h-12 bg-[#FF7F50] rounded-full border-[3px] border-[#2D3436] flex items-center justify-center shadow-[4px_4px_0px_#2D3436]">
                            <div className="w-1.5 h-1.5 rounded-full bg-white border border-[#2D3436]"></div>
                        </div>
                        <div className="flex flex-col -space-y-1 min-w-max">
                            <h3 className="text-[10px] font-black text-[#2D3436] uppercase tracking-[0.2em] opacity-60 whitespace-nowrap uppercase">
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short' }).replace(',', '')}
                            </h3>
                            <span className="text-2xl font-black text-[#2D3436] tracking-tighter whitespace-nowrap">
                                {new Date(date).getDate()}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={handleCopyMarkdown}
                            className="bg-white border-2 border-[#2D3436] p-1.5 rounded-xl hover:bg-[#D1E8FF] transition-all"
                            title="Copy as Markdown"
                        >
                            <FileText size={14} className="text-[#2D3436]" />
                        </button>
                        <button
                            onClick={handleCopyScreenshot}
                            className="bg-white border-2 border-[#2D3436] p-1.5 rounded-xl hover:bg-[#FFE27D] transition-all"
                            title="Copy screenshot to clipboard"
                        >
                            <Copy size={14} className="text-[#2D3436]" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6">
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
