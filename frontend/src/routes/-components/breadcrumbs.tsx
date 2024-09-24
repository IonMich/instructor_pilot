import {
  Breadcrumb,
  BreadcrumbItem,
  // BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import { Link, useMatches } from "@tanstack/react-router"

export type TBreadcrumbItem = {
  title: string
  to: string
  params: Record<string, string | number>
}

export const AppBreadcrumbs = () => {
  const matches = useMatches()
  const latestMatch = matches[matches.length - 1]
  const breadcrumb_items = []
  const loaderData = latestMatch.loaderData as {
    breadcrumbItems: TBreadcrumbItem[]
  }
  if (!(loaderData?.breadcrumbItems)) {
    return null
  }
  for (const item of loaderData.breadcrumbItems) {
    breadcrumb_items.push(item)
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
                  <Link to={breadcrumb.to} params={breadcrumb.params}>
                    {breadcrumb.title}
                  </Link>
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
