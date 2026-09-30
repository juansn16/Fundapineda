import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Layout } from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardLayout } from './components/DashboardLayout'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { ServicesPage } from './pages/ServicesPage'
import { DoctorsPage } from './pages/DoctorsPage'
import { ContactPage } from './pages/ContactPage'
import { AdscripcionPage } from './pages/AdscripcionPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/dashboard/ProfilePage'
import { NewsPage } from './pages/dashboard/NewsPage'
import { NewsPage as PublicNewsPage } from './pages/NewsPage'
import { NewsDetailPage } from './pages/NewsDetailPage'
import { UsersPage } from './pages/dashboard/UsersPage'
import { RolesPage } from './pages/dashboard/RolesPage'
import { ContactMessagesPage } from './pages/dashboard/ContactMessagesPage'
import { ReportesPage } from './pages/dashboard/ReportesPage'
import { MentoresPage } from './pages/MentoresPage'
import { ProgramsPage } from './pages/ProgramasPage'
import { NotFoundPage } from './pages/NotFoundPage'

const MetricsPage = lazy(() =>
  import('./pages/dashboard/MetricsPage').then(m => ({ default: m.MetricsPage }))
)

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/sobre-nosotros' element={<AboutPage />} />
            <Route path='/mentores' element={<MentoresPage />} />
            <Route path='/noticias' element={<PublicNewsPage />} />
            <Route path='/noticias/:id' element={<NewsDetailPage />} />
            <Route path='/servicios' element={<ServicesPage />} />
<Route path='/programas' element={<ProgramsPage />} />
            <Route path='/directorio-medico' element={<DoctorsPage />} />
            <Route path='/contactanos' element={<ContactPage />} />
            <Route path='/adscripcion' element={<AdscripcionPage />} />
            <Route 
              path='/dashboard' 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path='profile' element={<ProfilePage />} />
              <Route
                path='news'
                element={
                  <ProtectedRoute allowedRoles={['creador_contenido', 'administrador']}>
                    <NewsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='users'
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='roles'
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='metrics'
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <Suspense fallback={
                      <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    }>
                      <MetricsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path='contact'
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <ContactMessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path='reports'
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <ReportesPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path='*' element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
