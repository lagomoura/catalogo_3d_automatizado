import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AssistantProvider } from "./assistant/AssistantProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { storeSlug } from "./api/client";

const ShowcasePage = lazy(() => import("./showcase/ShowcasePage"));
const ProductDetailPage = lazy(() => import("./showcase/ProductDetailPage"));
const AdminPage = lazy(() => import("./admin/AdminPage"));
const ClientRegisterPage = lazy(() => import("./public/ClientRegisterPage"));
const QuotePublicPage = lazy(() => import("./public/QuotePublicPage"));
const LoginPage = lazy(() => import("./auth/LoginPage"));
const SignupPage = lazy(() => import("./auth/SignupPage"));
const LandingPage = lazy(() => import("./landing/LandingPage"));

/**
 * Ruta raíz host-aware: en un subdominio de tenant (`<slug>.dominio`) muestra la
 * vitrina de ese tenant; en el dominio de app / apex / localhost muestra la landing
 * pública. `storeSlug()` ya distingue ambos casos (devuelve null fuera de un tenant).
 */
function RootRoute() {
  return storeSlug() ? <ShowcasePage /> : <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="showcase__loading">Cargando…</p>}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/producto/:id" element={<ProductDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AssistantProvider>
                    <AdminPage />
                  </AssistantProvider>
                </RequireAuth>
              }
            />
            <Route path="/c/:token" element={<ClientRegisterPage />} />
            <Route path="/q/:token" element={<QuotePublicPage />} />
            <Route path="*" element={<RootRoute />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
