import type { OrderTicketDto } from '@ticketing/api-client';

export function TicketsList({ tickets }: { tickets: OrderTicketDto[] }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-4">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="rounded-lg border p-4 text-center">
          <img
            src={ticket.qrCodeUrl}
            alt={`QR code for seat ${ticket.seatLabel}`}
            className="mx-auto h-32 w-32"
          />
          <p className="mt-2 text-sm font-medium">Seat {ticket.seatLabel}</p>
        </li>
      ))}
    </ul>
  );
}
