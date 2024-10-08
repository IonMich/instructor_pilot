// axios login JWT
import { loaderFn } from "./utils"
import axios from "axios"

export const auth: Auth = {
  status: "loggedOut",
  username: undefined,
  accessToken: undefined,
  refreshToken: undefined,
  login: async (username: string, password: string) => {
    const tokens = await passedLoginCheck(username, password)
    if (tokens.access && tokens.refresh) {
      console.log("passed check")
      auth.status = "loggedIn"
      auth.username = username
      auth.accessToken = tokens.access
      auth.refreshToken = tokens.refresh
      // set in local storage
      localStorage.setItem("username", username)
      localStorage.setItem("accessToken", tokens.access)
      localStorage.setItem("refreshToken", tokens.refresh)
    } else {
      console.log("failed check")
      auth.status = "loggedOut"
      auth.username = undefined
      auth.accessToken = undefined
      auth.refreshToken = undefined
      // remove from local storage
      localStorage.removeItem("username")
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
    }
    return tokens
  },
  logout: () => {
    auth.status = "loggedOut"
    auth.username = undefined
    auth.accessToken = undefined
    auth.refreshToken = undefined
    // remove from local storage
    localStorage.removeItem("username")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  },
  getToken: () => {
    const accessToken = localStorage.getItem("accessToken")
    if (accessToken) {
      auth.status = "loggedIn"
      auth.accessToken = accessToken
    } else {
      auth.status = "loggedOut"
      auth.accessToken = undefined
    }
    return auth.accessToken
  },
  getUsername: () => {
    const username = localStorage.getItem("username")
    if (username) {
      auth.username = username
    } else {
      auth.username = undefined
    }
    return auth.username
  },
  getRefreshToken: () => {
    const refreshToken = localStorage.getItem("refreshToken")
    if (refreshToken) {
      auth.refreshToken = refreshToken
    } else {
      auth.refreshToken = undefined
    }
    return auth.refreshToken
  },
  generateFromRefresh: async () => {
    console.log("Try Refresh Access")
    let refreshToken = null
    try {
      refreshToken = auth.getRefreshToken()
    } catch {
      throw Error("Unauthorized caught")
    }
    if (!refreshToken) {
      throw Error("Unauthorized no refresh")
    }
    let tokens
    try {
      tokens = await tryRefreshToken(refreshToken)
    } catch {
      console.log("access errored")
    }
    if (tokens?.access) {
      console.log("refreshed successfully")
      auth.status = "loggedIn"
      auth.accessToken = tokens.access
      // set in local storage
      localStorage.setItem("accessToken", tokens.access)
    } else {
      console.log("failed refresh")
      auth.status = "loggedOut"
      auth.accessToken = undefined
      auth.refreshToken = undefined
      // remove from local storage
      localStorage.removeItem("username")
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      throw Error("Unauthorized")
    }
    return tokens
  },
}

function initAuth() {
  auth.getToken()
  auth.getUsername()
  auth.getRefreshToken()
}

initAuth()

export type Auth = {
  login: (
    username: string,
    password: string
  ) => Promise<{ access: string; refresh: string }>
  logout: () => void
  getToken: () => string | undefined
  getUsername: () => string | undefined
  getRefreshToken: () => string | undefined
  generateFromRefresh: () => Promise<{ access: string }>
  status: "loggedOut" | "loggedIn"
  username?: string
  accessToken?: string
  refreshToken?: string
}

const tokenGenAPIURL = "http://localhost:8000/api/token/"
const tokenRefreshAPIURL = "http://localhost:8000/api/token/refresh/"

async function passedLoginCheck(username: string, password: string) {
  const tokens = loaderFn(() =>
    Promise.resolve().then(async () => {
      const test = await axios
        .post<{ access: string; refresh: string }>(tokenGenAPIURL, {
          username: username,
          password: password,
        })
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 401) {
            throw new Error(`Unauthorized`)
          }
          throw error
        })
      return test
    })
  )
  return tokens
}

async function tryRefreshToken(refreshToken: string) {
  const accessToken = loaderFn(() =>
    Promise.resolve().then(async () => {
      const test = await axios
        .post<{ access: string }>(tokenRefreshAPIURL, {
          refresh: refreshToken,
        })
        .then((response) => response.data)
        .catch((error) => {
          if (error.response?.status === 401) {
            throw new Error("Unauthorized in fetch")
          }
          throw error
        })
      return test
    })
  )
  return accessToken
}
