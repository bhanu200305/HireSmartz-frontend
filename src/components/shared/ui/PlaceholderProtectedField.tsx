import React, { useRef } from 'react';
import AntdTextArea from 'antd/es/input/TextArea';
import { Input, showToast } from '../index';
import {
  EMAIL_PLACEHOLDER_PROTECTED_MESSAGE,
  expandSelectionToPlaceholders,
  inputTypeToPlaceholderGuardKey,
  resolveProtectedEmailContent,
  selectionIntersectsPlaceholder,
  shouldBlockPlaceholderEdit,
} from '../../../shared/utils/notifications/emailPlaceholderProtection';

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

interface CommonProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface InputVariantProps extends CommonProps {
  as?: 'input';
}

interface TextAreaVariantProps extends CommonProps {
  as: 'textarea';
  rows?: number;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

type PlaceholderProtectedFieldProps = InputVariantProps | TextAreaVariantProps;

/**
 * An `Input` (single line) or `TextArea` (multi line) that refuses to let a
 * `{{ variable }}` token be typed into, deleted, or overwritten — only the
 * text around it stays editable. Used everywhere the Notification Copy /
 * Email Templates editor lets a Company Admin reword a system message:
 * Subject, and the Heading/Message/Button/Footnote/SMS fields
 * `PlainTextEmailBodyEditor` renders.
 *
 * See `emailPlaceholderProtection.ts` for why this exists and why it is
 * deliberately stricter than the sibling SMS placeholder guard (that one
 * allows a clean full-token delete; this one does not allow removal at all).
 */
const PlaceholderProtectedField: React.FC<PlaceholderProtectedFieldProps> = (props) => {
  const { value, onChange, disabled, placeholder, className } = props;

  // Read inside the DOM event handlers below rather than closed over from
  // props — those fire on the native element before React re-renders, so a
  // stale closure would guard against the PREVIOUS value instead of what is
  // actually on screen right now.
  const valueRef = useRef(value);
  valueRef.current = value;

  const warn = () => showToast({ type: 'error', message: EMAIL_PLACEHOLDER_PROTECTED_MESSAGE });

  const handleKeyDown = (event: React.KeyboardEvent<FieldElement>) => {
    const target = event.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (shouldBlockPlaceholderEdit(valueRef.current, start, end, event.key)) {
      event.preventDefault();
      warn();
      const expanded = expandSelectionToPlaceholders(valueRef.current, start, end);
      target.setSelectionRange(expanded.start, expanded.end);
    }
  };

  // Covers what `onKeyDown` misses: IME composition, mobile keyboards,
  // paste, and drag-drop, all of which land here via `InputEvent.inputType`
  // rather than a `KeyboardEvent`.
  const handleBeforeInput = (event: React.FormEvent<FieldElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    const guardKey = inputTypeToPlaceholderGuardKey(nativeEvent.inputType || '');
    if (!guardKey) return;
    const target = event.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (shouldBlockPlaceholderEdit(valueRef.current, start, end, guardKey)) {
      event.preventDefault();
      warn();
    }
  };

  // Explicit backstop alongside `onBeforeInput` — `beforeinput` support for
  // cut/paste on a `<textarea>` is inconsistent enough across browsers that
  // the SMS editor this pattern mirrors keeps both rather than relying on
  // either alone.
  const handleCutOrPaste = (event: React.ClipboardEvent<FieldElement>) => {
    const target = event.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (start === end) return;
    if (selectionIntersectsPlaceholder(valueRef.current, start, end)) {
      event.preventDefault();
      warn();
    }
  };

  const handleChange = (nextValue: string) => {
    const resolution = resolveProtectedEmailContent(valueRef.current, nextValue);
    if (!resolution.accepted) {
      warn();
      return; // `value` prop stays as-is, so the controlled field snaps back.
    }
    onChange(resolution.value);
  };

  if (props.as === 'textarea') {
    return (
      <AntdTextArea
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        rows={props.rows}
        autoSize={props.autoSize}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onCut={handleCutOrPaste}
        onPaste={handleCutOrPaste}
      />
    );
  }

  return (
    <Input
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput}
      onCut={handleCutOrPaste}
      onPaste={handleCutOrPaste}
    />
  );
};

export default PlaceholderProtectedField;
