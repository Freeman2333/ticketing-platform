import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'react-router-dom';
import {
  useVenuesFindOneSuspense,
  VenuesUpdateBody,
} from '@ticketing/api-client';
import {
  Button,
  ErrorBoundary,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  Spinner,
  Switch,
} from '@ticketing/ui';
import { VenuePreviewCard } from './components/VenuePreviewCard';
import { useUpdateVenue } from './hooks/useUpdateVenue';

type EditVenueFormValues = z.infer<typeof VenuesUpdateBody>;

function EditVenueFormSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

function EditVenueContent({ id }: { id: string }) {
  const { data: venue } = useVenuesFindOneSuspense(id);
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<EditVenueFormValues>({
    resolver: zodResolver(VenuesUpdateBody),
    defaultValues: {
      name: venue.name,
      address: venue.address,
      isShared: venue.isShared,
    },
  });
  const { updateVenue } = useUpdateVenue(id);

  async function onSubmit(values: EditVenueFormValues) {
    try {
      await updateVenue(values, file);
    } catch {
      form.setError('root.serverError', {
        message: 'Could not update venue.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <VenuePreviewCard
              file={file}
              onFileChange={setFile}
              initialImageUrl={venue.imageUrl}
              name={form.watch('name') ?? ''}
              address={form.watch('address') ?? ''}
              isShared={form.watch('isShared') ?? false}
            />
          </div>

          <div className="grid gap-6">
            <h1 className="text-xl font-semibold">Edit venue</h1>

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
              Save
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export function EditVenuePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ErrorBoundary fallback={<p>Failed to load venue.</p>}>
        <Suspense fallback={<EditVenueFormSkeleton />}>
          <EditVenueContent id={id!} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
