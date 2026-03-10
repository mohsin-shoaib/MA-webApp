/**
 * Renders HTML string safely (e.g. session notes from Lexical rich text).
 * Uses DOMPurify to strip scripts and dangerous attributes.
 */
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'a',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'blockquote',
]
const ALLOWED_ATTR = ['href', 'target', 'rel']

export interface SanitizedHtmlProps {
  readonly html: string
  readonly className?: string
}

/** Plain text (no tags) is rendered with preserved line breaks; otherwise sanitized HTML. */
export function SanitizedHtml({
  html,
  className,
}: Readonly<SanitizedHtmlProps>) {
  if (!html?.trim()) return null
  const trimmed = html.trim()
  if (!trimmed.includes('<')) {
    return (
      <div className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {trimmed}
      </div>
    )
  }
  const sanitized = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  })
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
