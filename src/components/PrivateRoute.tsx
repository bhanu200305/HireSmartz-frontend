import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyAuthToken } from '../shared/utils/business-logic';
import { handleRefreshToken } from '../services/AuthService';
import { getLocalStorageItem } from '../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Lazy initializer: an already-valid token renders straight through on the
  // very first render, same as before. Only a locally expired/missing token
  // starts in 'checking' — that's what gates the refresh attempt below
  // instead of redirecting to /login immediately.
  const [authState, setAuthState] = useState<AuthState>(() =>
    verifyAuthToken() ? 'authenticated' : 'checking'
  );

  useEffect(() => {
    if (verifyAuthToken()) {
      setAuthState('authenticated');
      return;
    }

    let cancelled = false;
    setAuthState('checking');

    // The access token is locally expired, but that alone doesn't mean the
    // session is over — the refresh token is separate and longer-lived. Try
    // it first so a token that merely expired mid-navigation doesn't cost
    // the user their place in the app; only redirect once a refresh has
    // actually been attempted and failed.
    //
    // Captured before the attempt so the two branches below can tell apart
    // "there was never a session here" (e.g. a bookmarked/shared link to a
    // private route with no token at all) from "a session existed and the
    // refresh for it failed" — see the comments on each branch.
    const hadAccessTokenBefore = Boolean(getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS));

    void handleRefreshToken().then((tokens) => {
      if (cancelled) return;

      if (tokens) {
        setAuthState('authenticated');
        return;
      }

      if (!hadAccessTokenBefore) {
        // Never had a token to refresh in the first place — nothing else
        // is going to redirect this tab, so do it ourselves.
        setAuthState('unauthenticated');
        return;
      }

      // A token existed before this attempt. If it's gone now,
      // AuthService.ts's forceReauthentication() already ran (the refresh
      // token was invalid/revoked, or the endpoint is rate-limited) — it
      // clears storage AND does its own hard `window.location.href`
      // redirect to /login?reason=... . Racing that with our own
      // navigate() would only risk briefly showing the SPA's own /login
      // (without the reason banner) before the hard redirect lands, with no
      // benefit, so leave it alone and let that redirect finish.
      const stillHasAccessToken = Boolean(getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS));
      if (!stillHasAccessToken) {
        return;
      }

      // Otherwise this was a transient failure (offline blip, backend
      // briefly unreachable, unparseable response) that AuthService.ts
      // deliberately left the session untouched for — nothing else will
      // move this forward, so redirect ourselves.
      setAuthState('unauthenticated');
    });

    return () => {
      cancelled = true;
    };
  }, [location]);

  useEffect(() => {
    if (authState !== 'unauthenticated') return;
    // Never save /logout as the redirect-back location — logging in and being
    // immediately sent to /logout would trigger another logout cycle.
    const from = location.pathname === '/logout' ? { pathname: '/' } : location;
    navigate('/login', { replace: true, state: { from } });
  }, [authState, navigate, location]);

  return authState === 'authenticated' ? <>{children}</> : null;
};

export default PrivateRoute;
