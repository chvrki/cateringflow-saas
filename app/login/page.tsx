'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChefHat, Loader2, Mail, Lock, LogIn, Chrome } from 'lucide-react'

import { createBrowserClient } from '@/lib/supabase/browser'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Introduce un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, startGoogleTransition] = useTransition()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const redirectTo =
    searchParams.get('redirectTo') && searchParams.get('redirectTo') !== '/'
      ? searchParams.get('redirectTo')!
      : '/dashboard'

  // Manejo de errores pasados vía query params (por ejemplo, OAuth).
  useEffect(() => {
    const error = searchParams.get('error')
    const message = searchParams.get('message')

    if (error === 'oauth-failed' && message) {
      toast.error('Error en Google OAuth', {
        description: message,
      })
    } else if (error === 'missing-code') {
      toast.error('Error en callback', {
        description: 'Código de autorización faltante',
      })
    }
  }, [searchParams])

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true)
    const supabase = createBrowserClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast.error('No se pudo iniciar sesión', {
        description: error.message,
      })
      setIsSubmitting(false)
      return
    }

    toast.success('Sesión iniciada correctamente')
    router.push(redirectTo)
    router.refresh()
  }

  const handleGoogleLogin = () => {
    startGoogleTransition(async () => {
      const supabase = createBrowserClient()
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''

      const callbackUrl = `${origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (error) {
        toast.error('No se pudo iniciar sesión con Google', {
          description: error.message,
        })
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-[#0F766E]" />
            <span className="text-2xl font-bold text-[#111827]">
              Caterix
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <LogIn className="h-5 w-5 text-[#0F766E]" />
              Iniciar sesión
            </CardTitle>
            <CardDescription>
              Accede a tu panel para gestionar menús, eventos y reservas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                          <Input
                            type="email"
                            placeholder="tu@catering.com"
                            autoComplete="email"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                          <Input
                            type="password"
                            autoComplete="current-password"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-[#0F766E] hover:bg-[#115E59] text-white"
                  disabled={isSubmitting || isGoogleLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Accediendo...
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </Button>
              </form>
            </Form>

            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span>o continúa con</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Conectando con Google...
                </>
              ) : (
                <>
                  <Chrome className="h-4 w-4 mr-2" />
                  Iniciar sesión con Google
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-[#6B7280]">
            <p>
              ¿No tienes cuenta?{' '}
              <Link
                href="/signup"
                className="text-[#0F766E] hover:underline font-medium"
              >
                Crea tu cuenta gratis
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

