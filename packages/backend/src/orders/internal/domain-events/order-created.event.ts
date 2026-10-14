export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly eventId: string,
    public readonly seatIds: string[],
  ) {}
}
