/**
 * Application-level error boundary (UI_UX_GUIDELINES §28).
 * Catches render errors and shows a recoverable message instead of a blank page.
 * Never exposes raw exceptions to users.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // ponytail: console for now; wire to a logging service in a later phase.
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-md bg-background px-md text-center"
      >
        <span className="material-symbols-outlined text-[48px] text-error" aria-hidden="true">
          error
        </span>
        <h1 className="text-xl font-semibold text-on-surface">Something went wrong</h1>
        <p className="max-w-md text-sm text-on-surface-variant">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="rounded-lg bg-primary px-md py-xs text-sm font-medium text-on-primary transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Try again
        </button>
      </div>
    )
  }
}
