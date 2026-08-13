import { useState } from 'react'
import type { FormEvent } from 'react'
import { Cloud, ShieldCheck } from 'lucide-react'
import { Button, TextField } from '../components'

export interface SignInPageProps {
  busy: boolean
  error: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

export function SignInPage({ busy, error, onSignIn, onSignUp }: SignInPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mode === 'sign-in') {
      await onSignIn(email, password)
      return
    }
    await onSignUp(email, password)
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-card" aria-labelledby="sign-in-title">
        <div className="sign-in-card__mark" aria-hidden="true">MA</div>
        <p className="page__eyebrow">MYWORK AZZURO</p>
        <h1 id="sign-in-title">Your operations workspace, wherever you sign in.</h1>
        <p className="sign-in-card__intro">
          Sign in to open your private cloud workspace. Your saved website passwords remain in Windows Credential Manager on this device.
        </p>

        <form className="sign-in-form" onSubmit={submit}>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
          {error ? <p className="sign-in-form__error" role="alert">{error}</p> : null}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={busy}
            leadingIcon={Cloud}
          >
            {mode === 'sign-in' ? 'Open workspace' : 'Create private workspace'}
          </Button>
        </form>

        <button
          type="button"
          className="sign-in-card__switch"
          disabled={busy}
          onClick={() => setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in')}
        >
          {mode === 'sign-in'
            ? 'New to MYWORK AZZURO? Create your private account'
            : 'Already have an account? Sign in instead'}
        </button>

        <div className="sign-in-card__security">
          <ShieldCheck aria-hidden="true" />
          <span>Private Supabase account · Postgres cloud workspace · Desktop app</span>
        </div>
      </section>
    </main>
  )
}
