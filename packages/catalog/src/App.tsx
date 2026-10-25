import { Route, Routes } from 'react-router-dom';
import { EventDetailsPage } from './events/EventDetailsPage';
import { EventListPage } from './events/EventListPage';
import { OrderPage } from './orders/OrderPage';
import './styles.css';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<EventListPage />} />
      <Route path="/orders/:orderId" element={<OrderPage />} />
      <Route path="/:eventId" element={<EventDetailsPage />} />
    </Routes>
  );
}

export default App;
