import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { setAccessToken } from '@ticketing/auth-client';
import {
  AuthControllerLoginBody,
  useAuthControllerLogin,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@ticketing/ui';

type LoginFormValues = z.infer<typeof AuthControllerLoginBody>;

export function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(AuthControllerLoginBody),
  });
  const loginMutation = useAuthControllerLogin();

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await loginMutation.mutateAsync({ data: values });
      setAccessToken(response.accessToken);
      navigate('/');
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
