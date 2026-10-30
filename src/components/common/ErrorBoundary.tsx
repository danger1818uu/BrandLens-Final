import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BrandLens ErrorBoundary caught an exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08090d] text-[#e8e7ee] flex items-center justify-center p-6 select-none relative overflow-hidden">
          {/* Subtle ambient lens rings */}
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-violet-500/10 pointer-events-none"
            style={{ filter: 'blur(40px)', background: 'radial-gradient(circle, rgba(166,139,255,0.08) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full border border-cyan-500/10 pointer-events-none"
            style={{ filter: 'blur(40px)', background: 'radial-gradient(circle, rgba(156,236,255,0.08) 0%, transparent 70%)' }}
          />

          <div className="relative max-w-xl w-full bg-[#0d0e17]/90 border border-violet-500/30 rounded-2xl p-8 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_45px_rgba(166,139,255,0.15)] backdrop-blur-2xl text-center space-y-6">
            {/* Shield Icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-300 shadow-[0_0_20px_rgba(166,139,255,0.25)]">
              <ShieldAlert size={32} />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono tracking-widest text-[#a68bff] uppercase">
                BRANDLENS SESSION SHIELD ACTIVE
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
                {this.props.fallbackTitle || 'Session Recovered Safely'}
              </h2>
              <p className="text-sm text-[#9e9aaf] leading-relaxed max-w-md mx-auto">
                An unexpected event was isolated to protect your data and prevent application crashes. Your tenant records and settings remain safe.
              </p>
            </div>

            {/* Error snippet if available */}
            {this.state.error && (
              <div className="text-left bg-black/60 border border-white/10 rounded-lg p-3 text-xs font-mono text-cyan-300/80 overflow-x-auto max-h-32">
                <div className="text-[10px] text-[#78768a] uppercase tracking-wider mb-1">Diagnosed event:</div>
                <div className="break-all">{this.state.error.message || String(this.state.error)}</div>
              </div>
            )}

            {/* Recovery actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-mono tracking-wider font-semibold rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw size={14} />
                <span>RELOAD VIEW</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/15 text-[#c3c0d0] hover:text-white text-xs font-mono tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Home size={14} />
                <span>RETURN TO HOME</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
