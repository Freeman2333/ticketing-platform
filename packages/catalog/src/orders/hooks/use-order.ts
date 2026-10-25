import {
  OrderDtoStatus,
  useOrdersControllerGetOrder,
} from '@ticketing/api-client';
import { useIsReturningFromCheckout } from './use-is-returning-from-checkout';

export function useOrder(orderId: string) {
  const isReturningFromCheckout = useIsReturningFromCheckout();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useOrdersControllerGetOrder(orderId, {
    query: {
      refetchInterval: (query) => {
        const current = query.state.data;
        const awaitingPayment =
          isReturningFromCheckout &&
          current?.status === OrderDtoStatus.reserved;
        const awaitingTickets =
          current?.status === OrderDtoStatus.paid && !current.ticketsPdfUrl;
        return awaitingPayment || awaitingTickets ? 1500 : false;
      },
    },
  });

  const isReserved = order?.status === OrderDtoStatus.reserved;
  const isAwaitingPayment = isReturningFromCheckout && isReserved;
  const isAwaitingTickets =
    order?.status === OrderDtoStatus.paid && !order.ticketsPdfUrl;
  const isPaidOrIssued =
    order?.status === OrderDtoStatus.paid ||
    order?.status === OrderDtoStatus.issued;

  return {
    order,
    isLoading,
    isError,
    refetch,
    isReserved,
    isAwaitingPayment,
    isAwaitingTickets,
    isPaidOrIssued,
  };
}
