export class OrderReservationExpiredEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly eventId: string,
    public readonly eventTitle: string,
    public readonly seatLabels: string[],
  ) {}
}
