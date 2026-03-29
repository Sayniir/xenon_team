import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { useRealtimeSync } from './hooks/useRealtimeSync'
import ErrorBoundary from './components/shared/ErrorBoundary'
import ToastContainer from './components/shared/ToastContainer'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import Tasks from './pages/Tasks'
import Projects from './pages/Projects'
import Ideas from './pages/Ideas'
import Files from './pages/Files'
import ActivityPage from './pages/Activity'
import Settings from './pages/Settings'
import Chat from './pages/Chat'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="loading-page">
        <div className="loading-spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppContent() {
  const { initialize } = useAuthStore()
  useRealtimeSync()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="projects" element={<Projects />} />
          <Route path="ideas" element={<Ideas />} />
          <Route path="files" element={<Files />} />
          <Route path="chat" element={<Chat />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  )
}
