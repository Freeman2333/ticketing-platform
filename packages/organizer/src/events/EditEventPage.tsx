import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'react-router-dom';
import {
  useEventsGetEventSuspense,
  useEventsListSeatTypesSuspense,
  useVenuesFindOneSuspense,
} from '@ticketing/api-client';
import {
  Button,
  ErrorBoundary,
  EventTimeRangePicker,
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormTextField,
  Skeleton,
  Spinner,
} from '@ticketing/ui';
import { EventPreviewCard } from './components/EventPreviewCard';
import { ExistingSeatTypeFields } from './components/ExistingSeatTypeFields';
import { TicketTypeFields } from './components/TicketTypeFields';
import { useUpdateEvent } from './hooks/useUpdateEvent';
import { useVenueBusyRanges } from './hooks/useVenueBusyRanges';

const editEventFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startsAt: z.date({ message: 'Start is required' }),
  endsAt: z.date({ message: 'End is required' }),
  existingSeatTypes: z.array(
    z.object({
      seatTypeId: z.string(),
      price: z.number().min(1, 'Price must be 1 or more'),
    }),
  ),
  newSeatTypes: z.array(
    z.object({
      label: z.string().min(1, 'Label is required'),
      price: z.number().min(1, 'Price must be 1 or more'),
      count: z.number().int().min(1, 'Quantity must be at least 1'),
    }),
  ),
});

export type EditEventFormValues = z.infer<typeof editEventFormSchema>;

function EditEventFormSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

function EditEventContent({ id }: { id: string }) {
  const { data: event } = useEventsGetEventSuspense(id);
  const { data: venue } = useVenuesFindOneSuspense(event.venueId);
  const { data: seatTypes } = useEventsListSeatTypesSuspense(id);
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventFormSchema),
    defaultValues: {
      title: event.title,
      startsAt: new Date(event.startsAt),
      endsAt: new Date(event.endsAt),
      existingSeatTypes: seatTypes.map((seatType) => ({
        seatTypeId: seatType.id,
        price: seatType.price,
      })),
      newSeatTypes: [],
    },
  });
  const { updateEvent } = useUpdateEvent(id);

  const hasSoldTickets = seatTypes.some(
    (seatType) => seatType.bookedCount > 0,
  );

  const disabledRanges = useVenueBusyRanges(event.venueId, id);

  async function onSubmit(values: EditEventFormValues) {
    try {
      await updateEvent(
        {
          title: values.title,
          startsAt: hasSoldTickets ? undefined : values.startsAt,
          endsAt: hasSoldTickets ? undefined : values.endsAt,
        },
        values.existingSeatTypes,
        seatTypes,
        values.newSeatTypes,
        file,
      );
    } catch {
      form.setError('root.serverError', {
        message: 'Could not update event.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <EventPreviewCard
              file={file}
              onFileChange={setFile}
              initialImageUrl={event.posterUrl}
              title={form.watch('title')}
              venueName={venue.name}
              startsAt={form.watch('startsAt')}
            />
          </div>

          <div className="grid gap-6">
            <h1 className="text-xl font-semibold">Edit event</h1>

            <FormTextField control={form.control} name="title" label="Title" />

            <FormItem>
              <FormLabel>Date &amp; time</FormLabel>
              <FormControl>
                <EventTimeRangePicker
                  startsAt={form.watch('startsAt')}
                  endsAt={form.watch('endsAt')}
                  disabled={hasSoldTickets}
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
              {hasSoldTickets && (
                <p className="text-muted-foreground text-sm">
                  This event already has sold tickets, so the date and time
                  can&apos;t be changed.
                </p>
              )}
              {(form.formState.errors.startsAt ||
                form.formState.errors.endsAt) && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.startsAt?.message ??
                    form.formState.errors.endsAt?.message}
                </p>
              )}
            </FormItem>

            <div className="grid gap-3">
              <FormLabel>Ticket types</FormLabel>
              <ExistingSeatTypeFields
                control={form.control}
                seatTypes={seatTypes}
              />
            </div>

            <div className="grid gap-3">
              <TicketTypeFields
                control={form.control}
                name="newSeatTypes"
                minItems={0}
              />
            </div>

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

export function EditEventPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ErrorBoundary fallback={<p>Failed to load event.</p>}>
        <Suspense fallback={<EditEventFormSkeleton />}>
          <EditEventContent id={id!} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
