import { useRef, useState } from "react";
import { renderMarkdown } from "../engine/markdown";

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

/**
 * Markdown editor with a formatting toolbar and a live preview.
 *
 * A plain textarea over Markdown rather than a contentEditable WYSIWYG: the
 * stored value stays readable and diffable, it survives a copy-paste out of
 * Word without importing that document's markup, and the preview renders
 * through the same escaping path as the public page, so what an editor sees is
 * exactly what a visitor gets.
 */
export function RichTextEditor({ value, onChange, rows = 12 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /** Wrap or prefix the current selection, then restore focus and selection. */
  function apply(kind: "bold" | "italic" | "h2" | "h3" | "link" | "list" | "quote" | "code") {
    const el = ref.current;
    if (!el) return;

    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    // Line-level marks apply from the start of the selected line.
    const linePrefix = (mark: string) => {
      const lineStart = before.lastIndexOf("\n") + 1;
      const head = value.slice(0, lineStart);
      const rest = value.slice(lineStart);
      const next = `${head}${mark}${rest}`;
      onChange(next);
      queueRestore(start + mark.length, end + mark.length);
    };

    const wrap = (mark: string, placeholder: string) => {
      const text = selected || placeholder;
      const next = `${before}${mark}${text}${mark}${after}`;
      onChange(next);
      queueRestore(start + mark.length, start + mark.length + text.length);
    };

    switch (kind) {
      case "bold":
        return wrap("**", "bold text");
      case "italic":
        return wrap("*", "italic text");
      case "code":
        return wrap("`", "code");
      case "h2":
        return linePrefix("## ");
      case "h3":
        return linePrefix("### ");
      case "list":
        return linePrefix("- ");
      case "quote":
        return linePrefix("> ");
      case "link": {
        const label = selected || "link text";
        const next = `${before}[${label}](https://)${after}`;
        onChange(next);
        // Select the URL so the editor can type straight over it.
        const urlStart = start + label.length + 3;
        return queueRestore(urlStart, urlStart + 8);
      }
    }
  }

  function queueRestore(start: number, end: number) {
    // The value change re-renders the textarea, so restore after that commit.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  return (
    <div className="richtext">
      <div className="richtext-toolbar">
        <button type="button" className="richtext-btn" onClick={() => apply("bold")} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className="richtext-btn" onClick={() => apply("italic")} title="Italic">
          <em>I</em>
        </button>
        <span className="richtext-sep" />
        <button type="button" className="richtext-btn" onClick={() => apply("h2")} title="Heading">
          Heading
        </button>
        <button type="button" className="richtext-btn" onClick={() => apply("h3")} title="Subheading">
          Subheading
        </button>
        <span className="richtext-sep" />
        <button type="button" className="richtext-btn" onClick={() => apply("link")} title="Link">
          Link
        </button>
        <button type="button" className="richtext-btn" onClick={() => apply("list")} title="Bullet list">
          List
        </button>
        <button type="button" className="richtext-btn" onClick={() => apply("quote")} title="Quote">
          Quote
        </button>
        <button type="button" className="richtext-btn" onClick={() => apply("code")} title="Code">
          Code
        </button>
        <button
          type="button"
          className={`richtext-btn richtext-preview-toggle${preview ? " richtext-btn-on" : ""}`}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {preview ? (
        <div
          className="richtext-preview rec-body"
          // Safe: renderMarkdown escapes all input and emits a fixed tag set.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p><em>Nothing to preview.</em></p>" }}
        />
      ) : (
        <textarea
          ref={ref}
          className="rec-form-textarea richtext-input"
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Long-form guidance shown only on this recommendation's own page."
        />
      )}
    </div>
  );
}
