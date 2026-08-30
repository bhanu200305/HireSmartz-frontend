// import { useContext, useEffect, useState } from 'react'
// import { UNSAFE_NavigationContext as NavigationContext, To } from 'react-router-dom'

// export const useNavigationBlocker = (shouldBlock: boolean) => {
//   const { navigator } = useContext(NavigationContext)
//   const [isBlocked, setIsBlocked] = useState(false)
//   const [pendingNavigation, setPendingNavigation] = useState<{ to: To; options?: any } | null>(null)

//   useEffect(() => {
//     if (!shouldBlock) return

//     // Store original methods
//     const originalPush = navigator.push
//     const originalReplace = navigator.replace

//     // Intercept push navigation
//     navigator.push = (to: To, state?: any, options?: any) => {
//       if (to !== location.pathname) {
//         setPendingNavigation({ to, options: { state, ...options } })
//         setIsBlocked(true)
//         return // Prevent the original navigation
//       } else {
//         return originalPush.call(navigator, to, state, options)
//       }
//     }

//     // Intercept replace navigation
//     navigator.replace = (to: To, state?: any, options?: any) => {
//       if (to !== location.pathname) {
//         setPendingNavigation({ to, options: { state, ...options } })
//         setIsBlocked(true)
//         return // Prevent the original navigation
//       } else {
//         return originalReplace.call(navigator, to, state, options)
//       }
//     }

//     // Intercept browser back/forward
//     const handleBeforeUnload = (event: BeforeUnloadEvent) => {
//       if (shouldBlock) {
//         event.preventDefault()
//         event.returnValue = ''
//       }
//     }

//     window.addEventListener('beforeunload', handleBeforeUnload)

//     // Cleanup
//     return () => {
//       navigator.push = originalPush
//       navigator.replace = originalReplace
//       window.removeEventListener('beforeunload', handleBeforeUnload)
//     }
//   }, [navigator, shouldBlock])

//   const confirmNavigation = () => {
//     if (pendingNavigation) {
//       // Use the stored navigator methods which are now restored to original
//       navigator.push(
//         pendingNavigation.to,
//         pendingNavigation.options?.state,
//         pendingNavigation.options
//       )
//     }
//     setIsBlocked(false)
//     setPendingNavigation(null)
//   }

//   const cancelNavigation = () => {
//     setIsBlocked(false)
//     setPendingNavigation(null)
//   }

//   return {
//     isBlocked,
//     pendingNavigation,
//     confirmNavigation,
//     cancelNavigation
//   }
// }

// import { useContext, useEffect, useState, useCallback } from 'react'
// import { UNSAFE_NavigationContext as NavigationContext, To, useLocation } from 'react-router-dom'

// export const useNavigationBlocker = (shouldBlock: boolean, isFormDirty: boolean) => {
//   const { navigator } = useContext(NavigationContext)
//   const location = useLocation()
//   const [isBlocked, setIsBlocked] = useState(false)
//   const [pendingNavigation, setPendingNavigation] = useState<{ to: To; options?: any } | null>(null)
//   const [originalMethods, setOriginalMethods] = useState<{
//     push: (to: To, state?: any, options?: any) => void
//     replace: (to: To, state?: any, options?: any) => void
//   } | null>(null)

//   useEffect(() => {
//     if (!shouldBlock) return

//     // Store original methods
//     setOriginalMethods({
//       push: navigator.push,
//       replace: navigator.replace
//     })

//     // Intercept push navigation
//     navigator.push = (to: To, state?: any, options?: any) => {
//       // Allow navigation to the same path
//       if (to === location.pathname) {
//         return originalMethods?.push.call(navigator, to, state, options)
//       }

//       if (isFormDirty) {
//         setPendingNavigation({ to, options: { state, ...options } })
//         setIsBlocked(true)
//         return false // Prevent the original navigation
//       } else {
//         return originalMethods?.push.call(navigator, to, state, options)
//       }
//     }

//     // Intercept replace navigation
//     navigator.replace = (to: To, state?: any, options?: any) => {
//       // Allow navigation to the same path
//       if (to === location.pathname) {
//         return originalMethods?.replace.call(navigator, to, state, options)
//       }

//       if (isFormDirty) {
//         setPendingNavigation({ to, options: { state, ...options } })
//         setIsBlocked(true)
//         return false // Prevent the original navigation
//       } else {
//         return originalMethods?.replace.call(navigator, to, state, options)
//       }
//     }

//     // Intercept browser back/forward
//     const handleBeforeUnload = (event: BeforeUnloadEvent) => {
//       if (isFormDirty) {
//         event.preventDefault()
//         event.returnValue = ''
//       }
//     }

//     window.addEventListener('beforeunload', handleBeforeUnload)

//     // Cleanup
//     return () => {
//       if (originalMethods) {
//         navigator.push = originalMethods.push
//         navigator.replace = originalMethods.replace
//       }
//       window.removeEventListener('beforeunload', handleBeforeUnload)
//     }
//   }, [navigator, shouldBlock, isFormDirty, location.pathname, originalMethods])

//   const confirmNavigation = useCallback(() => {
//     if (pendingNavigation && originalMethods) {
//       // Restore original methods temporarily
//       navigator.push = originalMethods.push
//       navigator.replace = originalMethods.replace

//       // Perform the navigation using the original method
//       originalMethods.push.call(
//         navigator,
//         pendingNavigation.to,
//         pendingNavigation.options?.state,
//         pendingNavigation.options
//       )
//     }
//     setIsBlocked(false)
//     setPendingNavigation(null)
//   }, [pendingNavigation, navigator, originalMethods])

//   const cancelNavigation = useCallback(() => {
//     setIsBlocked(false)
//     setPendingNavigation(null)
//   }, [])

//   return {
//     isBlocked,
//     pendingNavigation,
//     confirmNavigation,
//     cancelNavigation
//   }
// }

import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { UNSAFE_NavigationContext as NavigationContext, To, useLocation } from 'react-router-dom';

export const useNavigationBlocker = (shouldBlock: boolean, isFormDirty: boolean) => {
  const { navigator } = useContext(NavigationContext);
  const location = useLocation();
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    to: To;
    method: 'push' | 'replace';
    options?: any;
  } | null>(null);

  const originalMethodsRef = useRef<{
    push: (to: To, state?: any, options?: any) => void;
    replace: (to: To, state?: any, options?: any) => void;
  } | null>(null);

  useEffect(() => {
    if (!shouldBlock) return;

    if (!originalMethodsRef.current) {
      originalMethodsRef.current = {
        push: navigator.push,
        replace: navigator.replace,
      };
    }

    const original = originalMethodsRef.current;

    navigator.push = (to: To, state?: any, options?: any) => {
      if (`${to}` === `${location.pathname}${location.search}`) {
        return original.push.call(navigator, to, state, options);
      }
      if (isFormDirty) {
        setPendingNavigation({ to, method: 'push', options: { state, ...options } });
        setIsBlocked(true);
        return false;
      } else {
        setIsBlocked(false);
      }
      return original.push.call(navigator, to, state, options);
    };

    navigator.replace = (to: To, state?: any, options?: any) => {
      if (`${to}` === `${location.pathname}${location.search}`) {
        return original.replace.call(navigator, to, state, options);
      }
      if (isFormDirty) {
        setPendingNavigation({ to, method: 'replace', options: { state, ...options } });
        setIsBlocked(true);
        return false;
      }
      return original.replace.call(navigator, to, state, options);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isFormDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      navigator.push = original.push;
      navigator.replace = original.replace;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigator, shouldBlock, isFormDirty, location]);

  const confirmNavigation = useCallback(() => {
    if (pendingNavigation && originalMethodsRef.current) {
      const original = originalMethodsRef.current;
      navigator.push = original.push;
      navigator.replace = original.replace;

      const { to, method, options } = pendingNavigation;
      original[method].call(navigator, to, options?.state, options);

      // Deliberately NOT resetting JobSlice/EditJobSlice here. This used to
      // wipe both on any confirmed "leave with unsaved changes" navigation
      // whose destination wasn't on a hardcoded whitelist of in-flow paths
      // (see git history) — but by the point this blocker can fire, the
      // job draft this wizard is building has typically already been saved
      // to the backend (jobOpeningId is set), so clearing the local Redux
      // pointer to it doesn't undo anything server-side. It just meant
      // leaving via any unlisted route (e.g. the wizard's own global "Back"
      // button, which always goes to /jobs) silently dropped jobOpeningId,
      // stranding the user on whatever tab they returned to afterward — the
      // Interview Setup tab in particular has no redirect guard, so it
      // rendered normally with the draft gone until the user tried to save
      // a round and only then hit "please save the job details first".
      //
      // Explicit "start a brand new job" entry points (CreateJobDescription,
      // the create-job modal in JobsOpening/Index.tsx, and
      // useStartManualJobOpening) already dispatch resetJobState()
      // themselves before beginning a fresh draft — that's the correct,
      // deliberate place for this reset, not "the user navigated somewhere
      // this hook didn't recognize."
    }
    setIsBlocked(false);
    setPendingNavigation(null);
  }, [pendingNavigation, navigator]);

  const cancelNavigation = useCallback(() => {
    setIsBlocked(false);
    setPendingNavigation(null);
  }, []);

  return {
    isBlocked,
    pendingNavigation,
    confirmNavigation,
    cancelNavigation,
  };
};
