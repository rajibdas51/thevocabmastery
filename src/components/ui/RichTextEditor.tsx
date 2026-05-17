'use client'
/**
 * FILE: src/components/ui/RichTextEditor.tsx
 * Rich text editor built on Tiptap.
 * Used in: Focus Writing, Editorials.
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Undo, Redo,
  Highlighter, Link2, Heading1, Heading2, Heading3,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

const ToolbarBtn = ({
  active, onClick, title, children
}: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-all',
      active
        ? 'bg-[var(--accent)]/20 text-[var(--accent2)]'
        : 'text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
    )}
  >
    {children}
  </button>
)

const Divider = () => (
  <div className="w-px h-5 mx-0.5 self-center" style={{ background: 'var(--border2)' }} />
)

export default function RichTextEditor({
  value, onChange, placeholder = 'Start writing...', className, minHeight = '280px'
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[var(--accent2)] underline' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'outline-none prose-content min-h-[inherit] px-4 py-3',
      },
    },
  })

  // Sync external value changes (e.g. AI fill)
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) editor.chain().focus().setLink({ href: url }).run()
    else editor.chain().focus().unsetLink().run()
  }

  return (
    <div
      className={cn('rounded-xl border overflow-hidden', className)}
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border2)' }}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 p-2 border-b"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border2)' }}
      >
        {/* Headings */}
        <ToolbarBtn active={editor.isActive('heading',{level:1})} onClick={()=>editor.chain().focus().toggleHeading({level:1}).run()} title="Heading 1">
          <Heading1 className="w-3.5 h-3.5"/>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('heading',{level:2})} onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()} title="Heading 2">
          <Heading2 className="w-3.5 h-3.5"/>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('heading',{level:3})} onClick={()=>editor.chain().focus().toggleHeading({level:3}).run()} title="Heading 3">
          <Heading3 className="w-3.5 h-3.5"/>
        </ToolbarBtn>

        <Divider />

        {/* Formatting */}
        <ToolbarBtn active={editor.isActive('bold')}          onClick={()=>editor.chain().focus().toggleBold().run()}          title="Bold">          <Bold           className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('italic')}        onClick={()=>editor.chain().focus().toggleItalic().run()}        title="Italic">        <Italic         className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('underline')}     onClick={()=>editor.chain().focus().toggleUnderline().run()}     title="Underline">     <UnderlineIcon  className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('strike')}        onClick={()=>editor.chain().focus().toggleStrike().run()}        title="Strikethrough"> <Strikethrough  className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('highlight')}     onClick={()=>editor.chain().focus().toggleHighlight().run()}     title="Highlight">     <Highlighter    className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('link')}          onClick={setLink}                                                title="Link">          <Link2          className="w-3.5 h-3.5"/></ToolbarBtn>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn active={editor.isActive({textAlign:'left'})}    onClick={()=>editor.chain().focus().setTextAlign('left').run()}    title="Align Left">    <AlignLeft    className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({textAlign:'center'})}  onClick={()=>editor.chain().focus().setTextAlign('center').run()}  title="Center">        <AlignCenter  className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({textAlign:'right'})}   onClick={()=>editor.chain().focus().setTextAlign('right').run()}   title="Align Right">   <AlignRight   className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({textAlign:'justify'})} onClick={()=>editor.chain().focus().setTextAlign('justify').run()} title="Justify">       <AlignJustify className="w-3.5 h-3.5"/></ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn active={editor.isActive('bulletList')}   onClick={()=>editor.chain().focus().toggleBulletList().run()}   title="Bullet List">   <List        className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('orderedList')}  onClick={()=>editor.chain().focus().toggleOrderedList().run()}  title="Ordered List">  <ListOrdered className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('blockquote')}   onClick={()=>editor.chain().focus().toggleBlockquote().run()}   title="Quote">         <Quote       className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={false}                           onClick={()=>editor.chain().focus().setHorizontalRule().run()}  title="Divider">       <Minus       className="w-3.5 h-3.5"/></ToolbarBtn>

        <Divider />

        {/* Undo/Redo */}
        <ToolbarBtn active={false} onClick={()=>editor.chain().focus().undo().run()} title="Undo"><Undo className="w-3.5 h-3.5"/></ToolbarBtn>
        <ToolbarBtn active={false} onClick={()=>editor.chain().focus().redo().run()} title="Redo"><Redo className="w-3.5 h-3.5"/></ToolbarBtn>
      </div>

      {/* Editor area */}
      <div style={{ minHeight }}>
        <style>{`
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: var(--text3);
            pointer-events: none;
            height: 0;
          }
          .ProseMirror h1 { font-size: 1.5rem; font-weight: 800; margin: 1rem 0 0.5rem; color: var(--text); }
          .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--text); }
          .ProseMirror h3 { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.4rem; color: var(--text); }
          .ProseMirror p { margin: 0.5rem 0; color: var(--text2); line-height: 1.8; }
          .ProseMirror ul { list-style: disc; padding-left: 1.5rem; color: var(--text2); }
          .ProseMirror ol { list-style: decimal; padding-left: 1.5rem; color: var(--text2); }
          .ProseMirror li { margin: 0.25rem 0; }
          .ProseMirror blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1rem 0; color: var(--text3); font-style: italic; }
          .ProseMirror hr { border: none; border-top: 1px solid var(--border2); margin: 1.5rem 0; }
          .ProseMirror mark { background: rgba(245,200,66,0.3); padding: 0 2px; border-radius: 2px; }
          .ProseMirror strong { font-weight: 700; color: var(--text); }
          .ProseMirror em { font-style: italic; }
          .ProseMirror s { text-decoration: line-through; }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
