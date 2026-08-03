// A deliberately small Markdown subset for recommendation bodies.
//
// Why not a Markdown library: every general parser passes raw HTML through by
// design, which would need a sanitizer alongside it. Here the input is escaped
// *first* and only the tags below are ever emitted, so no authored content can
// inject markup — including a `<script>` typed into the admin editor.
//
// Supported: # ## ### headings, **bold**, *italic*, `code`, [links](url),
// - bullet lists, 1. numbered lists, > quotes, --- rules, and paragraphs.

const CODE_MARKER = "\u0000";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only http(s), mailto and site-relative links survive — blocks `javascript:`. */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  return /^(https?:\/\/|mailto:|\/)/i.test(trimmed) ? trimmed : null;
}

/** Inline formatting, applied to already-escaped text. */
function inline(text: string): string {
  let out = text;

  // Code spans are extracted first so their contents are not re-processed for
  // other markers. The placeholder uses NUL, which escaped text can never
  // contain, so it cannot collide with prose such as "step 0 of 3".
  const codes: string[] = [];
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(code);
    return `${CODE_MARKER}${codes.length - 1}${CODE_MARKER}`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const href = safeHref(url);
    if (!href) return label;
    const external = /^https?:\/\//i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${href}"${attrs}>${label}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return out.replace(
    new RegExp(`${CODE_MARKER}(\\d+)${CODE_MARKER}`, "g"),
    (_m, i: string) => `<code>${codes[Number(i)]}</code>`,
  );
}

/**
 * Render the Markdown subset to an HTML string safe for dangerouslySetInnerHTML.
 * Returns "" for empty input so callers can test truthiness.
 */
export function renderMarkdown(source: string): string {
  if (!source?.trim()) return "";

  const lines = escapeHtml(source).replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((i) => `<li>${inline(i)}</li>`).join("");
    html.push(`<${list.type}>${items}</${list.type}>`);
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushAll();
      // The page already renders the recommendation name as h1.
      const level = heading[1].length + 1;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushAll();
      html.push("<hr />");
      continue;
    }

    const quote = /^&gt;\s?(.*)$/.exec(trimmed);
    if (quote) {
      flushAll();
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? "ul" : "ol";
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushAll();
  return html.join("\n");
}
