import * as React from "react"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
}).update({
  component: LoginForm,
})

function LoginForm() {
  const router = useRouter()
  const { auth, status } = Route.useRouteContext({
    select: ({ auth }) => ({ auth, status: auth.status }),
  })
  const search = Route.useSearch()
  const [username, setUsername] = React.useState("")

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = (
      e.currentTarget.elements.namedItem("password") as HTMLInputElement
    ).value
    console.log("username", username)
    await auth.login(username, password)
    router.invalidate()
  }

  // Ah, the subtle nuances of client side auth. 🙄
  React.useLayoutEffect(() => {
    console.log("status", status)
    if (status === "loggedIn" && search.redirect) {
      router.history.push(search.redirect)
    }
  }, [status, search.redirect, router.history])
  return status === "loggedIn" ? (
    <AlreadyLoggedIn auth={auth} router={router} />
  ) : (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your username below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4" id="login-form">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder=""
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit" form="login-form">
            Sign in
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function AlreadyLoggedIn({ auth, router }) {
  const logout = async () => {
    await auth.logout()
    router.invalidate()
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Already Logged In</CardTitle>
          <CardDescription>
            You are already logged in as{" "}
            <span className="font-bold text-accent-foreground">
              {auth.username}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={logout} className="w-full">
            Logout
          </Button>
          <Button asChild className="w-full">
            <Link to="/">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
