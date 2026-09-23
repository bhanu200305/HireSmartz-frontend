import { forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

// Google's v2 checkbox widget renders as a FIXED 304x78px iframe with no
// responsive sizing prop of its own. On a narrow phone (e.g. 320px wide,
// iPhone SE) that alone is wider than the viewport minus this app's usual
// 16px side gutters, so it either gets clipped or forces the whole page to
// scroll horizontally — the one element on these public apply forms that
// silently broke "make sure nothing overflows on mobile" everywhere else.
//
// `transform: scale()` alone doesn't fix this: it shrinks what's PAINTED,
// not the box's contribution to LAYOUT, so the parent would still reserve
// the full 304px and still overflow. The fix is a wrapper explicitly sized
// to the SCALED footprint below `sm` (Tailwind's arbitrary-value classes
// switch both the scale and the reserved box size together at the same
// breakpoint), reverting to the widget's real size at `sm:` and above.
// 304x78 is Google's real widget size; 0.85 scale -> 258.4x66.3, the
// footprint reserved below `sm`. Tailwind's JIT scanner needs these as
// literal class strings — it cannot resolve an interpolated `scale-[${x}]`
// at build time — so the numbers above are documentation, not the source
// of the classes themselves. Keep them in sync by hand if either changes.
const WRAPPER_CLASSES =
  'origin-top-left scale-[0.85] sm:scale-100 w-[258.4px] h-[66.3px] sm:w-[304px] sm:h-[78px]';

interface ResponsiveRecaptchaProps {
  sitekey: string;
  onChange: (token: string | null) => void;
  onExpired?: () => void;
}

export const ResponsiveRecaptcha = forwardRef<ReCAPTCHA, ResponsiveRecaptchaProps>(
  ({ sitekey, onChange, onExpired }, ref) => (
    <div className={WRAPPER_CLASSES}>
      <ReCAPTCHA ref={ref} sitekey={sitekey} onChange={onChange} onExpired={onExpired} />
    </div>
  )
);

ResponsiveRecaptcha.displayName = 'ResponsiveRecaptcha';
