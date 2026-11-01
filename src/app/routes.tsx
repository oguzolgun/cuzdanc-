import { createBrowserRouter } from 'react-router'
import { CategoryPage, HomePage, NotFound, ProductPage, StoreLayout } from './Store'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: StoreLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'kategori/:slug', Component: CategoryPage },
      { path: 'urun/:slug', Component: ProductPage },
      { path: '*', Component: NotFound },
    ],
  },
])
