import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getVenuesFindMineQueryKey,
  useVenuesCreate,
  useVenuesUploadImage,
  VenuesCreateBody,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ImageDropzone } from '../components/ImageDropzone';

type CreateVenueFormValues = z.infer<typeof VenuesCreateBody>;

export function CreateVenuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<CreateVenueFormValues>({
    resolver: zodResolver(VenuesCreateBody),
  });
  const createMutation = useVenuesCreate();
  const uploadMutation = useVenuesUploadImage();

  async function onSubmit(values: CreateVenueFormValues) {
    try {
      const venue = await createMutation.mutateAsync({ data: values });
      if (file) {
        await uploadMutation.mutateAsync({ id: venue.id, data: { file } });
      }
      queryClient.invalidateQueries({
        queryKey: getVenuesFindMineQueryKey(),
      });
      navigate('/organizer/venues');
    } catch {
      form.setError('root.serverError', {
        message: 'Could not create venue.',
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Create venue</CardTitle>
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
                            Allow other organizers to book this venue
                            (subject to your approval).
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

                <FormItem>
                  <FormLabel>Photo (optional)</FormLabel>
                  <FormControl>
                    <ImageDropzone file={file} onFileChange={setFile} />
                  </FormControl>
                </FormItem>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
