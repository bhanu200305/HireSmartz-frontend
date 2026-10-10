export const Loader = ({ message }: { message?: string } = {}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-white/30 backdrop-blur-md z-[9999] px-4">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      {message && (
        <p role="status" className="m-0 max-w-sm text-center text-sm font-semibold text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
};
