import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VenuesCreateBody } from '@ticketing/api-client';
import {
  Button,
  Form,
  FormSwitchField,
  FormTextField,
  Spinner,
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

              <FormTextField control={form.control} name="name" label="Name" />

              <FormTextField
                control={form.control}
                name="address"
                label="Address"
              />

              <FormSwitchField
                control={form.control}
                name="isShared"
                label="Shared venue"
                description="Allow other organizers to book this venue (subject to your approval)."
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
