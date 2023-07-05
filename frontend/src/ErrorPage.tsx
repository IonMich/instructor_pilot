import { useRouteError } from 'react-router-dom'

import './ErrorPage.css'

// define the interface of the error object
interface Error {
    statusText?: string
    message?: string
}

export default function ErrorPage() {
  const error = useRouteError() as Error
  console.error(error)

  return (
    <div id="error-page">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </div>
  )
}