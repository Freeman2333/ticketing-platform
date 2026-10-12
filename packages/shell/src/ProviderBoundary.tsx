import { Component, Suspense, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  name: string;
  fallback: ReactNode;
}

export class ProviderBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          <p>
            Provider &quot;{this.props.name}&quot; unavailable:{' '}
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return (
      <Suspense fallback={this.props.fallback}>{this.props.children}</Suspense>
    );
  }
}
