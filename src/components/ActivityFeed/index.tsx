import { ReactNode, useMemo, useState } from 'react';
import { DatePicker, Tabs } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash-es';
import { IoIosArrowForward } from 'react-icons/io';
import { MdClose } from 'react-icons/md';
import { LuSquareActivity } from 'react-icons/lu';
import {
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineOfficeBuilding,
  HiOutlineUser,
  HiOutlineUsers,
} from 'react-icons/hi';
import type { ActivityCategory, ActivityItem } from '../../api/audit-service/Activity/activity';
import { Button, Search } from '../shared';
import { Loader } from '../shared/ui/loader';
import PeoplePicker, { PersonOption } from './PeoplePicker';
import { useActivityFeedPages } from './useActivityFeedPages';
import {
  DatePreset,
  Segment,
  activityTargetPath,
  buildActivitySentence,
  exactTimeLabel,
  groupByDay,
  presetRange,
  relativeTimeLabel,
  sentenceToText,
} from './activityFormat';

const WIDGET_LIMIT = 5;
const PAGE_LIMIT = 25;

const CATEGORY_ICONS: Record<ActivityCategory, ReactNode> = {
  job: <HiOutlineBriefcase className="text-lg" />,
  candidate: <HiOutlineUser className="text-lg" />,
  interview: <HiOutlineCalendar className="text-lg" />,
  team: <HiOutlineUsers className="text-lg" />,
  platform: <HiOutlineOfficeBuilding className="text-lg" />,
};

const COMPANY_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'candidate', label: 'Candidates' },
  { key: 'interview', label: 'Interviews' },
  { key: 'team', label: 'Team' },
];

// Hiring managers/recruiters never get team events.
const ASSIGNED_JOBS_TABS = COMPANY_TABS.filter((t) => t.key !== 'team');
const PLATFORM_TABS = [{ key: 'all', label: 'All' }];

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'custom', label: 'Custom' },
];

const PRESET_CHIP_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom range',
};

const ERROR_MESSAGES = {
  unavailable: 'Activity is temporarily unavailable',
  forbidden: "You don't have access to the activity feed",
  failed: "Couldn't load activity",
} as const;

const Sentence = ({ segments }: { segments: Segment[] }) => (
  <>
    {segments.map((s, i) =>
      s.bold ? (
        <strong key={i} className="font-semibold text-gray-900">
          {s.text}
        </strong>
      ) : (
        <span key={i}>{s.text}</span>
      )
    )}
  </>
);

type Chip = { key: string; label: string; onRemove: () => void };

const ActivityCard = ({ fullPage }: { fullPage: boolean }) => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [mine, setMine] = useState(false);
  const [people, setPeople] = useState<PersonOption[]>([]);

  const range = useMemo(
    () =>
      presetRange(preset, {
        from: customRange?.[0].startOf('day').toISOString(),
        to: customRange?.[1].endOf('day').toISOString(),
      }),
    // `presetRange` reads the clock, so it is recomputed only when a filter changes.
    [preset, customRange]
  );

  const feed = useActivityFeedPages({
    category: category === 'all' ? undefined : (category as ActivityCategory),
    q: q || undefined,
    mine: mine || undefined,
    actorIds: people.length ? people.map((p) => p.value) : undefined,
    occurredFrom: range.from,
    occurredTo: range.to,
    limit: fullPage ? PAGE_LIMIT : WIDGET_LIMIT,
  });
  const { scope } = feed;

  const handleSearch = useMemo(() => debounce((value: string) => setQ(value.trim()), 500), []);

  const tabs =
    scope === 'platform'
      ? PLATFORM_TABS
      : scope === 'assigned_jobs'
        ? ASSIGNED_JOBS_TABS
        : COMPANY_TABS;
  const showPeoplePicker = scope === 'company';
  const showMine = scope !== 'platform';

  const chips: Chip[] = [];
  if (q) chips.push({ key: 'q', label: `Search: ${q}`, onRemove: () => setQ('') });
  if (preset !== '7d') {
    chips.push({
      key: 'date',
      label: PRESET_CHIP_LABELS[preset],
      onRemove: () => {
        setPreset('7d');
        setCustomRange(null);
      },
    });
  }
  if (mine) chips.push({ key: 'mine', label: 'Only mine', onRemove: () => setMine(false) });
  people.forEach((p) =>
    chips.push({
      key: `person-${p.value}`,
      label: `By ${p.label}`,
      onRemove: () => setPeople((prev) => prev.filter((x) => x.value !== p.value)),
    })
  );

  const openItem = (item: ActivityItem) => {
    const path = activityTargetPath(item);
    if (path) navigate(path);
  };

  const renderItem = (item: ActivityItem) => {
    const sentence = buildActivitySentence(item, scope ?? 'company');
    const path = activityTargetPath(item);
    return (
      <li key={item.id}>
        <div
          role={path ? 'link' : undefined}
          tabIndex={path ? 0 : undefined}
          aria-label={sentenceToText(sentence)}
          onClick={() => openItem(item)}
          onKeyDown={(e) => e.key === 'Enter' && openItem(item)}
          className={`flex items-center justify-between gap-4 px-4 py-2 bg-white rounded-lg transition ${
            path ? 'cursor-pointer hover:bg-gray-50' : ''
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
              {CATEGORY_ICONS[item.category] ?? <LuSquareActivity className="text-lg" />}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              <Sentence segments={sentence} />
            </p>
          </div>
          <span className="shrink-0 text-xs text-gray-500" title={exactTimeLabel(item.occurred_at)}>
            {relativeTimeLabel(item.occurred_at)}
          </span>
        </div>
      </li>
    );
  };

  const renderBody = () => {
    if (feed.loading && feed.items.length === 0) return null;
    if (feed.error && feed.items.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">{ERROR_MESSAGES[feed.error]}</p>
          {feed.error !== 'forbidden' && (
            <Button className="mt-2 text-primary font-bold underline" onClick={feed.reload}>
              Try again
            </Button>
          )}
        </div>
      );
    }
    if (feed.items.length === 0) {
      return <p className="text-sm text-gray-500 text-center py-6">No activity found</p>;
    }
    if (!fullPage) {
      return <ul className="space-y-2">{feed.items.map(renderItem)}</ul>;
    }
    return (
      <div className="space-y-4">
        {groupByDay(feed.items).map((group) => (
          <section key={group.heading}>
            <h3 className="px-1 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {group.heading}
            </h3>
            <ul className="space-y-2">{group.items.map(renderItem)}</ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow px-8 py-4 w-full">
      {feed.loading && <Loader />}
      <div className={fullPage ? 'w-full pt-16' : 'w-full'}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#000000]">
            <LuSquareActivity className="text-2xl text-white" />
          </div>
          <h2 className="text-xl font-semibold">Activity Feed</h2>
        </div>

        {fullPage && (
          <>
            <div className="flex flex-row flex-wrap justify-between items-center gap-y-2">
              <Tabs
                activeKey={category}
                onChange={setCategory}
                items={tabs.map((t) => ({
                  key: t.key,
                  label: <span className="text-base heading-font">{t.label}</span>,
                }))}
                className="view-candidate-tabs"
              />
              <div className="w-64">
                <Search
                  appname="activity"
                  placeholder="Search by Job ID or title"
                  className="my-search"
                  onSearch={handleSearch}
                  allowClear
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                {PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    onClick={() => setPreset(p.key)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      preset === p.key
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-[var(--border)]'
                    }`}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              {preset === 'custom' && (
                <DatePicker.RangePicker
                  value={customRange}
                  onChange={(v) => setCustomRange(v?.[0] && v?.[1] ? [v[0], v[1]] : null)}
                  disabledDate={(d) => d.isAfter(dayjs(), 'day')}
                />
              )}
              {showPeoplePicker && (
                <PeoplePicker
                  value={people.map((p) => p.value)}
                  onChange={(_ids, opts) => setPeople(opts)}
                />
              )}
              {showMine && (
                <Button
                  onClick={() => setMine((m) => !m)}
                  aria-pressed={mine}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    mine
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-[var(--border)]'
                  }`}
                >
                  Only mine
                </Button>
              )}
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {chips.map((c) => (
                  <span
                    key={c.key}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-[var(--border)] pl-3 pr-1 py-0.5 text-xs text-gray-700"
                  >
                    {c.label}
                    <button
                      type="button"
                      aria-label={`Remove filter ${c.label}`}
                      onClick={c.onRemove}
                      className="p-0.5 rounded-full text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      <MdClose />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-2 mb-2">{renderBody()}</div>

      {feed.error && feed.items.length > 0 && (
        <p className="text-sm text-gray-500 text-center">{ERROR_MESSAGES[feed.error]}</p>
      )}

      {fullPage && feed.nextCursor && (
        <div className="flex justify-center mt-3">
          <Button
            onClick={feed.loadMore}
            disabled={feed.loadingMore}
            className="px-4 py-2 rounded-full border border-primary text-primary font-medium"
          >
            {feed.loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}

      {!fullPage && feed.items.length > 0 && (
        <button
          onClick={() => navigate('/my-activity')}
          className="ml-auto mt-3 text-primary font-bold flex items-center underline cursor-pointer"
        >
          View all activities <IoIosArrowForward />
        </button>
      )}
    </div>
  );
};

export default ActivityCard;
