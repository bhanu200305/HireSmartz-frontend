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
    <div className="relative text-sm text-gray-500 mt-4 flex items-center justify-between pr-6">
      <span>
        Showing latest {count} {formattedTitle}
      </span>
      <button
        className="text-primary font-bold underline relative cursor-pointer"
        onClick={onViewAll}
      >
        VIEW ALL {title?.toUpperCase()}
        <span className="absolute no-underline ml-1.5 text-orange-500">→</span>
      </button>
    </div>
  );
};

export default TableFooter;
