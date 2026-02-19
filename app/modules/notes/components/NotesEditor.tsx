'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Heading1, Heading2, Heading3, Heading4,
    List, ListOrdered, CheckSquare, Quote, Minus, Code,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link as LinkIcon, Highlighter, Type, Palette,
    Eye, Pencil, Camera, Copy, FileText, ChevronDown,
    Sun, Moon, Columns
} from 'lucide-react';
import { copyAsHtml, copyAsPlainText } from '../utils/clipboard';
import { exportNoteAsImage, ExportTheme } from '../utils/screenshot';

// Removed local FONT_OPTIONS constant

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

export interface FontOption {
    label: string;
    value: string;
}

interface NotesEditorProps {
    content: any;
    title: string;
    defaultFont: string;
    fontOptions: FontOption[];
    onContentChange: (json: any, html: string) => void;
    onTitleChange: (title: string) => void;
    onFontChange: (font: string) => void;
}

export default function NotesEditor({
    content,
    title,
    defaultFont,
    fontOptions,
    onContentChange,
    onTitleChange,
    onFontChange,
}: NotesEditorProps) {
    const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
    const [showScreenshotMenu, setShowScreenshotMenu] = useState(false);
    const [showCopyMenu, setShowCopyMenu] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
                codeBlock: false,
            }),
            Underline,
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false }),
            TextStyle,
            Color,
            FontFamily,
            Placeholder.configure({ placeholder: 'Start writing your note...' }),
        ],
        content: content || undefined,
        onUpdate: ({ editor }) => {
            onContentChange(editor.getJSON(), editor.getHTML());
        },
        editorProps: {
            attributes: {
                style: `font-family: ${defaultFont || 'Inter, sans-serif'}`,
            },
        },
        immediatelyRender: false,
    });

    // --- Link insertion ---
    const handleInsertLink = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
    }, [editor]);

    // --- Screenshot ---
    const handleScreenshot = useCallback(async (theme: ExportTheme) => {
        const target = mode === 'preview' ? previewRef.current : editorRef.current;
        if (!target) return;
        await exportNoteAsImage(target, title || 'Untitled', theme);
        setShowScreenshotMenu(false);
    }, [mode, title]);

    // --- Copy ---
    const handleCopyHtml = useCallback(() => {
        if (!editor) return;
        copyAsHtml(editor.getHTML());
        setShowCopyMenu(false);
    }, [editor]);

    const handleCopyPlain = useCallback(() => {
        if (!editor) return;
        copyAsPlainText(editor.getHTML());
        setShowCopyMenu(false);
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="notes-main">
            {/* Title bar */}
            <div className="notes-title-bar">
                <input
                    className="notes-title-input"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Untitled Note"
                />

                {/* Mode toggle */}
                <div className="notes-mode-toggle">
                    <button
                        className={`notes-mode-btn ${mode === 'edit' ? 'active' : ''}`}
                        onClick={() => setMode('edit')}
                        title="Edit Mode"
                    >
                        <Pencil size={14} /> Edit
                    </button>
                    <button
                        className={`notes-mode-btn ${mode === 'split' ? 'active' : ''}`}
                        onClick={() => setMode('split')}
                        title="Split Mode (Edit & Preview)"
                    >
                        <Columns size={14} /> Split
                    </button>
                    <button
                        className={`notes-mode-btn ${mode === 'preview' ? 'active' : ''}`}
                        onClick={() => setMode('preview')}
                        title="Preview Mode"
                    >
                        <Eye size={14} /> Preview
                    </button>
                </div>

                {/* Actions */}
                <div className="notes-actions-group">
                    {/* Screenshot */}
                    <div className="screenshot-dropdown">
                        <button
                            className="notes-action-btn"
                            onClick={() => { setShowScreenshotMenu(!showScreenshotMenu); setShowCopyMenu(false); }}
                        >
                            <Camera size={14} /> Export <ChevronDown size={12} />
                        </button>
                        {showScreenshotMenu && (
                            <div className="screenshot-dropdown-menu">
                                <button className="screenshot-dropdown-item" onClick={() => handleScreenshot('light')}>
                                    <Sun size={14} /> Light Theme
                                </button>
                                <button className="screenshot-dropdown-item" onClick={() => handleScreenshot('dark')}>
                                    <Moon size={14} /> Dark Theme
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Copy */}
                    <div className="screenshot-dropdown">
                        <button
                            className="notes-action-btn"
                            onClick={() => { setShowCopyMenu(!showCopyMenu); setShowScreenshotMenu(false); }}
                        >
                            <Copy size={14} /> Copy <ChevronDown size={12} />
                        </button>
                        {showCopyMenu && (
                            <div className="screenshot-dropdown-menu">
                                <button className="screenshot-dropdown-item" onClick={handleCopyHtml}>
                                    <FileText size={14} /> Formatted HTML
                                </button>
                                <button className="screenshot-dropdown-item" onClick={handleCopyPlain}>
                                    <Type size={14} /> Plain Text
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar (edit or split mode) */}
            {(mode === 'edit' || mode === 'split') && (
                <div className="notes-toolbar">
                    {/* Font Family */}
                    <select
                        className="notes-toolbar-select"
                        value={defaultFont}
                        onChange={(e) => {
                            onFontChange(e.target.value);
                            editor.chain().focus().setFontFamily(e.target.value).run();
                        }}
                        title="Font Family"
                    >
                        {fontOptions.map((f) => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>

                    {/* Font Size */}
                    <select
                        className="notes-toolbar-select"
                        onChange={(e) => {
                            // TipTap does not have a built-in font size extension,
                            // we apply it via style on the editor root
                            const wrapper = editorRef.current;
                            if (wrapper) {
                                const tiptap = wrapper.querySelector('.tiptap') as HTMLElement;
                                if (tiptap) tiptap.style.fontSize = e.target.value;
                            }
                        }}
                        defaultValue="16px"
                        title="Font Size"
                    >
                        {FONT_SIZES.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <div className="notes-toolbar-divider" />

                    {/* Headings */}
                    <button className={`notes-toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"><Heading1 size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"><Heading2 size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"><Heading3 size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('heading', { level: 4 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} title="Heading 4"><Heading4 size={16} /></button>

                    <div className="notes-toolbar-divider" />

                    {/* Text formatting */}
                    <button className={`notes-toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><Strikethrough size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight"><Highlighter size={16} /></button>

                    <div className="notes-toolbar-divider" />

                    {/* Lists */}
                    <button className={`notes-toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><List size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List"><ListOrdered size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task List"><CheckSquare size={16} /></button>

                    <div className="notes-toolbar-divider" />

                    {/* Block elements */}
                    <button className={`notes-toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote"><Quote size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block"><Code size={16} /></button>
                    <button className="notes-toolbar-btn" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={16} /></button>

                    <div className="notes-toolbar-divider" />

                    {/* Alignment */}
                    <button className={`notes-toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left"><AlignLeft size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center"><AlignCenter size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right"><AlignRight size={16} /></button>
                    <button className={`notes-toolbar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify"><AlignJustify size={16} /></button>

                    <div className="notes-toolbar-divider" />

                    {/* Link */}
                    <button className={`notes-toolbar-btn ${editor.isActive('link') ? 'active' : ''}`} onClick={handleInsertLink} title="Insert Link"><LinkIcon size={16} /></button>

                    {/* Color Picker */}
                    <input
                        type="color"
                        className="notes-toolbar-color"
                        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                        title="Text Color"
                        defaultValue="#000000"
                    />
                </div>
            )}

            {/* Content Area */}
            {mode === 'edit' ? (
                <div className="notes-editor-wrapper" ref={editorRef}>
                    <EditorContent editor={editor} />
                </div>
            ) : mode === 'split' ? (
                <div className="notes-editor-wrapper split-mode">
                    <div className="notes-editor-pane" ref={editorRef}>
                        <EditorContent editor={editor} />
                    </div>
                    <div
                        className="notes-preview-pane"
                        style={{ fontFamily: defaultFont || 'Inter, sans-serif' }}
                        dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
                    />
                </div>
            ) : (
                <div
                    className="notes-preview"
                    ref={previewRef}
                    style={{ fontFamily: defaultFont || 'Inter, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
                />
            )}
        </div>
    );
}
