import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AssistantProvider } from "./assistant/AssistantProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";

const ShowcasePage = lazy(() => import("./showcase/ShowcasePage"));
const ProductDetailPage = lazy(() => import("./showcase/ProductDetailPage"));
const AdminPage = lazy(() => import("./admin/AdminPage"));
const ClientRegisterPage = lazy(() => import("./public/ClientRegisterPage"));
const QuotePublicPage = lazy(() => import("./public/QuotePublicPage"));
const LoginPage = lazy(() => import("./auth/LoginPage"));
const SignupPage = lazy(() => import("./auth/SignupPage"));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="showcase__loading">Cargando…</p>}>
          <Routes>
            <Route path="/" element={<ShowcasePage />} />
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
            <Route path="*" element={<ShowcasePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
