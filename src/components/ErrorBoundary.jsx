import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Surface for dev. In production, wire to a real error sink.
    console.error("PlotForge error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>Something broke.</h2>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
