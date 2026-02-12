import { BrowserRouter, useRoutes } from 'react-router-dom'
import { routes } from '@/routes/index'
import { SnackbarProvider } from '@/components/Snackbar/SnackbarProvider'

function AppRoutes() {
  const element = useRoutes(routes)
  return element
}

function App() {
  return (
    <BrowserRouter>
      <SnackbarProvider>
        <AppRoutes />
      </SnackbarProvider>
    </BrowserRouter>
  )
}

export default App
