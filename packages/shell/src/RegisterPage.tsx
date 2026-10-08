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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ticketing/ui';

// TODO(Step 1 Auth Part E): replace with the Zod schema Orval generates
// from the backend's OpenAPI spec once libs/api-client exists - this
// duplicates RegisterDto's class-validator rules by hand for now. Role is
// restricted to attendee/organizer here too - admin is never self-service.
const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(['attendee', 'organizer']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // TODO(Step 1 Auth Part E): replace with the useMutation hook Orval
  // generates for POST /auth/register once libs/api-client exists.
  async function onSubmit(values: RegisterFormValues) {
    try {
      const response = await httpClient.post<{ accessToken: string }>(
        '/auth/register',
        values,
      );
      setAccessToken(response.data.accessToken);
      navigate('/');
    } catch {
      form.setError('root.serverError', {
        message: 'Could not register. Email may already be in use.',
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
          <h1 className="text-lg font-semibold">Register</h1>

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

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a...</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="attendee">Attendee</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                  </SelectContent>
                </Select>
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
            Register
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="underline">
              Log in
            </Link>
          </p>
        </form>
      </Form>
    </main>
  );
}
