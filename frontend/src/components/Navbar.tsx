// frontend/src/components/Navbar.tsx
import { useEffect, useState } from "react";
import { Menu, X, Wallet, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";
import logo from "../assets/logo.png";

const links = [
  { label: "Events", href: "/events" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isAuthenticated = !!profile;
  const isOrganizer = profile?.role === "organizer" || profile?.role === "admin";
  const isAdmin = profile?.role === "admin";

  // Base links for non-authenticated users
  const baseLinks = [
    { label: "Events", href: "/events" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  // Links for authenticated users (adds Manage Ticket)
  const authenticatedLinks = [
    { label: "Events", href: "/events" },
    { label: "Manage Ticket", href: "/manage-ticket" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  // Links for organizers/admins (shows Dashboard instead of regular nav)
  const organizerLinks = [
    { label: "Dashboard", href: "/organizer" },
    { label: "Events", href: "/events" },
    { label: "Manage Ticket", href: "/manage-ticket" },
  ];

  const navLinks = isAuthenticated
    ? isOrganizer
      ? organizerLinks
      : authenticatedLinks
    : baseLinks;

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-ink/90 backdrop-blur-md border-b border-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="navbar-container max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img 
            src={logo} 
            alt="SAHM TICKETHUB" 
            className="navbar-logo transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="relative text-sm font-semibold tracking-wide text-smoke hover:text-bone transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1.5 after:h-[2px] after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          
          {isAuthenticated ? (
            <>
              <Link
                to="/wallet"
                className="text-sm font-semibold text-bone/90 hover:text-gold transition-colors px-3 py-2 flex items-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                Wallet
              </Link>
              <Link
                to={isOrganizer ? "/organizer" : "/profile"}
                className="text-sm font-semibold text-bone/90 hover:text-gold transition-colors px-4 py-2 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                {profile?.full_name?.split(" ")[0] || "Account"}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-bold border border-line hover:border-gold/50 text-bone px-5 py-2.5 rounded-full transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 inline mr-1.5" />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-bone/90 hover:text-gold transition-colors px-4 py-2"
              >
                Log in
              </Link>
              <Link
                to="/get-started"
                className="text-sm font-bold bg-gold hover:bg-gold-bright text-ink px-5 py-2.5 rounded-full transition-colors"
              >
                Create event
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-bone"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-ink border-t border-line px-6 py-6 flex flex-col gap-5">
          {navLinks.map((l) => (
            <Link 
              key={l.label} 
              to={l.href} 
              className="text-base font-semibold text-bone"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-3 border-t border-line">
            <div className="py-2">
              <LanguageSwitcher />
            </div>
            
            {isAuthenticated ? (
              <>
                <Link
                  to="/wallet"
                  className="text-sm font-semibold text-bone/90 hover:text-gold transition-colors flex items-center gap-1.5"
                  onClick={() => setOpen(false)}
                >
                  <Wallet className="w-4 h-4" />
                  Wallet
                </Link>
                <Link
                  to={isOrganizer ? "/organizer" : "/profile"}
                  className="text-sm font-semibold text-bone/90 hover:text-gold transition-colors flex items-center gap-1.5"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-3.5 h-3.5" />
                  {profile?.full_name || profile?.email}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                  className="text-sm font-bold border border-line hover:border-gold/50 text-bone px-5 py-2.5 rounded-full text-center"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1.5" />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-bone"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/get-started"
                  className="text-sm font-bold bg-gold text-ink px-5 py-2.5 rounded-full text-center"
                  onClick={() => setOpen(false)}
                >
                  Create event
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}