import { Route, Routes } from 'react-router-dom';
import { EventDetailsPage } from './events/EventDetailsPage';
import { EventList } from './events/EventList';
import './styles.css';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<EventList />} />
      <Route path="/:eventId" element={<EventDetailsPage />} />
    </Routes>
  );
}

export default App;
