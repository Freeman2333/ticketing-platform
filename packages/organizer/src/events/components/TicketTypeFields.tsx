import {
  useFieldArray,
  type Control,
  type FieldArray,
  type FieldArrayPath,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import {
  Button,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
} from '@ticketing/ui';

export function TicketTypeFields<TFieldValues extends FieldValues>({
  control,
  name,
  minItems = 1,
}: {
  control: Control<TFieldValues>;
  name: FieldArrayPath<TFieldValues>;
  minItems?: number;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
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
            name={`${name}.${index}.label` as Path<TFieldValues>}
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
            name={`${name}.${index}.price` as Path<TFieldValues>}
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
            name={`${name}.${index}.count` as Path<TFieldValues>}
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
            disabled={fields.length <= minItems}
            onClick={() => remove(index)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            label: '',
            price: 0,
            count: 1,
          } as FieldArray<TFieldValues, FieldArrayPath<TFieldValues>>)
        }
      >
        + Add ticket type
      </Button>
    </div>
  );
}
