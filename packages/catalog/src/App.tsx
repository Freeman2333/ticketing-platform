// Exposed by the federation plugin as 'catalog/App'.
// Consumers render it lazily via `lazyProvider('catalog', 'App')`.
export function App() {
  return (
    <section data-testid="catalog">
      <h1>Hello from catalog</h1>
    </section>
  );
}

export default App;
