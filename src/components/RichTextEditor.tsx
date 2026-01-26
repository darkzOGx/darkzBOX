'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useState, useCallback, useEffect } from 'react';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Link as LinkIcon, List, ListOrdered, AlignLeft, AlignCenter,
    AlignRight, Undo, Redo, Code, Variable, Indent, Outdent
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    showVariables?: boolean;
    variables?: { label: string; value: string }[];
}

const DEFAULT_VARIABLES = [
    { label: 'First Name', value: '{firstName}' },
    { label: 'Last Name', value: '{lastName}' },
    { label: 'Company Name', value: '{companyName}' },
    { label: 'Email', value: '{email}' },
];

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'Start writing...',
    className,
    minHeight = '150px',
    showVariables = true,
    variables = DEFAULT_VARIABLES
}: RichTextEditorProps) {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showVariablesDropdown, setShowVariablesDropdown] = useState(false);
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [htmlSource, setHtmlSource] = useState(content);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer',
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            TextStyle,
            Color,
        ],
        content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none',
                style: `min-height: ${minHeight}`,
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            setHtmlSource(html);
            onChange(html);
        },
    });

    // Update editor content when prop changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
            setHtmlSource(content);
        }
    }, [content, editor]);

    // Sync HTML source changes back to editor when switching modes
    const handleModeToggle = useCallback(() => {
        if (isHtmlMode && editor) {
            // Switching from HTML to visual - update editor with HTML source
            editor.commands.setContent(htmlSource);
            onChange(htmlSource);
        }
        setIsHtmlMode(!isHtmlMode);
    }, [isHtmlMode, htmlSource, editor, onChange]);

    const handleHtmlSourceChange = useCallback((value: string) => {
        setHtmlSource(value);
        onChange(value);
    }, [onChange]);

    const setLink = useCallback(() => {
        if (!editor) return;

        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            setShowLinkInput(false);
            return;
        }

        const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        setShowLinkInput(false);
        setLinkUrl('');
    }, [editor, linkUrl]);

    const insertVariable = useCallback((variable: string) => {
        if (isHtmlMode) {
            // Insert at cursor position in textarea
            const textarea = document.querySelector('textarea[data-html-source]') as HTMLTextAreaElement;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newValue = htmlSource.substring(0, start) + variable + htmlSource.substring(end);
                setHtmlSource(newValue);
                onChange(newValue);
                // Restore cursor position after variable
                setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + variable.length;
                    textarea.focus();
                }, 0);
            }
        } else if (editor) {
            editor.chain().focus().insertContent(variable).run();
        }
        setShowVariablesDropdown(false);
    }, [editor, isHtmlMode, htmlSource, onChange]);

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({ onClick, active, disabled, children, title }: {
        onClick: () => void;
        active?: boolean;
        disabled?: boolean;
        children: React.ReactNode;
        title?: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "p-1.5 rounded hover:bg-white/10 transition-colors text-white/70",
                active && "bg-white/20 text-blue-400",
                disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className={cn("border border-white/10 rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm", className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/10 bg-white/5">
                {/* Text formatting */}
                <div className="flex items-center gap-0.5 pr-2 border-r border-white/10">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        active={editor.isActive('bold')}
                        disabled={isHtmlMode}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        active={editor.isActive('italic')}
                        disabled={isHtmlMode}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        active={editor.isActive('underline')}
                        disabled={isHtmlMode}
                        title="Underline"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        active={editor.isActive('strike')}
                        disabled={isHtmlMode}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Lists & Indentation */}
                <div className="flex items-center gap-0.5 px-2 border-r border-white/10">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        active={editor.isActive('bulletList')}
                        disabled={isHtmlMode}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        active={editor.isActive('orderedList')}
                        disabled={isHtmlMode}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
                        disabled={isHtmlMode || !editor.can().sinkListItem('listItem')}
                        title="Increase Indent"
                    >
                        <Indent className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
                        disabled={isHtmlMode || !editor.can().liftListItem('listItem')}
                        title="Decrease Indent"
                    >
                        <Outdent className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5 px-2 border-r border-white/10">
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        active={editor.isActive({ textAlign: 'left' })}
                        disabled={isHtmlMode}
                        title="Align Left"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        active={editor.isActive({ textAlign: 'center' })}
                        disabled={isHtmlMode}
                        title="Align Center"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        active={editor.isActive({ textAlign: 'right' })}
                        disabled={isHtmlMode}
                        title="Align Right"
                    >
                        <AlignRight className="w-4 h-4" />
                    </ToolbarButton>
                </div>

                {/* Link */}
                <div className="flex items-center gap-0.5 px-2 border-r border-white/10 relative">
                    <ToolbarButton
                        onClick={() => {
                            if (editor.isActive('link')) {
                                editor.chain().focus().unsetLink().run();
                            } else {
                                setShowLinkInput(!showLinkInput);
                            }
                        }}
                        active={editor.isActive('link')}
                        disabled={isHtmlMode}
                        title="Add Link"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </ToolbarButton>
                    {showLinkInput && !isHtmlMode && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-slate-900 border border-white/10 rounded-lg shadow-xl p-2 flex gap-2">
                            <input
                                type="text"
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setLink()}
                                className="px-2 py-1 text-sm bg-black/40 border border-white/10 rounded outline-none focus:border-blue-500 w-48 text-white"
                                autoFocus
                            />
                            <button
                                onClick={setLink}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Variables */}
                {showVariables && variables.length > 0 && (
                    <div className="flex items-center gap-0.5 px-2 border-r border-white/10 relative">
                        <ToolbarButton
                            onClick={() => setShowVariablesDropdown(!showVariablesDropdown)}
                            title="Insert Variable"
                        >
                            <Variable className="w-4 h-4" />
                        </ToolbarButton>
                        {showVariablesDropdown && (
                            <div className="absolute top-full left-0 mt-1 z-10 bg-slate-900 border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
                                {variables.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => insertVariable(opt.value)}
                                        className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex justify-between items-center text-white/80"
                                    >
                                        <span>{opt.label}</span>
                                        <code className="text-xs text-white/40">{opt.value}</code>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* HTML Toggle & Undo/Redo */}
                <div className="flex items-center gap-0.5 pl-2 ml-auto">
                    <ToolbarButton
                        onClick={handleModeToggle}
                        active={isHtmlMode}
                        title={isHtmlMode ? "Switch to Visual Editor" : "Switch to HTML Source"}
                    >
                        <Code className="w-4 h-4" />
                    </ToolbarButton>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={isHtmlMode}
                        title="Undo"
                    >
                        <Undo className="w-4 h-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={isHtmlMode}
                        title="Redo"
                    >
                        <Redo className="w-4 h-4" />
                    </ToolbarButton>
                </div>
            </div>

            {/* Editor Content or HTML Source */}
            {isHtmlMode ? (
                <textarea
                    data-html-source
                    value={htmlSource}
                    onChange={(e) => handleHtmlSourceChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-4 font-mono text-sm bg-black/40 text-green-400 focus:outline-none resize-none"
                    style={{ minHeight }}
                />
            ) : (
                <EditorContent
                    editor={editor}
                    className="p-4 text-white/90 [&_.ProseMirror]:prose-invert [&_.ProseMirror_p]:text-white/80 [&_.ProseMirror_h1]:text-white [&_.ProseMirror_h2]:text-white [&_.ProseMirror_h3]:text-white [&_.ProseMirror_a]:text-blue-400"
                />
            )}
        </div>
    );
}
