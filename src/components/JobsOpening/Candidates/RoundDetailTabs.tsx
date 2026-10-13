import { useId, useState, type ReactNode } from 'react';

type RoundDetailTabKey = 'summary' | 'feedback';

type RoundDetailTabsProps = {
  /** "Summary and Scoring" — the round's collapsible cards. */
  summary: ReactNode;
  /** "Feedback" — the recruiter's own score and note for the round. */
  feedback: ReactNode;
  /** Right-aligned beside the tabs (e.g. the Scoring Criteria icon). */
  actions?: ReactNode;
};

const TABS: { key: RoundDetailTabKey; label: string }[] = [
  { key: 'summary', label: 'Summary and Scoring' },
  { key: 'feedback', label: 'Feedback' },
];

// Old app's per-round tab strip (FeedbackTabs.tsx in hiresmartz-web):
// underlined text tabs on the left, round actions on the right. Mounted per
// round (the parent keys the round panel by id), so it always opens on
// Summary and Scoring.
const RoundDetailTabs = ({ summary, feedback, actions }: RoundDetailTabsProps) => {
  const [activeTab, setActiveTab] = useState<RoundDetailTabKey>('summary');
  const baseId = useId();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex min-w-0 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`${baseId}-${tab.key}-tab`}
                aria-selected={isActive}
                aria-controls={`${baseId}-${tab.key}-panel`}
                onClick={() => setActiveTab(tab.key)}
                className={`-mb-px border-b-2 px-4 py-2 text-base transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-${activeTab}-panel`}
        aria-labelledby={`${baseId}-${activeTab}-tab`}
        className="flex flex-col gap-4"
      >
        {activeTab === 'summary' ? summary : feedback}
      </div>
    </div>
  );
};

export default RoundDetailTabs;
