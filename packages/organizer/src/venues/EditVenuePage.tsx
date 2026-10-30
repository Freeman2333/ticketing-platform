import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getVenuesFindMineQueryKey,
  getVenuesFindOneQueryKey,
  useVenuesFindOneSuspense,
  useVenuesUpdate,
  useVenuesUploadImage,
  VenuesUpdateBody,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ImageDropzone } from '../components/ImageDropzone';

type EditVenueFormValues = z.infer<typeof VenuesUpdateBody>;

function EditVenueFormSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

function EditVenueContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const updateMutation = useVenuesUpdate();
  const uploadMutation = useVenuesUploadImage();

  async function onSubmit(values: EditVenueFormValues) {
    try {
      await updateMutation.mutateAsync({ id, data: values });
      if (file) {
        await uploadMutation.mutateAsync({ id, data: { file } });
      }
      queryClient.invalidateQueries({
        queryKey: getVenuesFindMineQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getVenuesFindOneQueryKey(id),
      });
      navigate(`/organizer/venues/${id}`);
    } catch {
      form.setError('root.serverError', {
        message: 'Could not update venue.',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Edit venue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="grid gap-6">
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
                          Allow other organizers to book this venue (subject
                          to your approval).
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

              <FormItem>
                <FormLabel>Photo</FormLabel>
                <FormControl>
                  <ImageDropzone
                    file={file}
                    onFileChange={setFile}
                    initialImageUrl={venue.imageUrl}
                  />
                </FormControl>
              </FormItem>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

export function EditVenuePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ErrorBoundary fallback={<p>Failed to load venue.</p>}>
        <Suspense fallback={<EditVenueFormSkeleton />}>
          <EditVenueContent id={id!} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
