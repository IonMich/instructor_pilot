import { cn } from "@/lib/utils"
import { LuLoader2 } from "react-icons/lu"

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <LuLoader2
      className={cn("mx-4 h-8 w-8 text-primary/60 animate-spin", className)}
    />
  )
}

export function Loader({
  show,
  wait,
}: {
  show?: boolean
  wait?: `delay-${number}`
}) {
  return (
    <div
      className={`inline-block animate-spin px-3 transition ${
        (show ?? true)
          ? `opacity-1 ${wait ?? "delay-300"}`
          : "opacity-0 delay-0"
      }`}
    >
        <Spinner />
    </div>
  )
}
