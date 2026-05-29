const SEEN_KEY = 'zardain_onboarding_seen';
const VISITS_KEY = 'zardain_visit_count';

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function getVisitCount(): number {
  try {
    return Number(localStorage.getItem(VISITS_KEY) ?? '0');
  } catch {
    return 0;
  }
}

export function incrementVisitCount(): number {
  const next = getVisitCount() + 1;
  try {
    localStorage.setItem(VISITS_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function isReturningUser(): boolean {
  return hasSeenOnboarding() || getVisitCount() > 1;
}
