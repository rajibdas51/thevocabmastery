/**
 * FILE: src/components/ui/RichContent.tsx
 *
 * Renders HTML from RichTextEditor with correct heading/list/quote styles.
 * The editor's ProseMirror styles only apply inside the editor — this
 * component applies matching styles to the rendered read-only output.
 *
 * Usage:
 *   import RichContent from '@/components/ui/RichContent'
 *   <RichContent html={focusWriting.content} />
 */

interface RichContentProps {
  html: string
  className?: string
}

export default function RichContent({ html, className = '' }: RichContentProps) {
  return (
    <div
      className={`rich-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}