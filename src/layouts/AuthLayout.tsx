const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  // min-h-screen + overflow-y-auto (not a hard h-[100vh]) so content taller
  // than the viewport — e.g. a tall form in landscape on a phone — scrolls
  // instead of being clipped with no way to reach the rest of it. No change
  // at any height where content already fits, which is every case this was
  // previously used at.
  return (
    <div className="w-full min-h-screen overflow-y-auto flex items-center justify-center">
      {children}
    </div>
  );
};

export default AuthLayout;
