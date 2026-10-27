import { Route, Routes } from 'react-router-dom';
import { OrganizerHeader } from './OrganizerHeader';
import { VenuesPage } from './venues/VenuesPage';
import './styles.css';

function OrganizerHomePage() {
  return <h1 className="text-2xl font-semibold">Organizer Dashboard</h1>;
}

export function App() {
  return (
    <div className="flex h-full flex-col">
      <OrganizerHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<OrganizerHomePage />} />
          <Route path="/venues" element={<VenuesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
