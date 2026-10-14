import type { OrderItemDto } from '@ticketing/api-client';

export function OrderItemsList({ items }: { items: OrderItemDto[] }) {
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <>
      <ul className="mt-6 divide-y">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between py-2 text-sm">
            <span>Seat {item.seatLabel}</span>
            <span>${item.price}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-right font-medium">Total: ${totalPrice}</p>
    </>
  );
}
