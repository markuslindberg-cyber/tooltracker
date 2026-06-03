import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import HandTools from './pages/HandTools';
import ArbetskläderUtrustning from './pages/ArbetskläderUtrustning';
import Inventarier from './pages/Inventarier';
import RequestWorkwear from './pages/RequestWorkwear';
import ArbetskläderRequestWorkwear from './pages/ArbetskläderRequestWorkwear';
import LokalvardUttag from './pages/LokalvardUttag';
import LokalvardNyttUttag from './pages/LokalvardNyttUttag';
import LokalvardBegaranAttGodkanna from './pages/LokalvardBegaranAttGodkanna';
import LokalvardKostnadPerKund from './pages/LokalvardKostnadPerKund';
import LokalvardKunder from './pages/LokalvardKunder';
import LokalvardLager from './pages/LokalvardLager';
import LokalvardArtikelDetaljer from './pages/LokalvardArtikelDetaljer';
import LokalvardInköpImport from './pages/LokalvardInköpImport';
import LokalvardUttagImport from './pages/LokalvardUttagImport';
import LocationDetails from './pages/LocationDetails';
import InventoryReports from './pages/InventoryReports';
import CheckoutReports from './pages/CheckoutReports';
import SåldaRedskap from './pages/SåldaRedskap';
import ServicePage from './pages/ServicePage';
import ServiceMallar from './pages/ServiceMallar';
import Huvudmaskiner from './pages/Huvudmaskiner';
import LoanRequests from './pages/LoanRequests';
import ArbetskladerBegaranAttGodkanna from './pages/ArbetskladerBegaranAttGodkanna';
import CategoryManagement from './pages/CategoryManagement';
import ImportHistorik from './pages/ImportHistorik';
import ToolImport from './pages/ToolImport';
import Papperskorg from './pages/Papperskorg';
import NavInstellningar from './pages/NavInstellningar';
import AdminLayoutEditor from './pages/AdminLayoutEditor';
import LokalvardRequestArtikel from './pages/LokalvardRequestArtikel';
import RollBehorigheter from './pages/RollBehorigheter';
import OwnerOverview from './pages/OwnerOverview';
import DepreciationSettings from './pages/DepreciationSettings';
import ArbetskläderStreckkodhantering from './pages/ArbetskläderStreckkodhantering';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PageTransition = ({ children }) => {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <AnimatePresence mode="wait">
      <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <PageTransition>
            <MainPage />
          </PageTransition>
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <PageTransition>
                <Page />
              </PageTransition>
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/HandTools" element={<LayoutWrapper currentPageName="HandTools"><HandTools /></LayoutWrapper>} />
      <Route path="/locations/:locationId" element={<LayoutWrapper currentPageName="Locations"><LocationDetails /></LayoutWrapper>} />
      <Route path="/InventoryReports" element={<LayoutWrapper currentPageName="InventoryReports"><InventoryReports /></LayoutWrapper>} />
      <Route path="/ArbetskladerUtrustning" element={<LayoutWrapper currentPageName="ArbetskläderUtrustning"><ArbetskläderUtrustning /></LayoutWrapper>} />
      <Route path="/Arbetsklader/CheckoutReports" element={<LayoutWrapper currentPageName="CheckoutReports"><CheckoutReports /></LayoutWrapper>} />
      <Route path="/Inventory/SaldaRedskap" element={<LayoutWrapper currentPageName="SåldaRedskap"><SåldaRedskap /></LayoutWrapper>} />
      <Route path="/RequestWorkwear" element={<LayoutWrapper currentPageName="RequestWorkwear"><RequestWorkwear /></LayoutWrapper>} />
      <Route path="/ArbetskläderRequestWorkwear" element={<LayoutWrapper currentPageName="ArbetskläderRequestWorkwear"><ArbetskläderRequestWorkwear /></LayoutWrapper>} />
      <Route path="/Inventarier" element={<LayoutWrapper currentPageName="Inventarier"><Inventarier /></LayoutWrapper>} />
      <Route path="/Lokalvard/Uttag" element={<LayoutWrapper currentPageName="LokalvardUttag"><LokalvardUttag /></LayoutWrapper>} />
      <Route path="/Lokalvard/BegaranAttGodkanna" element={<LayoutWrapper currentPageName="LokalvardBegaranAttGodkanna"><LokalvardBegaranAttGodkanna /></LayoutWrapper>} />
      <Route path="/Lokalvard/KostnadPerKund" element={<LayoutWrapper currentPageName="LokalvardKostnadPerKund"><LokalvardKostnadPerKund /></LayoutWrapper>} />
      <Route path="/Lokalvard/Kunder" element={<LayoutWrapper currentPageName="LokalvardKunder"><LokalvardKunder /></LayoutWrapper>} />
      <Route path="/Lokalvard/NyttUttag" element={<LayoutWrapper currentPageName="LokalvardNyttUttag"><LokalvardNyttUttag /></LayoutWrapper>} />
      <Route path="/Lokalvard/Lager" element={<LayoutWrapper currentPageName="LokalvardLager"><LokalvardLager /></LayoutWrapper>} />
      <Route path="/Lokalvard/InköpImport" element={<LayoutWrapper currentPageName="LokalvardInköpImport"><LokalvardInköpImport /></LayoutWrapper>} />
      <Route path="/Lokalvard/UttagImport" element={<LayoutWrapper currentPageName="LokalvardUttagImport"><LokalvardUttagImport /></LayoutWrapper>} />
      <Route path="/Lokalvard/UttagImport" element={<LayoutWrapper currentPageName="LokalvardUttagImport"><LokalvardUttagImport /></LayoutWrapper>} />
      <Route path="/Lokalvard/Artikel/:artikelnummer" element={<LayoutWrapper currentPageName="ArtikelDetaljer"><LokalvardArtikelDetaljer /></LayoutWrapper>} />
      <Route path="/Service" element={<LayoutWrapper currentPageName="Service"><ServicePage /></LayoutWrapper>} />
      <Route path="/ServiceMallar" element={<LayoutWrapper currentPageName="ServiceMallar"><ServiceMallar /></LayoutWrapper>} />
      <Route path="/Huvudmaskiner" element={<LayoutWrapper currentPageName="Huvudmaskiner"><Huvudmaskiner /></LayoutWrapper>} />
      <Route path="/Transfers" element={<LayoutWrapper currentPageName="LoanRequests"><LoanRequests /></LayoutWrapper>} />
      <Route path="/Arbetsklader/Forfragan" element={<LayoutWrapper currentPageName="ArbetskladerForfragan"><ArbetskladerBegaranAttGodkanna /></LayoutWrapper>} />
      <Route path="/Administration/Kategorier" element={<LayoutWrapper currentPageName="CategoryManagement"><CategoryManagement /></LayoutWrapper>} />
      <Route path="/Administration/Papperskorg" element={<LayoutWrapper currentPageName="Papperskorg"><Papperskorg /></LayoutWrapper>} />
      <Route path="/Lokalvard/ImportHistorik" element={<LayoutWrapper currentPageName="ImportHistorik"><ImportHistorik /></LayoutWrapper>} />
      <Route path="/Inventory/ToolImport" element={<LayoutWrapper currentPageName="ToolImport"><ToolImport /></LayoutWrapper>} />
      <Route path="/LokalvardRequestArtikel" element={<LayoutWrapper currentPageName="LokalvardRequestArtikel"><LokalvardRequestArtikel /></LayoutWrapper>} />
      <Route path="/NavInstellningar" element={<LayoutWrapper currentPageName="NavInstellningar"><NavInstellningar /></LayoutWrapper>} />
      <Route path="/AdminLayoutEditor" element={<LayoutWrapper currentPageName="AdminLayoutEditor"><AdminLayoutEditor /></LayoutWrapper>} />
      <Route path="/Administration/RollBehorigheter" element={<LayoutWrapper currentPageName="RollBehorigheter"><RollBehorigheter /></LayoutWrapper>} />
      <Route path="/OwnerOverview" element={<LayoutWrapper currentPageName="OwnerOverview"><OwnerOverview /></LayoutWrapper>} />
      <Route path="/Administration/Avskrivningar" element={<LayoutWrapper currentPageName="DepreciationSettings"><DepreciationSettings /></LayoutWrapper>} />
      <Route path="/Arbetsklader/Streckkodhantering" element={<LayoutWrapper currentPageName="ArbetskläderStreckkodhantering"><ArbetskläderStreckkodhantering /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App