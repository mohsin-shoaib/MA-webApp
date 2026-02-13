import { BrowserRouter, useRoutes } from 'react-router-dom'
import { routes } from '@/routes/index'
import { SnackbarProvider } from '@/components/Snackbar/SnackbarProvider'
import { AuthProvider } from '@/contexts/AuthContextProvider'

function AppRoutes() {
  const element = useRoutes(routes)
  return element
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SnackbarProvider>
          <AppRoutes />
        </SnackbarProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
