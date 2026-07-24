import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import MitarbeiterverwaltungPage from '@/pages/MitarbeiterverwaltungPage';
import MitarbeiterverwaltungDetailPage from '@/pages/MitarbeiterverwaltungDetailPage';
import WerkzeugverwaltungPage from '@/pages/WerkzeugverwaltungPage';
import WerkzeugverwaltungDetailPage from '@/pages/WerkzeugverwaltungDetailPage';
import AusleiheRueckgabePage from '@/pages/AusleiheRueckgabePage';
import AusleiheRueckgabeDetailPage from '@/pages/AusleiheRueckgabeDetailPage';
import WartungReparaturPage from '@/pages/WartungReparaturPage';
import WartungReparaturDetailPage from '@/pages/WartungReparaturDetailPage';
// <custom:imports>
const WerkzeugAusleihenPage = lazy(() => import('@/pages/intents/WerkzeugAusleihenPage'));
const WerkzeugRueckgabePage = lazy(() => import('@/pages/intents/WerkzeugRueckgabePage'));
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="mitarbeiterverwaltung" element={<MitarbeiterverwaltungPage />} />
                <Route path="mitarbeiterverwaltung/:id" element={<MitarbeiterverwaltungDetailPage />} />
                <Route path="werkzeugverwaltung" element={<WerkzeugverwaltungPage />} />
                <Route path="werkzeugverwaltung/:id" element={<WerkzeugverwaltungDetailPage />} />
                <Route path="ausleihe-&-rueckgabe" element={<AusleiheRueckgabePage />} />
                <Route path="ausleihe-&-rueckgabe/:id" element={<AusleiheRueckgabeDetailPage />} />
                <Route path="wartung-&-reparatur" element={<WartungReparaturPage />} />
                <Route path="wartung-&-reparatur/:id" element={<WartungReparaturDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                <Route path="intents/werkzeug-ausleihen" element={<Suspense fallback={null}><WerkzeugAusleihenPage /></Suspense>} />
                <Route path="intents/werkzeug-rueckgabe" element={<Suspense fallback={null}><WerkzeugRueckgabePage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
