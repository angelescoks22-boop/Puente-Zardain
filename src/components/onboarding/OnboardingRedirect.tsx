import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hasSeenOnboarding } from '../../utils/onboardingStorage';

export function OnboardingRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/' && !hasSeenOnboarding()) {
      navigate('/welcome', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
