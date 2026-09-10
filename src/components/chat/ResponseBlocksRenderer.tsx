'use client';

import React, { useState } from 'react';
import { ResponseBlock } from '@/types';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { MermaidDiagram } from '../markdown/MermaidDiagram';
import { Sparkles, Lightbulb, PlayCircle, ImageOff, X } from 'lucide-react';

interface ResponseBlocksRendererProps {
  blocks: ResponseBlock[];
}

export const ResponseBlocksRenderer: React.FC<ResponseBlocksRendererProps> = ({ blocks }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-4 text-slate-100">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'markdown':
            return <MarkdownRenderer key={index} content={block.content} />;

          case 'illustration': {
            const hasVisual = Boolean(block.svgContent || block.imageUrl);

            return (
              <div key={index} className="my-4 max-w-xl mx-auto">
                {hasVisual && !block.failed ? (
                  <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl group transition-all hover:border-slate-600">
                    {block.svgContent ? (
                      <div
                        className="w-full bg-slate-950/80 p-3 sm:p-5 flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-80 [&>svg]:mx-auto"
                        dangerouslySetInnerHTML={{ __html: block.svgContent }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedImage(block.imageUrl!)}
                        className="block w-full text-left relative overflow-hidden bg-slate-950 p-2"
                      >
                        <img
                          src={block.imageUrl}
                          alt={block.alt || 'Ilustrasi Analogi'}
                          className="w-full h-auto max-h-80 object-contain mx-auto transition-transform group-hover:scale-105 duration-300 rounded-lg"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                          Klik untuk perbesar
                        </div>
                      </button>
                    )}

                    {block.caption && (
                      <div className="p-3 bg-slate-900/95 border-t border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="font-medium text-slate-200">{block.caption}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                    <ImageOff className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-slate-300">
                        {block.caption || block.alt || 'Visualisasi Analogi'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        (Konsep visual dijelaskan pada teks di bawah)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          case 'mermaid':
            return (
              <div key={index} className="my-3">
                <MermaidDiagram chart={block.code} />
                {block.caption && (
                  <div className="text-center text-xs text-slate-400 mt-1 italic">
                    {block.caption}
                  </div>
                )}
              </div>
            );

          case 'fun_fact':
            return (
              <div
                key={index}
                className="my-3 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-sm shadow-sm flex items-start gap-3"
              >
                <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-300 text-xs uppercase tracking-wider mb-1">
                    Fun Fact
                  </div>
                  <div className="text-slate-200 text-sm leading-relaxed">{block.content}</div>
                </div>
              </div>
            );

          case 'try_it':
            return (
              <div
                key={index}
                className="my-3 p-4 rounded-xl bg-blue-950/25 border border-blue-800/40 text-blue-200 text-sm shadow-sm"
              >
                <div className="flex items-center gap-2 font-semibold text-blue-300 text-xs uppercase tracking-wider mb-2.5">
                  <PlayCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{block.title || 'Coba Sendiri'}</span>
                </div>
                <ol className="space-y-2 text-slate-200 text-sm">
                  {block.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span className="flex-1 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );

          default:
            return null;
        }
      })}

      {/* Lightbox for illustration */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Ilustrasi"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
