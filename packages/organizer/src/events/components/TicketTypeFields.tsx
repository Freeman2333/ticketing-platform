import { useFieldArray, type Control } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
} from '@ticketing/ui';
import type { CreateEventFormValues } from '../CreateEventPage';

export function TicketTypeFields({
  control,
}: {
  control: Control<CreateEventFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'seatTypes',
  });

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[1fr_110px_90px_auto] gap-2 px-3">
        <span className="text-sm font-medium">Ticket type</span>
        <span className="text-sm font-medium">Price ($)</span>
        <span className="text-sm font-medium">Qty</span>
        <span />
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-[1fr_110px_90px_auto] items-start gap-2 rounded-md border p-3"
        >
          <FormField
            control={control}
            name={`seatTypes.${index}.label`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Label" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`seatTypes.${index}.price`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Price"
                    {...field}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`seatTypes.${index}.count`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Qty"
                    {...field}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={fields.length === 1}
            onClick={() => remove(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append({ label: '', price: 0, count: 1 })}
      >
        + Add ticket type
      </Button>
    </div>
  );
}
