import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VenuesCreateBody } from '@ticketing/api-client';
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Spinner,
  Switch,
} from '@ticketing/ui';
import { VenuePreviewCard } from './components/VenuePreviewCard';
import { useCreateVenue } from './hooks/useCreateVenue';

type CreateVenueFormValues = z.infer<typeof VenuesCreateBody>;

export function CreateVenuePage() {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<CreateVenueFormValues>({
    resolver: zodResolver(VenuesCreateBody),
  });
  const { createVenue } = useCreateVenue();

  async function onSubmit(values: CreateVenueFormValues) {
    try {
      await createVenue(values, file);
    } catch {
      form.setError('root.serverError', {
        message: 'Could not create venue.',
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
            <div className="lg:sticky lg:top-6 lg:self-start">
              <VenuePreviewCard
                file={file}
                onFileChange={setFile}
                name={form.watch('name') ?? ''}
                address={form.watch('address') ?? ''}
                isShared={form.watch('isShared') ?? false}
              />
            </div>

            <div className="grid gap-6">
              <h1 className="text-xl font-semibold">Create venue</h1>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isShared"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel>Shared venue</FormLabel>
                      <FormDescription>
                        Allow other organizers to book this venue (subject to
                        your approval).
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.formState.errors.root?.serverError && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.root.serverError.message}
                </p>
              )}

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Create
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
