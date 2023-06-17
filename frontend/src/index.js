import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Root, {loader as courseLoader} from './Root';
import Course from './Course';
import Assignment, {loader as assignmentLoader} from './Assignment';
import Submission, {loader as submissionLoader} from './Submission';
import ErrorPage from './ErrorPage';
import { 
  createBrowserRouter,
  RouterProvider,
  NavLink,
} from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/course/:courseId/',
    element: <Root />,
    errorElement: <ErrorPage />,
    loader: courseLoader,
    handle: {
      crumb: (data) =>
            <div>
            <NavLink 
              to={`/course/${data.courseId}/`} 
              className={({ isActive, isPending }) =>
                        isPending ? "pending" : isActive ? "active" : ""
                        } 
              end>
              {data.courseName}
            </NavLink>
            </div>
    },
    children: [
      {
        index: true,
        element: <Course />,
        loader: courseLoader,
      },
      {
        path: 'assignment/:assignmentId',
        loader: assignmentLoader,
        handle: {
          crumb: (data) => 
            <div>
            <NavLink 
              to={`assignment/${data.assignmentId}`}
              className={({ isActive, isPending }) =>
                        isPending ? "pending" : isActive ? "active" : ""
                        }
              end>
              {data.assignmentName}
            </NavLink>
            </div>
        },
        children: [
          {
            index: true,
            element: <Assignment />,
            loader: assignmentLoader,
          },
          {
            path: 'submission/:submissionId',
            element: <Submission />,
            loader: submissionLoader,
            handle: {
              crumb: (data) => 
                <div>
                <NavLink 
                  to={`assignment/${data.assignmentId}/submission/${data.submissionId}`}
                  className={({ isActive, isPending }) =>
                            isPending ? "pending" : isActive ? "active" : ""
                            }
                  end>
                    Submission {(data.studentName) ? `by ${data.studentName}` : ` ${data.submissionId}`}
                </NavLink>
              </div>,
            },
          },
        ],
      },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

