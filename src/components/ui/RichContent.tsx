/**
 * FILE: src/components/ui/RichContent.tsx
 * Renders saved HTML from RichTextEditor.
 * Styles live in globals.css under @layer utilities (.rich-content)
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