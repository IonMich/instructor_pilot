import {
  Outlet,
  useNavigation,
} from 'react-router-dom'

import NavBreadcrumbs from './NavBreadcrumbs'

export default function Layout() {
  
  const navigation = useNavigation()

  return (
    <>
      <NavBreadcrumbs />
      
      <div
        id="detail"
        className={navigation.state === 'loading' ? 'loading' : ''}
      >
        <Outlet/>
      </div>
    </>
  )
}
