// import * as React from "react"
// import * as TabsPrimitive from "@radix-ui/react-tabs"

// import { cn } from "@/lib/utils"

// const Tabs = TabsPrimitive.Root

// const TabsList = React.forwardRef<
//   React.ElementRef<typeof TabsPrimitive.List>,
//   React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
// >(({ className, ...props }, ref) => (
//   <TabsPrimitive.List
//     ref={ref}
//     className={cn(
//       "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
//       className
//     )}
//     {...props}
//   />
// ))
// TabsList.displayName = TabsPrimitive.List.displayName

// const TabsTrigger = React.forwardRef<
//   React.ElementRef<typeof TabsPrimitive.Trigger>,
//   React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
// >(({ className, ...props }, ref) => (
//   <TabsPrimitive.Trigger
//     ref={ref}
//     className={cn(
//       "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
//       className
//     )}
//     {...props}
//   />
// ))
// TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

// const TabsContent = React.forwardRef<
//   React.ElementRef<typeof TabsPrimitive.Content>,
//   React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
// >(({ className, ...props }, ref) => (
//   <TabsPrimitive.Content
//     ref={ref}
//     className={cn(
//       "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
//       className
//     )}
//     {...props}
//   />
// ))
// TabsContent.displayName = TabsPrimitive.Content.displayName

// export { Tabs, TabsList, TabsTrigger, TabsContent }

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      " inline-flex w-full items-center justify-start  gap-0 border-b-2 border-border p-0 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "mx-2 -mb-[2px] inline-flex items-center justify-start  whitespace-nowrap border-b-2 px-2  py-2   text-base font-medium  transition-all disabled:pointer-events-none disabled:text-muted-foreground data-[state=active]:border-primary data-[state=inactive]:border-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2  ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
