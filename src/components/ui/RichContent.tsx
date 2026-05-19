'use client'
/**
 * FILE: src/components/ui/RichContent.tsx
 * Renders saved HTML from RichTextEditor with proper typography.
 * Styles are injected inline — works on Vercel, no globals.css needed.
 */

interface RichContentProps {
  html: string
  className?: string
}

const STYLES = `
  .rc h1 { font-size:1.6rem; font-weight:800; margin:1.4rem 0 0.6rem; color:var(--text); line-height:1.3; }
  .rc h2 { font-size:1.3rem; font-weight:700; margin:1.2rem 0 0.5rem; color:var(--text); line-height:1.35; }
  .rc h3 { font-size:1.1rem; font-weight:600; margin:1rem 0 0.4rem;  color:var(--text); line-height:1.4; }
  .rc h1:first-child,.rc h2:first-child,.rc h3:first-child { margin-top:0; }
  .rc p  { margin:0.6rem 0; color:var(--text2); line-height:1.85; font-size:15px; }
  .rc p:first-child { margin-top:0; }
  .rc p:last-child  { margin-bottom:0; }
  .rc strong { font-weight:700; color:var(--text); }
  .rc em     { font-style:italic; }
  .rc s      { text-decoration:line-through; }
  .rc u      { text-decoration:underline; }
  .rc mark   { background:rgba(245,200,66,0.30); padding:0 3px; border-radius:3px; color:inherit; }
  .rc a      { color:var(--accent2); text-decoration:underline; }
  .rc a:hover{ opacity:0.8; }
  .rc ul { list-style:disc;    padding-left:1.6rem; margin:0.75rem 0; color:var(--text2); }
  .rc ol { list-style:decimal; padding-left:1.6rem; margin:0.75rem 0; color:var(--text2); }
  .rc li { margin:0.3rem 0; line-height:1.75; }
  .rc blockquote { border-left:3px solid var(--accent); padding:0.4rem 0 0.4rem 1rem; margin:1rem 0; color:var(--text3); font-style:italic; }
  .rc hr { border:none; border-top:1px solid var(--border2); margin:1.5rem 0; }
`

export default function RichContent({ html, className = '' }: RichContentProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        className={`rc ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  )
}