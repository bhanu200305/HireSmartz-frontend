import React from 'react';
import { ColorPicker } from 'antd';
import {
  EmailThemeColors,
  THEME_COLOR_GROUPS,
  isHexColor,
} from '../../../shared/utils/notifications/emailTheme';

interface EmailThemeColorFieldsProps {
  theme: EmailThemeColors;
  /** The pack/platform default for any field the tenant hasn't set —
   * shown as the swatch's starting point so a blank field isn't a blank
   * (invalid) color picker. */
  fallback: Required<EmailThemeColors>;
  onChange: (key: keyof EmailThemeColors, value: string) => void;
  disabled?: boolean;
}

const ColorField: React.FC<{
  label: string;
  value: string;
  reserved?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, reserved, disabled, onChange }) => {
  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let v = e.target.value;
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500">
        {label}
        {reserved && <span className="ml-1 text-gray-400">(not yet used by any template)</span>}
      </span>
      <div className="flex items-center gap-3">
        <ColorPicker
          value={value}
          format="hex"
          disabledAlpha
          disabled={disabled}
          onChange={(color) => onChange(color.toHexString())}
        >
          <div
            className={`h-10 w-10 flex-shrink-0 rounded-xl border border-gray-200 shadow-sm transition-transform ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-105'
            }`}
            style={{ backgroundColor: value }}
          />
        </ColorPicker>
        <div className="flex h-10 flex-1 items-center rounded-full border border-gray-200 bg-white px-4 hover:border-gray-300">
          <input
            type="text"
            value={value.toUpperCase()}
            onChange={handleHexInput}
            disabled={disabled}
            className="w-full bg-transparent font-mono text-sm text-gray-700 outline-none disabled:cursor-not-allowed"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * The 16-field brand-color grid — real fields on notification-service's
 * `SaveLayoutRequest`, not a mock. `theme` holds only what THIS tenant/pack
 * has actually saved (nullable on the backend); `fallback` fills the gaps
 * with whatever it would resolve to unset, purely so the picker always
 * shows a real color rather than a blank swatch. Saving still only sends
 * what changed — see the caller's `onChange`, which always receives the
 * key that was actually edited.
 */
const EmailThemeColorFields: React.FC<EmailThemeColorFieldsProps> = ({
  theme,
  fallback,
  onChange,
  disabled = false,
}) => (
  // Reverted a `lg:grid-cols-2` group-side-by-side split tried here — nesting
  // that on top of this section's own `sm:grid-cols-3` field grid, combined
  // with EmailLayoutSection's fields-vs-live-preview split kicking in at the
  // exact same `lg:` breakpoint, squeezed each color field down to roughly
  // 90px wide: nowhere near enough room for a 40px swatch plus a hex-input
  // pill, so every row looked crushed/misaligned instead of shorter.
  <div className="flex flex-col gap-5">
    {THEME_COLOR_GROUPS.map((group) => (
      <div key={group.title}>
        <h4 className="mb-0.5 text-xs font-bold uppercase tracking-wide text-gray-500">
          {group.title}
        </h4>
        <p className="mb-2 text-xs text-gray-400">{group.description}</p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
          {group.fields.map(({ key, label, reserved }) => {
            // `Required<EmailThemeColors>` strips the `?` off each field but
            // not the `| null` — `fallback` is meant to always carry a real
            // platform-default hex string, but the type still allows null,
            // so this coerces to '' at the boundary (isHexColor('') is
            // false, same effective fallback behavior as before).
            const value = theme[key] || fallback[key] || '';
            return (
              <ColorField
                key={key}
                label={label}
                reserved={reserved}
                value={isHexColor(value) ? value : (fallback[key] ?? '')}
                disabled={disabled}
                onChange={(next) => onChange(key, next)}
              />
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default EmailThemeColorFields;
