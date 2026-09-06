// frontend/src/components/AccountNav.tsx
import { Link, useLocation } from "react-router-dom";
import { Wallet as WalletIcon, History } from "lucide-react";

const TABS = [
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/orders", label: "Orders", icon: History },
];

export default function AccountNav() {
  const location = useLocation();

  return (
    <nav className="mb-8 border-b border-line">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                active ? "text-gold" : "text-smoke hover:text-bone"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {active && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}