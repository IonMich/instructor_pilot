import {
  Outlet,
  useNavigation,
} from 'react-router-dom'

import { useState } from 'react'

import NavBreadcrumbs from './NavBreadcrumbs'

export default function Layout() {
  
  const navigation = useNavigation()

  const [filters, setFilters] = useState([])

  return (
    <>
      <NavBreadcrumbs />
      
      <div
        id="detail"
        className={navigation.state === 'loading' ? 'loading' : ''}
      >
        <Outlet context={[ filters, setFilters ]} />
      </div>
    </>
  )
}
