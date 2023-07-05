import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, NavLink, } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import './index.css'

import ErrorPage from './ErrorPage'

import Dashboard, { loader as dashboardLoader, action as dashboardAction } from './routes/Dashboard'
import Layout from './routes/Layout'

import Course, {
  loader as courseLoader,
  action as courseAction,
} from './routes/courses/Course'
import EditCourse, { action as courseEditAction } from './routes/courses/Edit'
import { action as courseDestroyAction } from './routes/courses/Destroy'

import Assignment, { loader as assignmentLoader } from './routes/assignments/Assignment'

import Submission, { loader as submissionLoader } from './routes/submissions/Submission'
import { action as submissionEditAction } from './routes/submissions/Edit'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 10,
    },
  },
})

const basePath = '/'
const coursePath = 'courses/:courseId/'
const editCoursePath = 'edit'
const destroyCoursePath = 'destroy'
const createAssignmentPath = 'assignments/create'
const assignmentPath = 'assignments/:assignmentId/'
const editAssignmentPath = 'edit'
const destroyAssignmentPath = 'destroy'
const createSubmissionPath = 'submissions/create'
const submissionPath = 'submissions/:submissionId/'
const editSubmissionPath = 'edit'
const destroySubmissionPath = 'destroy'

function Crumb (match) {
  const isHome = match.id === '0'
  const hasName = (match.data && match.data.name)
  const linkDisplay = isHome ? 'Home' : hasName ? match.data.name : '---'
  
  return (
    <div>
      <NavLink 
        to={match.pathname}
        className={({ isActive, isPending }) =>
                  isPending ? "pending" : isActive ? "active" : ""
                  } 
        end>
        {linkDisplay}
      </NavLink>
    </div>
  )
}

const submissionRoutes = [
  {
    path: createSubmissionPath,
    element: <div>Create Submission</div>,
    handle: { crumb: Crumb },
  },
  {
    path: submissionPath,
    loader: submissionLoader(queryClient),
    handle: { crumb: Crumb },
    children: [
      {
        index: true,
        element: <Submission />,
      },
      {
        path: editSubmissionPath,
        action: submissionEditAction(queryClient),
      },
      {
        path: destroySubmissionPath,
        element: <div>Destroy Submission</div>,
        handle: { crumb: Crumb },
      },
    ],
  },
]

const assignmentRoutes = [
  {
    path: createAssignmentPath,
    element: <div>Create Assignment</div>,
    handle: { crumb: Crumb },
  },
  {
    path: assignmentPath,
    loader: assignmentLoader(queryClient),
    handle: { crumb: Crumb },
    children: [
      {
        index: true,
        element: <Assignment />,
      },
      {
        path: editAssignmentPath,
        element: <div>Edit Assignment</div>,
        handle: { crumb: Crumb },
      },
      {
        path: destroyAssignmentPath,
        element: <div>Destroy Assignment</div>,
        handle: { crumb: Crumb },
      },
      ...submissionRoutes,
    ],
  },
]

const courseRoutes = [
  {
    path: coursePath,
    loader: courseLoader(queryClient),
    handle: { crumb: Crumb },
    children: [
      {
        index: true,
        element: <Course />,
        action: courseAction(queryClient),
      },
      {
        path: editCoursePath,
        element: <EditCourse />,
        loader: courseLoader(queryClient),
        action: courseEditAction(queryClient),
        handle: { crumb: Crumb },
      },
      {
        path: destroyCoursePath,
        element: <EditCourse />,
        action: courseDestroyAction(queryClient),
        errorElement: <div>Oops! There was an error.</div>,
        handle: { crumb: Crumb },
      },
      ...assignmentRoutes,
    ],
  },
]

const router = createBrowserRouter([
    {
      path: basePath,
      element: <Layout />,
      errorElement: <ErrorPage />,
      handle: { crumb: Crumb },
      children: [
        {
          index: true,
          element: <Dashboard />,
          loader: dashboardLoader(queryClient),
          action: dashboardAction(queryClient),
        },
        ...courseRoutes,
      ],
    },
  ]
)


const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Could not find root element')
ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <ReactQueryDevtools position="bottom-right" />
        </QueryClientProvider>
    </React.StrictMode>,
)
