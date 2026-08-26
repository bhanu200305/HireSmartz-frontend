import React, { useMemo } from 'react';
import TextArea from 'antd/es/input/TextArea';
import { Input, Typography } from '../index';
import {
  parseEmailBody,
  rebuildEmailBody,
} from '../../../shared/utils/notifications/plainTextEmailBody';

interface PlainTextEmailBodyEditorProps {
  htmlBody: string;
  onChange: (nextHtmlBody: string) => void;
  disabled?: boolean;
}

/**
 * A word-processor-style stand-in for editing notification-service's raw
 * `html_body` — no tags, no `style="..."`, just the actual sentences a
 * Company Admin would want to reword: the heading, each paragraph, the
 * button label, the footnote. Every keystroke re-assembles the exact same
 * HTML `PUT .../overrides/{type}` already expects — the backend still
 * receives (and test-renders) `html_body`, unchanged; only how it's edited
 * changes. See `plainTextEmailBody.ts` for the parse/rebuild rules and why
 * they're conservative about what counts as "plain text."
 *
 * Falls back to the original raw-HTML textarea whenever a body doesn't fit
 * that shape (`isRecognized: false`) — an editor that silently hid or
 * mangled a template it didn't understand would be worse than one that
 * admits it's showing markup.
 */
const PlainTextEmailBodyEditor: React.FC<PlainTextEmailBodyEditorProps> = ({
  htmlBody,
  onChange,
  disabled = false,
}) => {
  // Re-derived from the current (possibly already-edited) body on every
  // render rather than held as separate local state — `rebuildEmailBody`
  // is a pure function of "the body so far" plus one field's new value, so
  // there is nothing to keep in sync by hand.
  const parsed = useMemo(() => parseEmailBody(htmlBody), [htmlBody]);

  if (!parsed.isRecognized) {
    return (
      <div>
        <p className="mb-1 block text-sm font-medium text-gray-700">
          Body (HTML — without header/footer, those come from the layout)
        </p>
        <p className="mb-2 text-xs text-amber-600">
          This template&apos;s content doesn&apos;t match the usual shape, so it&apos;s shown as
          raw HTML rather than plain text.
        </p>
        <TextArea
          value={htmlBody}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="font-mono text-xs"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {parsed.heading !== null && (
        <div>
          <Typography variant="body2" className="mb-1 block font-medium text-gray-700">
            Heading
          </Typography>
          <Input
            value={parsed.heading}
            disabled={disabled}
            onChange={(e) => onChange(rebuildEmailBody(htmlBody, { heading: e.target.value }))}
          />
        </div>
      )}

      {parsed.paragraphs.map((paragraph, position) => (
        <div key={paragraph.index}>
          <Typography variant="body2" className="mb-1 block font-medium text-gray-700">
            {parsed.paragraphs.length > 1 ? `Message — line ${position + 1}` : 'Message'}
          </Typography>
          <TextArea
            value={paragraph.text}
            disabled={disabled}
            autoSize={{ minRows: 2 }}
            onChange={(e) =>
              onChange(
                rebuildEmailBody(htmlBody, {
                  paragraphs: [{ index: paragraph.index, text: e.target.value }],
                })
              )
            }
          />
        </div>
      ))}

      {parsed.ctaLabel !== null && (
        <div>
          <Typography variant="body2" className="mb-1 block font-medium text-gray-700">
            Button text
          </Typography>
          <Input
            value={parsed.ctaLabel}
            disabled={disabled}
            onChange={(e) => onChange(rebuildEmailBody(htmlBody, { ctaLabel: e.target.value }))}
          />
          <p className="mt-1 text-xs text-gray-400">
            Where the button links to is set automatically and isn&apos;t editable here.
          </p>
        </div>
      )}

      {parsed.footnote !== null && (
        <div>
          <Typography variant="body2" className="mb-1 block font-medium text-gray-700">
            Footnote
          </Typography>
          <TextArea
            value={parsed.footnote}
            disabled={disabled}
            autoSize={{ minRows: 2 }}
            onChange={(e) => onChange(rebuildEmailBody(htmlBody, { footnote: e.target.value }))}
          />
        </div>
      )}
    </div>
  );
};

export default PlainTextEmailBodyEditor;
