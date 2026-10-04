import revenueGeneratedImage from '../../assets/svgs/revenueGenerated.svg';
import { Link } from 'react-router-dom';
import ComingSoon from '../../assets/svgs/ComingSoon.svg';

const RevenueGenerated = () => {
  return (
    <div
      className="bg-white rounded-xl p-6 w-full h-full border shadow-xs flex flex-col"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary-50">
            <img src={revenueGeneratedImage} alt="" className="w-6 h-6 object-contain" />
          </div>
          <Link to="/finances" className="transition-colors hover:text-primary">
            <h2 className="font-display text-lg font-semibold text-neutral-900">
              Revenue Generated
            </h2>
          </Link>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4">
        <img
          src={ComingSoon}
          alt="Coming Soon"
          className="w-32 h-32 object-contain sm:w-48 sm:h-48"
        />
        <p className="text-xs font-semibold tracking-widest uppercase text-neutral-400">
          Coming Soon
        </p>
      </div>
    </div>
  );
};

export default RevenueGenerated;
