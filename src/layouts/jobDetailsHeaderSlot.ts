import { createContext, useContext } from 'react';

// The right-hand side of JobDetailsLayout's "Back" row. A page can portal
// controls into it (e.g. CandidateDetails' Previous / Next candidate
// switcher) so they sit on the same line as the Back button, mirrored on the
// other side. `null` until the layout has mounted the slot, or when the page
// isn't rendered inside JobDetailsLayout at all.
export const JobDetailsHeaderSlotContext = createContext<HTMLElement | null>(null);

export const useJobDetailsHeaderSlot = () => useContext(JobDetailsHeaderSlotContext);
