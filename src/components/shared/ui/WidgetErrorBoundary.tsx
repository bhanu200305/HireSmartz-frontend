import { Component, type ErrorInfo, type ReactNode } from 'react';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  /** Shown in the fallback card — which widget failed, for support/logs. */
  label?: string;
  /** Custom fallback; defaults to a small inline card, not a blank area. */
  fallback?: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Contains a render-time crash to the ONE widget that threw, instead of
 * unmounting the whole page — this app has no boundary anywhere above this,
 * so today a single bad widget (a third-party library choking on a missing
 * config value, a component assuming a data shape an edge-case response
 * doesn't match) takes the entire screen to blank white. React only offers
 * this as a class component — there is no hook equivalent for
 * `componentDidCatch`/`getDerivedStateFromError`.
 *
 * Wrap each independently-fetched dashboard slide/card/panel in its own
 * instance so one's failure can never cascade into its neighbors — that
 * isolation is the whole point, not just crash-proofing the page overall.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(`[WidgetErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="text-sm font-medium text-neutral-500">
              {this.props.label ? `${this.props.label} couldn't load` : "This couldn't load"}
            </p>
            <p className="text-xs text-neutral-400">The rest of the page is unaffected.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default WidgetErrorBoundary;
