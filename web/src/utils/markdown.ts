/**
 * Tiny markdown → HTML converter for awareness articles.
 * Supports: headings, paragraphs, bold/italic, inline code, fenced code
 * blocks, links, unordered/ordered lists, and blockquotes.
 * All source text is HTML-escaped first, so article content cannot inject markup.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Inline formatting: bold, italic, code, links. Input must already be escaped. */
function renderInline(text: string): string {
  return (
    text
      // `code`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // **bold**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // *italic*
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // [text](url) — only allow http(s) links
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, label: string, url: string) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      })
  )
}

export function markdownToHtml(markdown: string): string {
  const lines = escapeHtml(markdown.replace(/\r\n/g, '\n')).split('\n')
  const out: string[] = []

  let paragraph: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCode = false
  let codeLines: string[] = []
  let quoteLines: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }
  const flushList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }
  const flushQuote = () => {
    if (quoteLines.length > 0) {
      out.push(`<blockquote><p>${renderInline(quoteLines.join(' '))}</p></blockquote>`)
      quoteLines = []
    }
  }
  const flushAll = () => {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (const line of lines) {
    // Fenced code blocks
    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`)
        codeLines = []
        inCode = false
      } else {
        flushAll()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }

    const trimmed = line.trim()

    // Blank line ends any open block
    if (trimmed === '') {
      flushAll()
      continue
    }

    // Headings (# to ######)
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushAll()
      const level = heading[1].length
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    // Blockquote (escaped ">" is "&gt;")
    const quote = /^&gt;\s?(.*)$/.exec(trimmed)
    if (quote) {
      flushParagraph()
      flushList()
      quoteLines.push(quote[1])
      continue
    }

    // Unordered list
    const ulItem = /^[-*]\s+(.*)$/.exec(trimmed)
    if (ulItem) {
      flushParagraph()
      flushQuote()
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
        out.push('<ul>')
      }
      out.push(`<li>${renderInline(ulItem[1])}</li>`)
      continue
    }

    // Ordered list
    const olItem = /^\d+[.)]\s+(.*)$/.exec(trimmed)
    if (olItem) {
      flushParagraph()
      flushQuote()
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
        out.push('<ol>')
      }
      out.push(`<li>${renderInline(olItem[1])}</li>`)
      continue
    }

    // Plain paragraph text
    flushList()
    flushQuote()
    paragraph.push(trimmed)
  }

  // Close any still-open blocks
  if (inCode && codeLines.length > 0) {
    out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`)
  }
  flushAll()

  return out.join('\n')
}
