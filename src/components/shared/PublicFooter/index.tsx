import cfpLogoWhite from '../../../assets/pngs/cfp_icon_white.png';

export const PublicFooter = () => {
  return (
    <footer className="bg-gray-900 shadow-[0_-2px_6px_rgba(0,0,0,0.15)] text-white py-4 px-4 flex items-center justify-center gap-2">
      <span className="text-xs text-gray-400">Powered by</span>
      <img src={cfpLogoWhite} alt="CareerForcePro" className="h-10 object-contain" />
    </footer>
  );
};

export default PublicFooter;
