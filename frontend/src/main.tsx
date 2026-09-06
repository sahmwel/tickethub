// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './lib/i18n';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import App from './App';
import './index.css';

// Import your pages
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Checkout from './pages/Checkout';
import Bag from './pages/Bag';
import About from './pages/About';
import Contact from './pages/Contact';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import NotFound from './pages/NotFound';
import Wallet from './pages/Wallet';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import ManageTicket from './pages/ManageTicket';
import RequestRefund from './pages/RequestRefund';
import GetStarted from './pages/GetStarted';
import Installments from './pages/Installments';

// Legal pages
import RefundPolicy from './pages/RefundPolicy';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import EditEvent from './pages/organizer/EditEvent';
import EventStats from './pages/organizer/EventStats';
import ScanTickets from './pages/organizer/ScanTickets';
import ScanSelection from './pages/organizer/ScanSelection';
import PayoutSettings from './pages/organizer/PayoutSettings';
import MyEvents from './pages/organizer/MyEvents';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AllEvents from './pages/admin/AllEvents';
import AllUsers from './pages/admin/AllUsers';
import AdminPayouts from './pages/admin/Payouts';
import Reconciliation from './pages/admin/Reconciliation';
import Settings from './pages/admin/Settings';
import Refunds from './pages/admin/Refunds';

function Root() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - wrapped in App layout with Navbar & Footer */}
            <Route element={<App />}>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/checkout/:slug" element={<Checkout />} />
              <Route path="/bag" element={<Bag />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:orderRef" element={<OrderDetail />} />
              <Route path="/refund/:orderRef" element={<RequestRefund />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/manage-ticket" element={<ManageTicket />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/installments" element={<Installments />} />
            </Route>
            
            {/* Dashboard routes - without Navbar/Footer */}
            <Route element={<DashboardLayout />}>
              {/* Organizer routes */}
              <Route 
                path="/organizer" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <OrganizerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/create-event" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <CreateEvent />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/events" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <MyEvents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/scan" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <ScanSelection />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/scan/:eventId" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <ScanTickets />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/stats" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <EventStats />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/event/:eventId" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <EventStats />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/event/:eventId/edit" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <EditEvent />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/organizer/payout-settings" 
                element={
                  <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                    <PayoutSettings />
                  </ProtectedRoute>
                } 
              />

              {/* Admin routes */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/events" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AllEvents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AllUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/payouts" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminPayouts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/reconciliation" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Reconciliation />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/refunds" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Refunds />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/settings" 
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* 404 Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);