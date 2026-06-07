'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChefHat, Loader2, Mail, Lock, UserPlus, Chrome, User } from 'lucide-react'

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

const signupSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nombre demasiado corto')
    .max(80, 'Nombre demasiado largo')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Introduce un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

type SignupValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, startGoogleTransition] = useTransition()

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: SignupValues) => {
    setIsSubmitting(true)
    const supabase = createBrowserClient()

    const fullName =
      values.full_name && values.full_name.trim().length > 0
        ? values.full_name.trim()
        : null

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    })

    if (error) {
      toast.error('No se pudo crear la cuenta', {
        description: error.message,
      })
      setIsSubmitting(false)
      return
    }

    if (data.session) {
      toast.success('Cuenta creada, bienvenido a Caterix')
      router.push('/dashboard')
      router.refresh()
    } else {
      toast.success(
        'Cuenta creada, revisa tu email para confirmar tu cuenta.'
      )
      router.push('/login')
    }
  }

  const handleGoogleSignup = () => {
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
        toast.error('No se pudo continuar con Google', {
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
            <ChefHat className="h-8 w-8 text-[#0F766E]" strokeWidth={1.5} />
            <span className="text-2xl font-semibold text-[#111827]">
              Caterix
            </span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <UserPlus className="h-5 w-5 text-[#0F766E]" strokeWidth={1.5} />
              Crear cuenta
            </CardTitle>
            <CardDescription>
              Empieza a gestionar menús, eventos y reservas de tu catering.
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
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tu nombre</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" strokeWidth={1.5} />
                          <Input
                            placeholder="María García"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" strokeWidth={1.5} />
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
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" strokeWidth={1.5} />
                          <Input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            autoComplete="new-password"
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
                      <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.5} />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear cuenta gratis'
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
              onClick={handleGoogleSignup}
              disabled={isSubmitting || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" strokeWidth={1.5} />
                  Conectando con Google...
                </>
              ) : (
                <>
                  <Chrome className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Continuar con Google
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-[#6B7280]">
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="text-[#0F766E] hover:underline font-medium"
              >
                Iniciar sesión
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

