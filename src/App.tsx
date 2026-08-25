import React, { useState, Suspense, lazy } from 'react';
import { LoginPage } from './components/LoginPage';
import { getToken, isSuperUser as checkSuperUser } from './utils/auth';

// Eagerly initiate the download of the authenticated app in the background
// while the user types their credentials, so the transition is instantaneous.
const authenticatedAppPromise = import('./AuthenticatedApp');
const AuthenticatedApp = lazy(() => authenticatedAppPromise);

const PageFallback = () => (
  <div className="flex items-center justify-center py-20 min-h-screen bg-[#faf8f5]">
    <div className="w-8 h-8 border-3 border-gray-200 border-t-[#f5a623] rounded-full animate-spin" />
  </div>
);

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()));
  const [superUser, setSuperUser] = useState(() => checkSuperUser());

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={(su) => {
          setIsLoggedIn(true);
          setSuperUser(su);
        }}
      />
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <AuthenticatedApp
        superUser={superUser}
        onLogout={() => {
          setIsLoggedIn(false);
          setSuperUser(false);
        }}
      />
    </Suspense>
  );
}