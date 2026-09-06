// frontend/src/components/DashboardLayout.tsx
import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  Home,
  DollarSign,
  Settings as SettingsIcon,
  Plus,
  Menu,
  X,
  Scale,
  Calendar,
  CreditCard,
  Wallet,
  ScanLine,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === "admin";
  const isOrganizer = profile?.role === "organizer";

  // Navigation items based on role
  const navItems = isAdmin
    ? [
        { to: "/admin", label: "Overview", icon: LayoutDashboard },
        { to: "/admin/events", label: "All events", icon: Ticket },
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/payouts", label: "Payouts", icon: DollarSign },
        { to: "/admin/refunds", label: "Refunds", icon: CreditCard },
        { to: "/admin/reconciliation", label: "Reconciliation", icon: Scale },
        { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
      ]
    : isOrganizer
    ? [
        { to: "/organizer", label: "Dashboard", icon: LayoutDashboard },
        { to: "/organizer/create-event", label: "Create Event", icon: Plus },
        { to: "/organizer/events", label: "My Events", icon: Calendar },
        { to: "/organizer/scan", label: "Scan Tickets", icon: ScanLine },
        { to: "/organizer/payout-settings", label: "Payouts", icon: DollarSign },
      ]
    : [];

  async function handleSignOut() {
    setMobileOpen(false);
    await signOut();
    navigate("/");
  }

  // Get user display name
  const getUserName = () => {
    if (!profile) return "User";
    return profile.full_name || profile.email || "User";
  };

  // Get role display
  const getRoleDisplay = () => {
    if (!profile) return "";
    return profile.role === "admin" 
      ? "Admin" 
      : profile.role === "organizer" 
      ? "Organizer" 
      : "Attendee";
  };

  // Check if a route is active
  const isRouteActive = (route: string) => {
    if (route === "/organizer") {
      return location.pathname === "/organizer";
    }
    if (route === "/admin") {
      return location.pathname === "/admin";
    }
    // For nested routes like /organizer/scan or /organizer/stats
    if (route.startsWith("/organizer/")) {
      return location.pathname === route || location.pathname.startsWith(route + "/");
    }
    if (route.startsWith("/admin/")) {
      return location.pathname === route || location.pathname.startsWith(route + "/");
    }
    return location.pathname === route || location.pathname.startsWith(route + "/");
  };

  return (
    <div className="min-h-screen bg-ink text-bone font-body antialiased">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8 min-w-0">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="font-display text-lg tracking-wide text-gold shrink-0"
            >
              SAHM TICKETHUB
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isRouteActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full transition-colors whitespace-nowrap ${
                      active ? "bg-gold text-ink" : "text-smoke hover:text-bone"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-4">
            <span className="hidden lg:inline text-xs text-smoke whitespace-nowrap">
              {getUserName()} · <span className="uppercase text-gold">{getRoleDisplay()}</span>
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-smoke hover:text-bone transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Site
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-smoke hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-smoke hover:text-bone hover:bg-panel transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-line bg-ink px-6 py-4 space-y-1">
            {navItems.map((item) => {
              const active = isRouteActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 text-sm font-semibold px-3 py-2.5 rounded-xl transition-colors ${
                    active ? "bg-gold text-ink" : "text-smoke hover:text-bone hover:bg-panel"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-line space-y-1">
              <p className="px-3 pb-1 text-xs text-smoke">
                {getUserName()} · <span className="uppercase text-gold">{getRoleDisplay()}</span>
              </p>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 text-sm font-semibold px-3 py-2.5 rounded-xl text-smoke hover:text-bone hover:bg-panel transition-colors"
              >
                <Home className="w-4 h-4" />
                Site
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 text-sm font-semibold px-3 py-2.5 rounded-xl text-smoke hover:text-red-400 hover:bg-panel transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}