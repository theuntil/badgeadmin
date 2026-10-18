'use client';

import { useActionState } from 'react';
import { signIn, type LoginState } from '@/actions/auth';

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-medium">E-posta</label>
        <input id="email" key={state?.email ?? 'e'} className="input" type="email" name="email" autoComplete="username"
          required autoFocus={!state?.email} defaultValue={state?.email ?? ''} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-medium">Şifre</label>
        <input id="password" className="input" type="password" name="password" autoComplete="current-password"
          required autoFocus={!!state?.email} aria-describedby={state?.error ? 'login-error' : undefined} />
      </div>
      {state?.error ? <p id="login-error" role="alert" className="text-red text-[13px]">{state.error}</p> : null}
      <button className="btn btn-primary h-10 mt-1" disabled={pending}>{pending ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
    </form>
  );
}
