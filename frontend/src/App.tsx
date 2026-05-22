import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminGate } from "./admin/AdminGate";

const ShowcasePage = lazy(() => import("./showcase/ShowcasePage"));
const ProductDetailPage = lazy(() => import("./showcase/ProductDetailPage"));
const AdminPage = lazy(() => import("./admin/AdminPage"));
const ClientRegisterPage = lazy(() => import("./public/ClientRegisterPage"));
const QuotePublicPage = lazy(() => import("./public/QuotePublicPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p className="showcase__loading">Cargando…</p>}>
        <Routes>
          <Route path="/" element={<ShowcasePage />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route
            path="/admin"
            element={
              <AdminGate>
                <AdminPage />
              </AdminGate>
            }
          />
          <Route path="/c/:token" element={<ClientRegisterPage />} />
          <Route path="/q/:token" element={<QuotePublicPage />} />
          <Route path="*" element={<ShowcasePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
