import type { Control } from 'react-hook-form';
import type { SeatTypeWithCountsDto } from '@ticketing/api-client';
import { FormControl, FormField, FormItem, FormMessage, Input } from '@ticketing/ui';
import type { EditEventFormValues } from '../EditEventPage';

export function ExistingSeatTypeFields({
  control,
  seatTypes,
}: {
  control: Control<EditEventFormValues>;
  seatTypes: SeatTypeWithCountsDto[];
}) {
  if (seatTypes.length === 0) {
    return <p className="text-muted-foreground text-sm">No ticket types yet.</p>;
  }

  return (
    <div className="grid gap-2">
      {seatTypes.map((seatType, index) => (
        <div
          key={seatType.id}
          className="grid grid-cols-[1fr_110px] items-center gap-2 rounded-md border p-3"
        >
          <div>
            <p className="font-medium">{seatType.label}</p>
            <p className="text-muted-foreground text-sm">
              {seatType.availableCount} available, {seatType.heldCount} held,{' '}
              {seatType.bookedCount} booked
            </p>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">$</span>
            <FormField
              control={control}
              name={`existingSeatTypes.${index}.price`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
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
          </div>
        </div>
      ))}
    </div>
  );
}
