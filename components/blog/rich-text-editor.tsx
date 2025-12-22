"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontSize } from "@/lib/tiptap-fontsize";
import { useCallback, useEffect, useState } from "react";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder, className = "" }: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline hover:text-accent/80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
        validate: (href) => {
          // Prevent invalid URLs from causing errors
          try {
            // Allow relative URLs
            if (href.startsWith('/') || href.startsWith('#')) {
              return true;
            }
            // Require valid protocol for absolute URLs
            return /^https?:\/\/.+/.test(href);
          } catch {
            return false;
          }
        },
      }),
      Underline,
      TextStyle,
      FontSize,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Debounce updates to prevent flickering
      const html = editor.getHTML();
      if (html !== content) {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: `
          prose prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3 text-foreground
          prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-foreground
          prose-h1:text-4xl sm:prose-h1:text-5xl prose-h1:mb-6 prose-h1:mt-8
          prose-h2:text-3xl sm:prose-h2:text-4xl prose-h2:mb-5 prose-h2:mt-7
          prose-h3:text-2xl sm:prose-h3:text-3xl prose-h3:mb-4 prose-h3:mt-6
          prose-p:text-lg prose-p:leading-relaxed prose-p:mb-4 prose-p:text-foreground/90
          prose-a:text-accent prose-a:font-bold prose-a:no-underline hover:prose-a:text-accent/80 hover:prose-a:underline
          prose-strong:text-foreground prose-strong:font-black
          prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-foreground/80
          prose-code:bg-foreground/10 prose-code:text-foreground prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-semibold
          prose-ul:list-disc prose-ul:pl-6 prose-ul:text-foreground/90
          prose-ol:list-decimal prose-ol:pl-6 prose-ol:text-foreground/90
          prose-li:mb-2
        `.trim().replace(/\s+/g, ' '),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only update if editor is not focused to prevent disrupting typing
      if (!editor.isFocused) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    // Get current link
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setLinkDialogOpen(true);
  }, [editor]);

  const saveLink = useCallback(() => {
    if (!editor) return;

    // Empty
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkDialogOpen(false);
      return;
    }

    // Validate and fix URL
    let validUrl = linkUrl.trim();
    
    // If it doesn't start with http://, https://, /, or #, add https://
    if (validUrl && !validUrl.match(/^(https?:\/\/|\/|#)/)) {
      validUrl = 'https://' + validUrl;
    }

    // Update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: validUrl }).run();
    setLinkDialogOpen(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    active, 
    disabled, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      style={active 
        ? { backgroundColor: '#586034', color: '#fff' } 
        : { color: '#666', backgroundColor: 'transparent' }
      }
      type="button"
    >
      {children}
    </button>
  );

  return (
    <div className={`border rounded-lg ${className}`} style={{ borderColor: 'rgba(0,0,0,0.15)', backgroundColor: '#fff' }}>
      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
          color: #1a1a1a !important;
        }
        .ProseMirror h1 {
          font-size: 2.5rem !important;
          line-height: 1.2 !important;
          margin-top: 2rem !important;
          margin-bottom: 1.5rem !important;
          color: #1a1a1a !important;
        }
        .ProseMirror h2 {
          font-size: 2rem !important;
          line-height: 1.3 !important;
          margin-top: 1.75rem !important;
          margin-bottom: 1.25rem !important;
          color: #1a1a1a !important;
        }
        .ProseMirror h3 {
          font-size: 1.5rem !important;
          line-height: 1.4 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 1rem !important;
          color: #1a1a1a !important;
        }
        .ProseMirror p {
          font-size: 1.125rem !important;
          line-height: 1.75 !important;
          margin-bottom: 1rem !important;
          color: #333 !important;
        }
        .ProseMirror strong {
          font-weight: 900 !important;
          color: #1a1a1a !important;
        }
        .ProseMirror a {
          color: #586034 !important;
          font-weight: 700 !important;
          text-decoration: none !important;
        }
        .ProseMirror a:hover {
          text-decoration: underline !important;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem !important;
          margin-bottom: 1rem !important;
          list-style-position: outside !important;
        }
        .ProseMirror ul {
          list-style-type: disc !important;
        }
        .ProseMirror ol {
          list-style-type: decimal !important;
        }
        .ProseMirror li {
          margin-bottom: 0.5rem !important;
          display: list-item !important;
          color: #333 !important;
        }
        .ProseMirror li p {
          margin-bottom: 0.25rem !important;
        }
        .ProseMirror blockquote {
          border-left: 4px solid #586034 !important;
          padding-left: 1.5rem !important;
          font-style: italic !important;
          margin: 1.5rem 0 !important;
          color: #666 !important;
        }
        .ProseMirror code {
          background-color: rgba(0, 0, 0, 0.05) !important;
          padding: 0.125rem 0.5rem !important;
          border-radius: 0.25rem !important;
          font-family: monospace !important;
          font-size: 0.9em !important;
          color: #1a1a1a !important;
        }
      `}</style>
      {/* Toolbar */}
      <div className="p-2 flex flex-wrap gap-1 items-center" style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {/* Headings */}
        <div className="flex gap-1 pr-2" style={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1 (Large)"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2 (Medium)"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3 (Small)"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Text Formatting */}
        <div className="flex gap-1 pr-2" style={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex gap-1 pr-2" style={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Other */}
        <div className="flex gap-1 pr-2" style={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}>
          <ToolbarButton
            onClick={setLink}
            active={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Font Size */}
        <div className="flex gap-1 pr-2" style={{ borderRight: '1px solid rgba(0,0,0,0.1)' }}>
          <Select
            value={editor.getAttributes('textStyle').fontSize || '16px'}
            onValueChange={(value) => {
              if (value === 'default') {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(value).run();
              }
            }}
          >
            <SelectTrigger className="h-8 w-24 text-xs font-bold uppercase">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="10px">10pt</SelectItem>
              <SelectItem value="11px">11pt</SelectItem>
              <SelectItem value="12px">12pt</SelectItem>
              <SelectItem value="13px">13pt</SelectItem>
              <SelectItem value="14px">14pt</SelectItem>
              <SelectItem value="16px">16pt</SelectItem>
              <SelectItem value="18px">18pt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Add Link
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Enter the URL for the link.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="linkUrl" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
              URL
            </Label>
            <Input
              id="linkUrl"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-12 text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveLink();
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLinkDialogOpen(false);
                setLinkUrl('');
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={saveLink}
              className="font-black uppercase tracking-wider"
              style={{ backgroundColor: '#586034', fontWeight: '900' }}
            >
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
