import ViewCandidateDetails from '../../components/JobsOpening/Candidates/CandidateDetails';
import Candidates from '../../components/JobsOpening/Candidates/CandidatesListing';
import SearchCandidatesListing from '../../components/JobsOpening/Candidates/SearchCandidateListing';
import WidgetErrorBoundary from '../../components/shared/ui/WidgetErrorBoundary';

// A React error boundary only catches a crash thrown while rendering its
// CHILDREN — not one thrown by its own ancestor's render body. The
// `WidgetErrorBoundary` this component used to place deep INSIDE
// CandidateDetails' own JSX (around just the round drill-down) never caught
// anything, because CandidateDetails computes its round-specific derived
// state (job questions, eligible interviewers, etc.) at the TOP of its own
// function body — if any of that throws, the whole `CandidateDetails()` call
// fails before React ever reaches the boundary nested inside its returned
// JSX. Wrapping the component from OUTSIDE, here, is the only placement that
// actually sits as a true ancestor of that render and can catch it — turning
// a blank white page into a visible "couldn't load" card with a way back,
// and logging the real error (see WidgetErrorBoundary's componentDidCatch)
// instead of failing silently.
export const ViewCandidateDetailsPage = () => {
  return (
    <WidgetErrorBoundary
      label="Candidate Details"
      fallback={
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-base font-medium text-neutral-700">
            This candidate view couldn&apos;t load.
          </p>
          <p className="max-w-md text-sm text-neutral-500">
            Something on this page hit an unexpected error. Going back and opening it again usually
            clears it — if it keeps happening, let the team know which round you clicked.
          </p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            ← Go back
          </button>
        </div>
      }
    >
      <ViewCandidateDetails />
    </WidgetErrorBoundary>
  );
};

export const CandidatesPage = () => {
  return <Candidates />;
};

export const SearchCandidateListingPage = () => {
  return <SearchCandidatesListing />;
};
