import { Link, Route, Routes } from "react-router";
import HomePage from "../pages/HomePage";

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          ElKrizKut
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">Página no encontrada</h1>
        <Link className="mt-6 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950" to="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
