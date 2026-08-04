const Badge = ({ status }: { status: string }) => {
  return (
    <span
      className={`px-2 py-1 rounded text-white text-xs font-semibold ${
        status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      {status}
    </span>
  );
};

export default Badge;
