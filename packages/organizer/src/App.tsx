import { Route, Routes } from 'react-router-dom';
import { OrganizerHeader } from './OrganizerHeader';
import { CreateEventPage } from './events/CreateEventPage';
import { EventDetailsPage } from './events/EventDetailsPage';
import { OrganizerEventsPage } from './events/OrganizerEventsPage';
import { CreateVenuePage } from './venues/CreateVenuePage';
import { EditVenuePage } from './venues/EditVenuePage';
import { VenueDetailsPage } from './venues/VenueDetailsPage';
import { VenuesPage } from './venues/VenuesPage';
import './styles.css';

export function App() {
  return (
    <div className="flex h-full flex-col">
      <OrganizerHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<OrganizerEventsPage />} />
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/venues/new" element={<CreateVenuePage />} />
          <Route path="/venues/:id" element={<VenueDetailsPage />} />
          <Route path="/venues/:id/edit" element={<EditVenuePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
