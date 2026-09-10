'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

interface MermaidDiagramProps {
  chart: string;
}

let initialized = false;

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Mermaid only runs in browser environment
    if (typeof window === 'undefined') return;

    let isMounted = true;
    const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

    async function renderDiagram() {
      try {
        setHasError(false);
        const mermaid = (await import('mermaid')).default;

        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            darkMode: true,
            fontFamily: 'inherit',
          });
          initialized = true;
        }

        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart.trim());
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Mermaid rendering failed, displaying fallback code block:', err);
          setHasError(true);
          setErrorMessage(err?.message || 'Format diagram tidak valid');
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (hasError) {
    return (
      <div className="my-3">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-t-lg">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Diagram visual tidak dapat ditampilkan ({errorMessage}). Menampilkan kode sumber diagram:</span>
        </div>
        <CodeBlock language="mermaid" value={chart} />
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-3 p-4 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-400">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent mr-2"></div>
        Membuat visual diagram...
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto flex justify-center shadow-sm">
      <div
        ref={containerRef}
        className="mermaid-svg-container max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};
