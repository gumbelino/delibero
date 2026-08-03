import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("returns empty string for blank input", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("   \n  ")).toBe("");
  });

  it("wraps prose in paragraphs and joins wrapped lines", () => {
    expect(renderMarkdown("one\ntwo\n\nthree")).toBe("<p>one two</p>\n<p>three</p>");
  });

  it("renders headings starting at h2", () => {
    // h1 is the recommendation name on the page, so authored headings sit below it.
    expect(renderMarkdown("# Title")).toBe("<h2>Title</h2>");
    expect(renderMarkdown("### Deep")).toBe("<h4>Deep</h4>");
  });

  it("renders bold, italic and code", () => {
    expect(renderMarkdown("**b** and *i*")).toBe("<p><strong>b</strong> and <em>i</em></p>");
    expect(renderMarkdown("use `npm run dev`")).toBe("<p>use <code>npm run dev</code></p>");
  });

  it("does not treat digits in prose as a code placeholder", () => {
    expect(renderMarkdown("step 0 of 3")).toBe("<p>step 0 of 3</p>");
  });

  it("leaves markdown inside code spans alone", () => {
    expect(renderMarkdown("`**not bold**`")).toBe("<p><code>**not bold**</code></p>");
  });

  it("renders bullet and numbered lists", () => {
    expect(renderMarkdown("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
    expect(renderMarkdown("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
  });

  it("renders links, opening external ones in a new tab", () => {
    expect(renderMarkdown("[x](https://a.test)")).toBe(
      '<p><a href="https://a.test" target="_blank" rel="noopener noreferrer">x</a></p>',
    );
    expect(renderMarkdown("[x](/recommendations)")).toBe('<p><a href="/recommendations">x</a></p>');
  });

  it("renders blockquotes and horizontal rules", () => {
    expect(renderMarkdown("> quoted")).toBe("<blockquote>quoted</blockquote>");
    expect(renderMarkdown("---")).toBe("<hr />");
  });

  /* ---- Safety: the output goes through dangerouslySetInnerHTML ------------ */

  it("escapes raw HTML rather than emitting it", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("escapes img onerror payloads", () => {
    expect(renderMarkdown('<img src=x onerror="alert(1)">')).toContain("&lt;img");
  });

  it("strips javascript: links, keeping the label", () => {
    expect(renderMarkdown("[click](javascript:alert)")).toBe("<p>click</p>");
  });

  it("strips javascript: links whose URL contains parentheses", () => {
    // The URL pattern stops at the first ")", so the tail leaks through as
    // literal text. That is cosmetic; what matters is that no anchor is emitted.
    const out = renderMarkdown("[click](javascript:alert(1))");
    expect(out).not.toContain("<a");
    expect(out).not.toContain("javascript:");
  });

  it("strips data: links", () => {
    expect(renderMarkdown("[x](data:text/html,<script>alert(1)</script>)")).not.toContain("data:");
  });

  it("cannot break out of an href attribute", () => {
    const out = renderMarkdown('[x](https://a.test/")');
    expect(out).not.toContain('"onmouseover');
    expect(out).toContain("&quot;");
  });
});
