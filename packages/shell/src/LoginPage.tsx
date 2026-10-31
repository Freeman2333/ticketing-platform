import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { setAccessToken } from '@ticketing/auth-client';
import { getSafeRedirect } from './lib/safe-redirect';
import {
  AuthLoginBody,
  useAuthLogin,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormTextField,
} from '@ticketing/ui';

type LoginFormValues = z.infer<typeof AuthLoginBody>;

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(AuthLoginBody),
  });
  const loginMutation = useAuthLogin();

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      setAccessToken(response.accessToken);
      navigate(redirectTo);
    } catch {
      form.setError('root.serverError', {
        message: 'Invalid email or password',
      });
    }
  }

  return (
    <main className="bg-muted flex flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>
                  Enter your email below to log in to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <FormTextField
                    control={form.control}
                    name="email"
                    label="Email"
                    type="email"
                  />

                  <FormTextField
                    control={form.control}
                    name="password"
                    label="Password"
                    type="password"
                  />

                  {form.formState.errors.root?.serverError && (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.root.serverError.message}
                    </p>
                  )}

                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Log in
                  </Button>

                  <div className="text-center text-sm">
                    Don&apos;t have an account?{' '}
                    <Link to="/register" className="underline underline-offset-4">
                      Register
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </main>
  );
}
