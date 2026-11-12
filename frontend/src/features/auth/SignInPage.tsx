import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Brand } from '@/components/layout/Brand';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/lib/api';

import { useSignIn } from './hooks';

const credentialsSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username.').max(100),
  // Not trimmed: a password may legitimately begin or end with a space.
  password: z.string().min(1, 'Enter your password.').max(200),
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

/** The sign-in screen. On success the route guard moves the user on. */
export default function SignInPage() {
  useDocumentTitle('Sign in');
  const signIn = useSignIn();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: '', password: '' },
  });

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-muted-foreground text-sm">Last-mile condom distribution</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 sm:p-6">
          <form
            noValidate
            onSubmit={handleSubmit((credentials) => {
              signIn.mutate(credentials);
            })}
          >
            <FieldGroup>
              {signIn.isError ? (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden="true" />
                  <AlertTitle>Could not sign in</AlertTitle>
                  <AlertDescription>{getErrorMessage(signIn.error)}</AlertDescription>
                </Alert>
              ) : null}

              <Field data-invalid={errors.username ? true : undefined}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={errors.username ? true : undefined}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  {...register('username')}
                />
                <FieldError id="username-error" errors={[errors.username]} />
              </Field>

              <Field data-invalid={errors.password ? true : undefined}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pr-10"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={isPasswordVisible}
                    onClick={() => {
                      setIsPasswordVisible((visible) => !visible);
                    }}
                  >
                    {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </Button>
                </div>
                <FieldError id="password-error" errors={[errors.password]} />
              </Field>

              <Button type="submit" disabled={signIn.isPending} className="w-full">
                {signIn.isPending ? <Spinner data-icon="inline-start" /> : null}
                {signIn.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </FieldGroup>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-sm text-pretty">
          Forgotten your password? An administrator can set a new one for you in User management.
        </p>
      </div>
    </main>
  );
}
