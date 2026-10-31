import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useVenuesFindMineSuspense } from '@ticketing/api-client';
import {
  Button,
  ErrorBoundary,
  EventTimeRangePicker,
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
  Skeleton,
  Spinner,
} from '@ticketing/ui';
import { EventPreviewCard } from './components/EventPreviewCard';
import { useCreateEvent } from './hooks/useCreateEvent';

const createEventFormSchema = z.object({
  venueId: z.string().min(1, 'Venue is required'),
  title: z.string().min(1, 'Title is required'),
  startsAt: z.date({ message: 'Start is required' }),
  endsAt: z.date({ message: 'End is required' }),
});

type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

function CreateEventFormSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

function CreateEventContent() {
  const { data: venues } = useVenuesFindMineSuspense();

  const [file, setFile] = useState<File | null>(null);
  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
  });
  
  const { createEvent } = useCreateEvent();

  async function onSubmit(values: CreateEventFormValues) {
    try {
      await createEvent(values, file);
    } catch {
      form.setError('root.serverError', {
        message: 'Could not create event.',
      });
    }
  }

  const watchedVenueId = form.watch('venueId');
  const venueName = venues.find((venue) => venue.id === watchedVenueId)?.name;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <EventPreviewCard
              file={file}
              onFileChange={setFile}
              title={form.watch('title')}
              venueName={venueName}
              startsAt={form.watch('startsAt')}
            />
          </div>

          <div className="grid gap-6">
            <h1 className="text-xl font-semibold">Create event</h1>

            <FormField
              control={form.control}
              name="venueId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a venue" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Date &amp; time</FormLabel>
              <FormControl>
                <EventTimeRangePicker
                  startsAt={form.watch('startsAt')}
                  endsAt={form.watch('endsAt')}
                  onStartsAtChange={(date) =>
                    form.setValue('startsAt', date as Date, {
                      shouldValidate: true,
                    })
                  }
                  onEndsAtChange={(date) =>
                    form.setValue('endsAt', date as Date, {
                      shouldValidate: true,
                    })
                  }
                />
              </FormControl>
              {(form.formState.errors.startsAt ||
                form.formState.errors.endsAt) && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.startsAt?.message ??
                    form.formState.errors.endsAt?.message}
                </p>
              )}
            </FormItem>

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
  );
}

export function CreateEventPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <ErrorBoundary fallback={<p>Failed to load venues.</p>}>
        <Suspense fallback={<CreateEventFormSkeleton />}>
          <CreateEventContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
