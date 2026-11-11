import { createBrowserRouter, Navigate, useParams, type RouteObject } from 'react-router'
import { BrandStoryPage, CategoryPage, HomePage, NotFound, ProductPage, StoreLayout } from './Store'

const LEGACY_KATEGORI_REDIRECTS: Record<string, string> = {
  tumu: '/cuzdan-kartlik/',
  'cuzdan-kartlik': '/cuzdan-kartlik/',
  'miknatisli-deri-cuzdan': '/miknatisli-deri-cuzdan/',
  'klasik-deri-cuzdan': '/klasik-deri-cuzdan/',
  'klasik-cuzdan': '/klasik-deri-cuzdan/',
  'ince-deri-kartlik': '/ince-deri-kartlik/',
  'deri-canta': '/deri-canta/',
  'seyahat-pasaport': '/deri-pasaportluk/',
  aksesuar: '/deri-aksesuar/',
  'cok-satanlar': '/cuzdan-kartlik/',
  'yeni-gelenler': '/cuzdan-kartlik/',
}

function LegacyCategoryRedirect() {
  const { slug = 'cuzdan-kartlik' } = useParams()
  const target = LEGACY_KATEGORI_REDIRECTS[slug] || '/cuzdan-kartlik/'
  return <Navigate to={target} replace />
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: StoreLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'hikayemiz', Component: BrandStoryPage },
      { path: 'urun/:slug', Component: ProductPage },
      { path: 'kategori/:slug', Component: LegacyCategoryRedirect },
      { path: 'aksesuar', element: <Navigate to="/deri-aksesuar/" replace /> },
      { path: 'cekya-aksesuar', element: <Navigate to="/deri-anahtarlik/" replace /> },
      { path: 'hong-kong-aksesuar', element: <Navigate to="/deri-ajanda-kilifi/" replace /> },
      { path: ':slug', Component: CategoryPage },
      { path: '*', Component: NotFound },
    ],
  },
]

export function createClientRouter() {
  return createBrowserRouter(routes)
}
