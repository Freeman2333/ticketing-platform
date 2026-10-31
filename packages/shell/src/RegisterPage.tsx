import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { setAccessToken } from '@ticketing/auth-client';
import {
  AuthRegisterBody,
  useAuthRegister,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormSelectField,
  FormTextField,
} from '@ticketing/ui';

type RegisterFormValues = z.infer<typeof AuthRegisterBody>;

export function RegisterPage() {
  const navigate = useNavigate();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(AuthRegisterBody),
  });
  const registerMutation = useAuthRegister();

  async function onSubmit(values: RegisterFormValues) {
    try {
      const response = await registerMutation.mutateAsync({ data: values });
      setAccessToken(response.accessToken);
      navigate('/');
    } catch {
      form.setError('root.serverError', {
        message: 'Could not register. Email may already be in use.',
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
                <CardTitle className="text-xl">Create an account</CardTitle>
                <CardDescription>
                  Enter your details below to get started
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

                  <FormSelectField
                    control={form.control}
                    name="role"
                    label="I am a..."
                    placeholder="Select a role"
                    options={[
                      { value: 'attendee', label: 'Attendee' },
                      { value: 'organizer', label: 'Organizer' },
                    ]}
                  />

                  {form.formState.errors.root?.serverError && (
                    <p className="text-destructive text-sm">
                      {form.formState.errors.root.serverError.message}
                    </p>
                  )}

                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    Register
                  </Button>

                  <div className="text-center text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      Log in
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
