/**
 * Rich text editor (Lexical) for recovery protocol content and similar uses.
 * Value is HTML string.
 */
import { useEffect, useRef } from 'react'
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
import { $getRoot, $insertNodes } from 'lexical'
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
}

const RECOVERY_EDITOR_NAMESPACE = 'RecoveryProtocolEditor'

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

function InitialHtmlPlugin({ html }: Readonly<{ html: string }>) {
  const [editor] = useLexicalComposerContext()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !html.trim()) return
    done.current = true
    editor.update(
      () => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(
          html.trim().startsWith('<') ? html : `<p>${html}</p>`,
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
  }, [editor, html])
  return null
}

function HtmlOnChangePlugin({
  onChange,
}: Readonly<{ onChange: (html: string) => void }>) {
  const handleChange = (
    editorState: EditorState,
    editorInstance: LexicalEditor
  ) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editorInstance, null)
      onChange(html)
    })
  }
  return <OnChangePlugin ignoreSelectionChange onChange={handleChange} />
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
}: RichTextEditorProps) {
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
        <InitialHtmlPlugin html={value} />
        <HtmlOnChangePlugin onChange={onChange} />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
      </LexicalComposer>
    </div>
  )
}
