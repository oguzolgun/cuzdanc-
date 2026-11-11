import { useMemo } from 'react'
import { RouterProvider } from 'react-router'
import { createClientRouter } from './routes'

export default function App() {
  const router = useMemo(() => createClientRouter(), [])
  return <RouterProvider router={router} />
}
