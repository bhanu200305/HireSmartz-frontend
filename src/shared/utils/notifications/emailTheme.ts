/**
 * The 16 named brand colours notification-service's layout tables carry
 * (`organization_email_layout`/`master_email_layout`, migration
 * `0015_email_theme_colors`) — field names match the backend's
 * `SaveLayoutRequest`/`LayoutView` literally so a form built from this list
 * can spread straight into either request body.
 *
 * Grouped by where each colour actually shows up in a rendered email (see
 * `corporate.html.j2`/`modern.html.j2`) rather than one flat 16-item grid.
 * `greeting_color` and the three `action_button_*` fields are accepted and
 * stored by the backend but not yet drawn by any seeded template — kept
 * here (not hidden) so the picker matches what actually round-trips through
 * a save, and marked `reserved` so the UI can say so rather than implying
 * they already do something.
 */
export interface EmailThemeColors {
  primary_color?: string | null;
  secondary_color?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  title_color?: string | null;
  greeting_color?: string | null;
  button_background?: string | null;
  button_text?: string | null;
  button_border_color?: string | null;
  highlight_background?: string | null;
  highlight_text?: string | null;
  footer_background?: string | null;
  footer_text?: string | null;
  action_button_text?: string | null;
  action_button_background?: string | null;
  action_button_border_color?: string | null;
}

export const THEME_COLOR_KEYS = [
  'primary_color',
  'secondary_color',
  'background_color',
  'text_color',
  'title_color',
  'greeting_color',
  'button_background',
  'button_text',
  'button_border_color',
  'highlight_background',
  'highlight_text',
  'footer_background',
  'footer_text',
  'action_button_text',
  'action_button_background',
  'action_button_border_color',
] as const satisfies readonly (keyof EmailThemeColors)[];

export interface ThemeColorField {
  key: keyof EmailThemeColors;
  label: string;
  /** True for a field the backend stores but no current template draws —
   * see the module docstring. */
  reserved?: boolean;
}

export interface ThemeColorGroup {
  title: string;
  description: string;
  fields: ThemeColorField[];
}

export const THEME_COLOR_GROUPS: ThemeColorGroup[] = [
  {
    title: 'Page & Layout',
    description: 'The header rule, link accents, and the canvas behind the message card.',
    fields: [
      { key: 'primary_color', label: 'Primary Color' },
      { key: 'secondary_color', label: 'Secondary Color' },
      { key: 'background_color', label: 'Background Color' },
    ],
  },
  {
    title: 'Text',
    description: 'Headings and body copy.',
    fields: [
      { key: 'title_color', label: 'Title Color' },
      { key: 'text_color', label: 'Body Text Color' },
      { key: 'greeting_color', label: 'Greeting Color', reserved: true },
    ],
  },
  {
    title: 'Button',
    description: 'The primary call-to-action button, e.g. "Reset your password".',
    fields: [
      { key: 'button_background', label: 'Button Background' },
      { key: 'button_text', label: 'Button Text' },
      { key: 'button_border_color', label: 'Button Border' },
    ],
  },
  {
    title: 'Highlight Box',
    description: 'The footnote / callout box under the button.',
    fields: [
      { key: 'highlight_background', label: 'Highlight Background' },
      { key: 'highlight_text', label: 'Highlight Text' },
    ],
  },
  {
    title: 'Footer',
    description: 'The footer bar and its unsubscribe link.',
    fields: [
      { key: 'footer_background', label: 'Footer Background' },
      { key: 'footer_text', label: 'Footer Text' },
    ],
  },
  {
    title: 'Second Call-to-Action',
    description: 'Reserved for a future second button; no current template has one.',
    fields: [
      { key: 'action_button_background', label: 'Background', reserved: true },
      { key: 'action_button_text', label: 'Text', reserved: true },
      { key: 'action_button_border_color', label: 'Border', reserved: true },
    ],
  },
];

export const isHexColor = (value: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(value);

/**
 * A real, seeded, candidate-facing (`brand_as_platform=False`) notification
 * type used purely to demo a THEME (colors + banner) in a live preview — it
 * carries a heading, a paragraph, a CTA button and a highlight/footnote box,
 * exercising most of the 16 fields at once. Not `tenant_user_invited`
 * (`PACK_PREVIEW_SAMPLE_TYPE` in `TemplateSettings/index.ts`, used to preview
 * a PACK's copy/layout): that type is platform-branded, so a tenant's colors
 * and banner would never show on it.
 */
export const THEME_PREVIEW_SAMPLE_TYPE = 'interview_booking_link_ready';
