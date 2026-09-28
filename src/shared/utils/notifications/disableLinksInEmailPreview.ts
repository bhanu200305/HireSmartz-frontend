/**
 * Both notification-service preview surfaces (`TemplatePreviewModal`,
 * `EmailLivePreviewPanel`) render `body_html` in a `sandbox=""` iframe via
 * `srcDoc`. That sandbox has no `allow-scripts`, so there's no way to
 * intercept clicks from inside it — but sandboxing a frame only stops it
 * navigating the PARENT page or opening popups, not navigating itself. A
 * real "Accept invitation"/"Reset password" link in the sample HTML still
 * follows its href on click, landing on a real endpoint fed sample/
 * placeholder data — which just renders blank or broken inside what's meant
 * to be a static preview.
 *
 * Neutered with a plain CSS rule injected into the markup (no script
 * needed, so this still works inside the empty sandbox) rather than by
 * loosening the sandbox to run JS just to `preventDefault`.
 */
export const disableLinksInEmailPreview = (html: string): string => {
  const style = '<style>a[href]{pointer-events:none!important;cursor:default!important;}</style>';
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${style}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (match) => `${match}${style}`);
  }
  return style + html;
};
