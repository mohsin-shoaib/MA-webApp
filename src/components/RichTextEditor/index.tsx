/**
 * Rich text editor (Lexical) for recovery protocol content and similar uses.
 * Value is HTML string.
 */
import { useEffect, useRef, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html'
import { $getRoot, $insertNodes, $getTextContent } from 'lexical'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import {
  ListItemNode,
  ListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type EditorState,
} from 'lexical'

export interface RichTextEditorProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly minHeight?: string
  readonly className?: string
  readonly id?: string
  /** Max character count (plain text). When exceeded, content is not updated and optional onMaxLengthExceeded is called. */
  readonly maxLength?: number
  /** Called when user input would exceed maxLength (if set). */
  readonly onMaxLengthExceeded?: () => void
}

const RECOVERY_EDITOR_NAMESPACE = 'RecoveryProtocolEditor'

function getTextLengthFromHtml(html: string): number {
  if (typeof document === 'undefined') return 0
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').length
}

const theme = {
  paragraph: 'mb-2 last:mb-0',
  list: { ul: 'list-disc pl-6', ol: 'list-decimal pl-6' },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
}

function InitialHtmlPlugin({
  html,
  lastGoodHtmlRef,
}: Readonly<{
  html: string
  lastGoodHtmlRef?: React.MutableRefObject<string>
}>) {
  const [editor] = useLexicalComposerContext()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    const content = html.trim()
    if (lastGoodHtmlRef) {
      lastGoodHtmlRef.current = content ? html : ''
    }
    if (!content) return
    editor.update(
      () => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(
          content.startsWith('<') ? html : `<p>${html}</p>`,
          'text/html'
        )
        const nodes = $generateNodesFromDOM(editor, dom)
        const root = $getRoot()
        root.clear()
        root.select()
        $insertNodes(nodes)
      },
      { discrete: true }
    )
  }, [editor, html, lastGoodHtmlRef])
  return null
}

function HtmlOnChangePlugin({
  onChange,
  maxLength,
  lastGoodHtmlRef,
  onMaxLengthExceeded,
  onCountChange,
}: Readonly<{
  onChange: (html: string) => void
  maxLength?: number
  lastGoodHtmlRef: React.MutableRefObject<string>
  onMaxLengthExceeded?: () => void
  onCountChange?: (current: number) => void
}>) {
  const handleChange = (
    editorState: EditorState,
    editorInstance: LexicalEditor
  ) => {
    editorState.read(() => {
      const textContent = $getTextContent()
      const html = $generateHtmlFromNodes(editorInstance, null)
      if (maxLength != null && textContent.length > maxLength) {
        onMaxLengthExceeded?.()
        const prev = lastGoodHtmlRef.current
        if (prev) {
          editorInstance.update(
            () => {
              const parser = new DOMParser()
              const dom = parser.parseFromString(
                prev.trim().startsWith('<') ? prev : `<p>${prev}</p>`,
                'text/html'
              )
              const nodes = $generateNodesFromDOM(editorInstance, dom)
              const root = $getRoot()
              root.clear()
              root.select()
              $insertNodes(nodes)
            },
            { discrete: true }
          )
        }
        return
      }
      lastGoodHtmlRef.current = html
      onChange(html)
      onCountChange?.(textContent.length)
    })
  }
  return <OnChangePlugin ignoreSelectionChange onChange={handleChange} />
}

function CharacterCountPlugin({
  maxLength,
  onCountChange,
}: Readonly<{
  maxLength: number
  onCountChange: (current: number, max: number) => void
}>) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const len = $getTextContent().length
        onCountChange(len, maxLength)
      })
    })
  }, [editor, maxLength, onCountChange])
  return null
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const applyFormat = (
    format: 'bold' | 'italic' | 'underline' | 'strikethrough'
  ) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }
  return (
    <div className="flex flex-wrap items-center gap-1 border border-gray-300 border-b-0 rounded-t bg-gray-50 px-2 py-1">
      <button
        type="button"
        onClick={() => applyFormat('bold')}
        className="rounded px-2 py-1 text-sm font-bold hover:bg-gray-200"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => applyFormat('italic')}
        className="rounded px-2 py-1 text-sm italic hover:bg-gray-200"
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => applyFormat('underline')}
        className="rounded px-2 py-1 text-sm underline hover:bg-gray-200"
        title="Underline"
      >
        U
      </button>
      <button
        type="button"
        onClick={() => applyFormat('strikethrough')}
        className="rounded px-2 py-1 text-sm line-through hover:bg-gray-200"
        title="Strikethrough"
      >
        S
      </button>
      <span className="mx-1 text-gray-300">|</span>
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        className="rounded px-2 py-1 text-sm hover:bg-gray-200"
        title="Bullet list"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        className="rounded px-2 py-1 text-sm hover:bg-gray-200"
        title="Numbered list"
      >
        1. List
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200"
        title="Remove list"
      >
        No list
      </button>
      <span className="mx-1 text-gray-300">|</span>
      <button
        type="button"
        onClick={() => {
          const url = globalThis.prompt('Link URL:', 'https://')
          if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
        }}
        className="rounded px-2 py-1 text-sm hover:bg-gray-200"
        title="Insert link"
      >
        Link
      </button>
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write instructions, steps, or notes...',
  minHeight = '160px',
  className = '',
  id,
  maxLength,
  onMaxLengthExceeded,
}: RichTextEditorProps) {
  const lastGoodHtmlRef = useRef(value ?? '')
  const [charCount, setCharCount] = useState<number | null>(() =>
    maxLength != null ? getTextLengthFromHtml(value ?? '') : null
  )

  useEffect(() => {
    if (maxLength != null) {
      const count = getTextLengthFromHtml(value ?? '')
      const id = setTimeout(() => setCharCount(count), 0)
      return () => clearTimeout(id)
    }
  }, [value, maxLength])
  const initialConfig = {
    namespace: RECOVERY_EDITOR_NAMESPACE,
    theme,
    onError: (err: Error) => console.error('Lexical:', err),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
  }

  return (
    <div className={className} data-rich-text-editor>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin />
        <div className="relative rounded-b border border-gray-300 bg-white">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id={id}
                className="min-h-[120px] resize-none px-3 py-2 text-sm outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:pl-6"
                style={{ minHeight }}
              />
            }
            placeholder={
              <div className="absolute left-3 top-2 text-gray-400 pointer-events-none text-sm">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <InitialHtmlPlugin html={value} lastGoodHtmlRef={lastGoodHtmlRef} />
        <HtmlOnChangePlugin
          onChange={onChange}
          maxLength={maxLength}
          lastGoodHtmlRef={lastGoodHtmlRef}
          onMaxLengthExceeded={onMaxLengthExceeded}
          onCountChange={maxLength != null ? n => setCharCount(n) : undefined}
        />
        {maxLength != null && (
          <CharacterCountPlugin
            maxLength={maxLength}
            onCountChange={current => setCharCount(current)}
          />
        )}
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
      </LexicalComposer>
      {maxLength != null && charCount != null && (
        <div
          className="mt-1 text-right text-xs text-gray-500"
          aria-live="polite"
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
          {charCount > maxLength && (
            <span className="text-red-600 ml-1">(limit reached)</span>
          )}
        </div>
      )}
    </div>
  )
}
