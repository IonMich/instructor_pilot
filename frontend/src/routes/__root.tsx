import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
  useMatches,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { Auth } from "@/utils/auth"
import { Toaster } from "@/components/ui/toaster"

import { QueryClient } from "@tanstack/react-query"
import { seo } from "@/utils/utils"

export const Route = createRootRouteWithContext<{
  auth: Auth
  queryClient: QueryClient
}>()({
  staticData: () => [
    ...seo({
      title: "Instructor Pilot",
      description: `An open source software project for instructors and teaching assistants to manage and automate their course work.`,
      keywords:
        "instructor,teachingassistant,ta,canvas,ai,pytorch,react,typescript,open-source",
    }),
  ],
  component: RootComponent,
})

function RootComponent() {
  const matches = useMatches()
  const staticData = matches[matches.length - 1]?.staticData
  const title = staticData?.title ?? "Instructor Pilot"
  if (title) {
    document.title = title
  }
  return (
    <div className="p-2">
      <ScrollRestoration/>
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}
