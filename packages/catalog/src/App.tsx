import { Route, Routes } from 'react-router-dom';

function CatalogHome() {
  return (
    <section data-testid="catalog">
      <h1>Hello from catalog</h1>
    </section>
  );
}
export function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogHome />} />
    </Routes>
  );
}

export default App;
