import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { NewDecision } from './pages/NewDecision';
import { ReportPage } from './pages/ReportPage';
import { Privacy } from './pages/Privacy';
import { t } from './i18n';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="nuova" element={<NewDecision />} />
        <Route path="report/:id" element={<ReportPage />} />
        <Route path="privacy" element={<Privacy />} />
        <Route
          path="*"
          element={
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 space-y-3">
              <h1 className="text-3xl">{t.notFoundPage.title}</h1>
              <p className="prose-p">{t.notFoundPage.body}</p>
              <Link to="/" className="underline text-navy">{t.common.backToDashboard}</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
