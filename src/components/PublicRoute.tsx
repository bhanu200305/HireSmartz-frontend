import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyAuthToken } from '../shared/utils/business-logic';

const PublicRoute = ({ children }: { children: React.ReactNode }): React.ReactNode => {
  const navigate = useNavigate();

  useEffect(() => {
    if (verifyAuthToken()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return verifyAuthToken() ? null : <>{children}</>;
};

export default PublicRoute;
