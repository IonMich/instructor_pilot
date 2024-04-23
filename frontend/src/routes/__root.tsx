import { createRootRouteWithContext, Outlet, useMatches } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Auth } from '@/utils/auth'
import { Toaster } from "@/components/ui/toaster"

import { QueryClient } from '@tanstack/react-query'
import { seo } from '@/utils/utils'

export const Route = createRootRouteWithContext<{
  auth: Auth,
  queryClient: QueryClient,
}>()({
  meta: () => [
    ...seo({
      title: 'Instructor Pilot',
      description: `An open source software project for instructors and teaching assistants to manage and automate their course work.`,
      keywords:
        'instructor,teachingassistant,ta,canvas,ai,pytorch,react,typescript,open-source',
    }),
  ],
  component: RootComponent,
})
  
function RootComponent() {
  const matches = useMatches()
  const meta = matches[matches.length - 1]?.meta ?? []
  const title = meta.find((m) => m.title)?.title
  if (title) {
    document.title = title
  }
  return (
    <div className="p-2">
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  )
}