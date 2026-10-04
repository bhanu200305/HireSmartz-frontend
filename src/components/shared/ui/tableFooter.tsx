type TableFooterProps = {
  onViewAll?: () => void;
  title?: string;
  count?: number;
};
const TableFooter: React.FC<TableFooterProps> = ({ onViewAll, title, count }) => {
  const formatTitle = (title?: string): string => {
    if (!title) return '';
    if (title.toLowerCase().endsWith('s')) {
      const base = title.slice(0, -1);
      return `${base}(s)`;
    }

    return title;
  };

  const formattedTitle = formatTitle(title);

  return (
    <div className="text-sm text-neutral-500 mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
      <span>
        Showing latest {count} {formattedTitle}
      </span>
      <button
        className="group flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer transition-colors hover:text-primary-700"
        onClick={onViewAll}
      >
        View All {title}
        <span className="text-accent-400 transition-transform group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  );
};

export default TableFooter;
