import React from 'react'
import * as ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, NavLink, } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import './index.css'

import { loader as dashboardLoader, action as dashboardAction } from './routes/Dashboard'


import { action as courseEditAction } from './routes/courses/Edit'
import { action as courseDestroyAction } from './routes/courses/Destroy'

import { lazy } from 'react';

import ErrorPage from './ErrorPage';

const Submission = lazy(() => import('./routes/submissions/Submission'));
const Assignment = lazy(() => import('./routes/assignments/Assignment'));
const Course = lazy(() => import('./routes/courses/Course'));
const EditCourse = lazy(() => import('./routes/courses/Edit'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const Layout = lazy(() => import('./routes/Layout'));


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
  console.log("match", match)
  
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
    // loader: submissionLoader(queryClient),
    async loader({ params }) {
      const { loader } = await import("./routes/submissions/loaders");
      const toLoad = loader(queryClient);
      console.log("toLoad", toLoad);
      return toLoad({ params })
    },
    handle: { crumb: Crumb },
    children: [
      {
        index: true,
        element: <Submission />,
      },
      {
        path: editSubmissionPath,
        async action({ request, params }) {
          const { action } = await import("./routes/submissions/Edit");
          const toLoad =  action(queryClient);
          console.log("toLoad", toLoad);
          return toLoad({ request, params })
        },
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
    async loader({ params }) {
      const { loader } = await import("./routes/assignments/loaders");
      const toLoad = loader(queryClient);
      console.log("toLoad", toLoad);
      return toLoad({ params })
    },
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
    handle: { crumb: Crumb },
    async loader({ params }) {
      const { loader } = await import("./routes/courses/loaders");
      const toLoad = loader(queryClient);
      console.log("toLoad", toLoad);
      return toLoad({ params })
    },
    children: [
      {
        index: true,
        element: <Course />,
      },
      {
        path: editCoursePath,
        element: <EditCourse />,
        async loader({ params }) {
          const { loader } = await import("./routes/courses/loaders");
          const toLoad = loader(queryClient);
          console.log("toLoad", toLoad);
          return toLoad({ params })
        },
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
