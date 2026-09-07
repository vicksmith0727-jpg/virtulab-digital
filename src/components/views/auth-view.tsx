'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Sprout,
  Leaf,
  ArrowLeft,
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

/* ------------------------------------------------------------------ */

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text().catch(() => '')
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = data?.error || text || 'Request failed'
    const err = new Error(msg) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data
}

/* ------------------------------------------------------------------ */

export function AuthView() {
  const setView = useAppStore((s) => s.setView)
  const { toast } = useToast()
  const [tab, setTab] = React.useState<'login' | 'register'>('login')

  // Sign-in form state
  const [loginEmail, setLoginEmail] = React.useState('')
  const [loginPassword, setLoginPassword] = React.useState('')

  // Register form state
  const [regName, setRegName] = React.useState('')
  const [regEmail, setRegEmail] = React.useState('')
  const [regPassword, setRegPassword] = React.useState('')

  const loginMut = useMutation({
    mutationFn: (b: { email: string; password: string }) => postJson('/api/auth/login', b),
    onSuccess: () => {
      toast({ title: 'Welcome back', description: 'Taking you to your studio…' })
      // Give the toast a beat, then reload so the session query re-fetches.
      setTimeout(() => window.location.reload(), 350)
    },
    onError: (err: Error) =>
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' }),
  })

  const registerMut = useMutation({
    mutationFn: (b: { name: string; email: string; password: string }) =>
      postJson('/api/auth/register', b),
    onSuccess: () => {
      toast({ title: 'Account created', description: 'Your studio is ready.' })
      setTimeout(() => window.location.reload(), 350)
    },
    onError: (err: Error) =>
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' }),
  })

  // "Continue as demo" — auto-creates the demo user. If they already exist
  // (409 conflict), fall back to login with the same creds.
  const demoMut = useMutation({
    mutationFn: async () => {
      const creds = {
        name: 'Demo User',
        email: 'demo@virtulab.local',
        password: 'demodemo',
      }
      try {
        return await postJson('/api/auth/register', creds)
      } catch (err) {
        const e = err as Error & { status?: number }
        if (e?.status === 409) {
          return postJson('/api/auth/login', {
            email: creds.email,
            password: creds.password,
          })
        }
        throw err
      }
    },
    onSuccess: () => {
      toast({ title: 'Demo session ready', description: 'Opening the studio…' })
      setTimeout(() => window.location.reload(), 350)
    },
    onError: (err: Error) =>
      toast({ title: 'Demo failed', description: err.message, variant: 'destructive' }),
  })

  function submitLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail.trim() || !loginPassword) return
    loginMut.mutate({ email: loginEmail.trim(), password: loginPassword })
  }

  function submitRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!regName.trim() || !regEmail.trim() || regPassword.length < 6) return
    registerMut.mutate({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
    })
  }

  const anyPending =
    loginMut.isPending || registerMut.isPending || demoMut.isPending

  return (
    <div className="organic-bg min-h-screen flex flex-col">
      {/* Compact header — back to site */}
      <header className="px-4 sm:px-6 py-4">
        <button
          type="button"
          onClick={() => setView({ name: 'landing' })}
          className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back to site
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Brand header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="size-14 rounded-2xl bg-forest text-primary-foreground flex items-center justify-center shadow-sm">
              <Sprout className="size-7" />
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Welcome
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs text-balance">
              Sign in to your studio — or plant a new account. Organic tools, no ad spend, ever.
            </p>
          </div>

          <Card className="bg-card/95 backdrop-blur-sm border-border/70 shadow-md">
            <CardHeader className="pb-0">
              <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
                <TabsList className="grid w-full grid-cols-2 bg-muted/60">
                  <TabsTrigger value="login" className="data-[state=active]:bg-forest data-[state=active]:text-primary-foreground">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-forest data-[state=active]:text-primary-foreground">
                    Create account
                  </TabsTrigger>
                </TabsList>

                {/* Sign in */}
                <TabsContent value="login" className="mt-6">
                  <form onSubmit={submitLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@studio.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={anyPending}
                      className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
                    >
                      {loginMut.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Leaf className="size-4" />
                      )}
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                {/* Register */}
                <TabsContent value="register" className="mt-6">
                  <form onSubmit={submitRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-name">Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-name"
                          type="text"
                          autoComplete="name"
                          required
                          minLength={2}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Your name"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@studio.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="reg-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="pl-9"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground/80 pl-1">
                        Min 6 characters. We never share your details.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={anyPending}
                      className="w-full bg-forest text-primary-foreground hover:bg-forest/90"
                    >
                      {registerMut.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sprout className="size-4" />
                      )}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              {/* Continue as demo */}
              <Button
                type="button"
                variant="outline"
                disabled={anyPending}
                onClick={() => demoMut.mutate()}
                className="w-full mt-4 border-forest/30 text-forest hover:bg-forest/10"
              >
                {demoMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Continue as demo
              </Button>

              <p className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
                No password to remember. The demo account is sandbox-only — your data stays in this browser session.
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            VirtuaLab Digital · Organic & homegrown · No paid ads, ever
          </p>
        </motion.div>
      </main>
    </div>
  )
}
