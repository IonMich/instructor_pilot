import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import { useMatches } from "@tanstack/react-router"

type TBreadcrumbItem = {
  title: string
  path: string
}

export const AppBreadcrumbs = () => {
  const matches = useMatches()
  const latestMatch = matches[matches.length - 1]
  const breadcrumb_items = []
  if (latestMatch.routeId === "/_authenticated") {
    breadcrumb_items.push({
      title: "Home",
      path: "/",
    })
  } else {
    const loaderData = latestMatch.loaderData as {
      breadcrumbItems: TBreadcrumbItem[]
    }
    for (const item of loaderData.breadcrumbItems) {
      breadcrumb_items.push(item)
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumb_items.map((breadcrumb, index) => {
          return (
            <div key={index} className="flex items-center gap-2">
              <BreadcrumbItem>
                {index === breadcrumb_items.length - 1 ? (
                  <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={breadcrumb.path}>
                    {breadcrumb.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index !== breadcrumb_items.length - 1 && <BreadcrumbSeparator />}
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
