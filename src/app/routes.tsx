import { createBrowserRouter, Navigate, useParams, type RouteObject } from 'react-router'
import { AllCategoriesPage, BrandStoryPage, CategoryPage, HomePage, NotFound, ProductPage, StoreLayout } from './Store'
import { BlogListPage, BlogPostPage, CartPage, KvkkPage, LoginPage, RegisterPage } from './ExtraPages'

const LEGACY_KATEGORI_REDIRECTS: Record<string, string> = {
  tumu: '/kategoriler/',
  'cuzdan-kartlik': '/erkek-deri-cuzdan/',
  'miknatisli-deri-cuzdan': '/erkek-deri-cuzdan/miknatisli/',
  'klasik-deri-cuzdan': '/erkek-deri-cuzdan/',
  'klasik-cuzdan': '/erkek-deri-cuzdan/',
  'ince-deri-kartlik': '/deri-kartlik/',
  'deri-canta': '/erkek-deri-canta/',
  'seyahat-pasaport': '/deri-aksesuar/pasaport-kilifi/',
  aksesuar: '/deri-aksesuar/',
  'cok-satanlar': '/erkek-deri-cuzdan/',
  'yeni-gelenler': '/erkek-deri-cuzdan/',
}

function LegacyCategoryRedirect() {
  const { slug = 'erkek-deri-cuzdan' } = useParams()
  const target = LEGACY_KATEGORI_REDIRECTS[slug] || '/erkek-deri-cuzdan/'
  return <Navigate to={target} replace />
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: StoreLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'kategoriler', Component: AllCategoriesPage },
      { path: 'koleksiyonlar', element: <Navigate to="/kategoriler/" replace /> },
      { path: 'hikayemiz', Component: BrandStoryPage },
      { path: 'giris', Component: LoginPage },
      { path: 'uye-ol', Component: RegisterPage },
      { path: 'sepet', Component: CartPage },
      { path: 'kvkk', Component: KvkkPage },
      { path: 'blog', Component: BlogListPage },
      { path: 'blog/:slug', Component: BlogPostPage },
      { path: 'urun/:slug', Component: ProductPage },
      { path: 'kategori/:slug', Component: LegacyCategoryRedirect },
      { path: 'aksesuar', element: <Navigate to="/deri-aksesuar/" replace /> },
      { path: 'cekya-aksesuar', element: <Navigate to="/deri-aksesuar/anahtarlik/" replace /> },
      { path: 'hong-kong-aksesuar', element: <Navigate to="/deri-aksesuar/ajanda-defter-kilifi/" replace /> },
      { path: 'cuzdan-kartlik', element: <Navigate to="/erkek-deri-cuzdan/" replace /> },
      { path: 'miknatisli-deri-cuzdan', element: <Navigate to="/erkek-deri-cuzdan/miknatisli/" replace /> },
      { path: 'klasik-deri-cuzdan', element: <Navigate to="/erkek-deri-cuzdan/" replace /> },
      { path: 'ince-deri-kartlik', element: <Navigate to="/deri-kartlik/" replace /> },
      { path: 'deri-pasaportluk', element: <Navigate to="/deri-aksesuar/pasaport-kilifi/" replace /> },
      { path: 'deri-canta', element: <Navigate to="/erkek-deri-canta/" replace /> },
      { path: 'deri-el-cantasi', element: <Navigate to="/erkek-deri-canta/el-cantasi/" replace /> },
      { path: 'omuz-gogus-cantasi', element: <Navigate to="/erkek-deri-canta/omuz-cantasi/" replace /> },
      { path: 'deri-anahtarlik', element: <Navigate to="/deri-aksesuar/anahtarlik/" replace /> },
      { path: 'deri-ajanda-kilifi', element: <Navigate to="/deri-aksesuar/ajanda-defter-kilifi/" replace /> },
      { path: 'deri-bileklik', element: <Navigate to="/deri-aksesuar/erkek-bileklik/" replace /> },
      { path: 'deri-kemer', element: <Navigate to="/deri-aksesuar/deri-kemer/" replace /> },
      { path: ':parentSlug/:childSlug', Component: CategoryPage },
      { path: ':slug', Component: CategoryPage },
      { path: '*', Component: NotFound },
    ],
  },
]

export function createClientRouter() {
  return createBrowserRouter(routes)
}
