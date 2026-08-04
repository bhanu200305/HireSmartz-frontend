import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyAuthToken } from '../shared/utils/business-logic';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!verifyAuthToken()) {
      // Never save /logout as the redirect-back location — logging in and being
      // immediately sent to /logout would trigger another logout cycle.
      const from = location.pathname === '/logout' ? { pathname: '/' } : location;
      navigate('/login', { replace: true, state: { from } });
    }
  }, [navigate, location]);

  return verifyAuthToken() ? <>{children}</> : null;
};

export default PrivateRoute;
