import { Link } from "react-router-dom";

export default function Nav() {
  return (
    <header className="border-b border-white/10">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="MF" className="h-8 w-8" />
          <span className="font-semibold">Momentum Manager</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign up</Link>
        </nav>
      </div>
    </header>
  );
}
