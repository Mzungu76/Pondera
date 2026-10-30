import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Logo } from './Logo';
import { t } from '../i18n';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line/70">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 min-h-[44px]">
            <Logo />
            <span className="font-serif text-xl tracking-tight">{t.appName}</span>
          </Link>
          <nav aria-label="Principale">
            <Link to="/privacy" className="text-sm text-ink-soft hover:text-ink px-2 py-3">
              {t.nav.privacy}
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line/70 mt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 text-sm text-ink-mute space-y-1.5">
          <p className="font-serif text-ink-soft">{t.tagline}</p>
          <p>{t.disclaimer.short}</p>
        </div>
      </footer>
    </div>
  );
}
