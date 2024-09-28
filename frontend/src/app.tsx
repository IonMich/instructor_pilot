import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { auth } from "./utils/auth"
import { routeTree } from "./routeTree.gen"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./index.css"
import { AxiosError } from "axios"
import { Spinner } from "./components/ui/loader"

const retryOnUnauthorized = (failureCount: number, error: AxiosError) => {
  if (failureCount === 0 && error.status === 401) {
    auth.generateFromRefresh()
    return true
  }
  return false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof AxiosError) {
          return retryOnUnauthorized(failureCount, error)
        }
        return false
      },
    },
  },
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient,
  },
  defaultPendingComponent: () => (
    // take the full height of the parent
    <div className="grid items-center justify-center h-[90vh] w-full">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  ),
  defaultPendingMinMs: 100,
  defaultPendingMs: 100,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById("app")!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <TooltipProvider>
            <RouterProvider
              router={router}
              defaultPreload="intent"
              context={{ auth }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
