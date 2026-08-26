/**
 * Splits a notification-service email body (raw Jinja/HTML, `cfp-heading` /
 * `cfp-p` / `cfp-cta` / `cfp-footnote` classed elements — see
 * notification-service's seeded templates, e.g. `mfa_login_code`) into plain
 * text a non-technical Company Admin can edit, and reassembles an edited
 * body back into the exact same HTML shape.
 *
 * Every seeded template shares this shape (confirmed against the running
 * `master_email_template` rows: account_locked, account_unlocked,
 * candidate_application_received, candidate_rejected, candidate_selected,
 * mfa_login_code, …) — the CSS classes carry no visual styling of their own
 * (every visual property is already inline `style=`), so they exist for
 * exactly this: a stable hook to find "the heading", "a paragraph", "the
 * button label", "the footnote" without touching markup.
 *
 * Deliberately conservative: a line is only ever offered as editable plain
 * text when it IS plain text — no nested tags (e.g. `<strong>{{ code }}
 * </strong>`, which exists purely to bold a variable, not to be reworded)
 * and not a bare `{{ variable }}` with nothing else (e.g.
 * candidate_adhoc_message's `{{ header }}`/`{{ body }}`, which are filled
 * in per-send from someone else's free-text, not authored copy). Anything
 * that doesn't fit — including a body with no heading at all — reports
 * `isRecognized: false` so the caller can fall back to raw HTML editing
 * rather than risk mis-rendering or silently dropping content.
 */

export interface EditableParagraph {
  /** Position among ALL `cfp-p` matches in the body, editable or not —
   * required so a reconstruction can address the Nth one directly even when
   * an earlier non-editable paragraph (e.g. a bolded variable) sits between
   * two editable ones. */
  index: number;
  text: string;
}

export interface ParsedEmailBody {
  heading: string | null;
  paragraphs: EditableParagraph[];
  ctaLabel: string | null;
  footnote: string | null;
  /** False when this body doesn't look like the standard CFP layout shape —
   * the caller should fall back to a raw HTML editor rather than show an
   * empty or partial form. */
  isRecognized: boolean;
}

export interface EmailBodyEdits {
  heading?: string;
  paragraphs?: EditableParagraph[];
  ctaLabel?: string;
  footnote?: string;
}

const HEADING_RE = /(<h1 class="cfp-heading"[^>]*>)([\s\S]*?)(<\/h1>)/;
const PARAGRAPH_RE_SOURCE = '(<p class="cfp-p"[^>]*>)([\\s\\S]*?)(<\\/p>)';
const CTA_RE = /(<a class="cfp-cta"[^>]*>)([\s\S]*?)(<\/a>)/;
const FOOTNOTE_RE = /(<td class="cfp-footnote"[^>]*>)([\s\S]*?)(<\/td>)/;

//: A line that is nothing but one Jinja expression — filled in per-send from
//: data this editor has no business rewording (a candidate's own message, a
//: generated code, …), not authored copy.
const VARIABLE_ONLY_RE = /^\{\{\s*[\w.]+(?:\s*\|[^}]+)?\s*\}\}$/;

const hasMarkup = (text: string): boolean => /<[a-z][\s\S]*>/i.test(text);

/** True only for a line safe to show and edit as plain text. */
const isPlainEditableText = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasMarkup(trimmed)) return false;
  if (VARIABLE_ONLY_RE.test(trimmed)) return false;
  return true;
};

// Only the handful of entities these seeded templates actually use — not a
// general HTML-entity decoder, which this editor has no need to be.
const decodeEntities = (text: string): string =>
  text
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// Order matters — `&` must go last, or re-escaping `&lt;` back in would
// double-encode the `&` it just produced.
const encodeEntities = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parseEmailBody(html: string): ParsedEmailBody {
  const headingMatch = HEADING_RE.exec(html);
  const headingText = headingMatch?.[2] ?? '';
  const heading =
    headingMatch && isPlainEditableText(headingText) ? decodeEntities(headingText.trim()) : null;

  const paragraphs: EditableParagraph[] = [];
  const paragraphRe = new RegExp(PARAGRAPH_RE_SOURCE, 'g');
  let match: RegExpExecArray | null;
  let position = 0;
  while ((match = paragraphRe.exec(html)) !== null) {
    const raw = match[2];
    if (isPlainEditableText(raw)) {
      paragraphs.push({ index: position, text: decodeEntities(raw.trim()) });
    }
    position += 1;
  }

  const ctaMatch = CTA_RE.exec(html);
  const ctaText = ctaMatch?.[2] ?? '';
  const ctaLabel = ctaMatch && isPlainEditableText(ctaText) ? decodeEntities(ctaText.trim()) : null;

  const footnoteMatch = FOOTNOTE_RE.exec(html);
  const footnoteText = footnoteMatch?.[2] ?? '';
  const footnote =
    footnoteMatch && isPlainEditableText(footnoteText) ? decodeEntities(footnoteText.trim()) : null;

  // A real CFP template always has a heading, and always says SOMETHING
  // (a paragraph or a footnote) — a body missing both looks like a shape
  // this parser doesn't understand, not a template with nothing to show.
  const isRecognized = heading !== null && (paragraphs.length > 0 || footnote !== null);

  return { heading, paragraphs, ctaLabel, footnote, isRecognized };
}

export function rebuildEmailBody(originalHtml: string, edits: EmailBodyEdits): string {
  let html = originalHtml;

  if (edits.heading !== undefined) {
    html = html.replace(
      HEADING_RE,
      (_full, open: string, _old: string, close: string) =>
        `${open}${encodeEntities(edits.heading!)}${close}`
    );
  }

  if (edits.paragraphs) {
    const byIndex = new Map(edits.paragraphs.map((p) => [p.index, p.text]));
    let position = 0;
    html = html.replace(
      new RegExp(PARAGRAPH_RE_SOURCE, 'g'),
      (full: string, open: string, _old: string, close: string) => {
        const current = position;
        position += 1;
        const edited = byIndex.get(current);
        return edited === undefined ? full : `${open}${encodeEntities(edited)}${close}`;
      }
    );
  }

  if (edits.ctaLabel !== undefined) {
    html = html.replace(
      CTA_RE,
      (_full, open: string, _old: string, close: string) =>
        `${open}${encodeEntities(edits.ctaLabel!)}${close}`
    );
  }

  if (edits.footnote !== undefined) {
    html = html.replace(
      FOOTNOTE_RE,
      (_full, open: string, _old: string, close: string) =>
        `${open}${encodeEntities(edits.footnote!)}${close}`
    );
  }

  return html;
}
