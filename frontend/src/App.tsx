// frontend/src/App.tsx
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-ink text-bone font-body antialiased selection:bg-gold selection:text-ink">
      <Navbar />
      <main className="pt-[79px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}