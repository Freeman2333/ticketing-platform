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
  FormItem,
  FormLabel,
  FormSelectField,
  FormTextField,
  Skeleton,
  Spinner,
} from '@ticketing/ui';
import { EventPreviewCard } from './components/EventPreviewCard';
import { TicketTypeFields } from './components/TicketTypeFields';
import { useCreateEvent } from './hooks/useCreateEvent';
import { useVenueBusyRanges } from './hooks/useVenueBusyRanges';

const createEventFormSchema = z.object({
  venueId: z.string().min(1, 'Venue is required'),
  title: z.string().min(1, 'Title is required'),
  startsAt: z.date({ message: 'Start is required' }),
  endsAt: z.date({ message: 'End is required' }),
  seatTypes: z
    .array(
      z.object({
        label: z.string().min(1, 'Label is required'),
        price: z.number().min(1, 'Price must be 1 or more'),
        count: z.number().int().min(1, 'Quantity must be at least 1'),
      }),
    )
    .min(1, 'Add at least one ticket type'),
});

export type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

function CreateEventFormSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

function CreateEventContent() {
  const { data: venues } = useVenuesFindMineSuspense();

  const [file, setFile] = useState<File | null>(null);
  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      seatTypes: [{ label: 'General Admission', price: 0, count: 1 }],
    },
  });

  const { createEvent } = useCreateEvent();

  async function onSubmit(values: CreateEventFormValues) {
    try {
      await createEvent(values, values.seatTypes, file);
    } catch {
      form.setError('root.serverError', {
        message: 'Could not create event.',
      });
    }
  }

  const watchedVenueId = form.watch('venueId');
  const venueName = venues.find((venue) => venue.id === watchedVenueId)?.name;

  const disabledRanges = useVenueBusyRanges(watchedVenueId);

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

            <FormSelectField
              control={form.control}
              name="venueId"
              label="Venue"
              placeholder="Select a venue"
              options={venues.map((venue) => ({
                value: venue.id,
                label: venue.name,
              }))}
            />

            <FormTextField control={form.control} name="title" label="Title" />

            <FormItem>
              <FormLabel>Date &amp; time</FormLabel>
              <FormControl>
                <EventTimeRangePicker
                  startsAt={form.watch('startsAt')}
                  endsAt={form.watch('endsAt')}
                  disabledRanges={disabledRanges}
                  onStartsAtChange={(date) =>
                    form.setValue('startsAt', date as Date, {
                      shouldValidate: Boolean(date),
                    })
                  }
                  onEndsAtChange={(date) =>
                    form.setValue('endsAt', date as Date, {
                      shouldValidate: Boolean(date),
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

            <div className="grid gap-3">
              <TicketTypeFields control={form.control} name="seatTypes" />
            </div>

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
