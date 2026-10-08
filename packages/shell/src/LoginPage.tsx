import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { httpClient, setAccessToken } from '@ticketing/auth-client';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@ticketing/ui';

// TODO(Step 1 Auth Part E): replace with the Zod schema Orval generates
// from the backend's OpenAPI spec once libs/api-client exists - this
// duplicates LoginDto's class-validator rules by hand for now.
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // TODO(Step 1 Auth Part E): replace with the useMutation hook Orval
  // generates for POST /auth/login once libs/api-client exists.
  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await httpClient.post<{ accessToken: string }>(
        '/auth/login',
        values,
      );
      setAccessToken(response.data.accessToken);
      navigate('/');
    } catch {
      form.setError('root.serverError', {
        message: 'Invalid email or password',
      });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold">Log in</h1>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.serverError && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.serverError.message}
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            Log in
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="underline">
              Register
            </Link>
          </p>
        </form>
      </Form>
    </main>
  );
}
