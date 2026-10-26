import { Route, Routes } from 'react-router-dom';
import './styles.css';

function OrganizerHomePage() {
  return <h1 className="text-2xl font-semibold">Organizer Dashboard</h1>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<OrganizerHomePage />} />
    </Routes>
  );
}

export default App;
