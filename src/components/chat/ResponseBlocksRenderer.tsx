'use client';

import React, { useState } from 'react';
import { ResponseBlock } from '@/types';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { MermaidDiagram } from '../markdown/MermaidDiagram';
import { Sparkles, Lightbulb, PlayCircle, ImageOff, X, Image as ImageIcon } from 'lucide-react';

interface ResponseBlocksRendererProps {
  blocks: ResponseBlock[];
}

export const ResponseBlocksRenderer: React.FC<ResponseBlocksRendererProps> = ({ blocks }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-3.5 text-[#e9edef]">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'markdown':
            return <MarkdownRenderer key={index} content={block.content} />;

          case 'illustration': {
            const hasVisual = Boolean(block.svgContent || block.imageUrl);

            return (
              <div key={index} className="my-3 max-w-lg">
                {hasVisual && !block.failed ? (
                  <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl overflow-hidden shadow-lg group transition-all hover:border-[#00a884]">
                    {/* Media Header Badge */}
                    <div className="px-3 py-1.5 bg-[#182229] border-b border-[#222d34] flex items-center justify-between text-[11px] text-[#8696a0]">
                      <span className="flex items-center gap-1.5 font-medium text-[#25d366]">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Media Ilustrasi Analogi
                      </span>
                      <span>Vektor SVG</span>
                    </div>

                    {/* Media Body */}
                    {block.svgContent ? (
                      <div
                        className="w-full bg-[#0b141a] p-3 sm:p-4 flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-h-72 [&>svg]:mx-auto"
                        dangerouslySetInnerHTML={{ __html: block.svgContent }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedImage(block.imageUrl!)}
                        className="block w-full text-left relative overflow-hidden bg-[#0b141a] p-1.5"
                      >
                        <img
                          src={block.imageUrl}
                          alt={block.alt || 'Ilustrasi Analogi'}
                          className="w-full h-auto max-h-72 object-contain mx-auto transition-transform group-hover:scale-[1.02] duration-300 rounded-lg"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white">
                          Ketuk untuk perbesar
                        </div>
                      </button>
                    )}

                    {/* Media Caption Footer */}
                    {block.caption && (
                      <div className="p-2.5 bg-[#182229] border-t border-[#222d34] text-xs text-[#d1d7db] flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-[#25d366] flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{block.caption}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#111b21] border border-[#2a3942] text-xs text-[#8696a0] flex items-start gap-2.5">
                    <ImageOff className="w-4 h-4 text-[#8696a0] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-[#d1d7db]">
                        {block.caption || block.alt || 'Visualisasi Analogi'}
                      </div>
                      <div className="text-[11px] text-[#8696a0] mt-0.5">
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
              <div key={index} className="my-2.5">
                <MermaidDiagram chart={block.code} />
                {block.caption && (
                  <div className="text-center text-xs text-[#8696a0] mt-1 italic">
                    {block.caption}
                  </div>
                )}
              </div>
            );

          case 'fun_fact':
            return (
              <div
                key={index}
                className="my-2.5 p-3 rounded-xl bg-[#182229] border border-[#2a3942] text-sm shadow-sm flex items-start gap-2.5"
              >
                <div className="p-1.5 rounded-lg bg-[#2a3942]/60 text-[#f59e0b] flex-shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#f59e0b] text-[11px] uppercase tracking-wider mb-0.5">
                    Tahukah Kamu? (Fun Fact)
                  </div>
                  <div className="text-[#d1d7db] text-xs md:text-sm leading-relaxed">
                    {block.content}
                  </div>
                </div>
              </div>
            );

          case 'try_it':
            return (
              <div
                key={index}
                className="my-2.5 p-3.5 rounded-xl bg-[#182229] border border-[#2a3942] text-sm shadow-sm"
              >
                <div className="flex items-center gap-2 font-semibold text-[#53bdeb] text-xs uppercase tracking-wider mb-2">
                  <PlayCircle className="w-4 h-4 text-[#53bdeb] flex-shrink-0" />
                  <span>{block.title || 'Coba Sendiri di Terminal Kamu'}</span>
                </div>
                <ol className="space-y-1.5 text-[#d1d7db] text-xs md:text-sm">
                  {block.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="w-4.5 h-4.5 rounded-full bg-[#00a884]/20 text-[#25d366] border border-[#00a884]/40 flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 mt-0.5">
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
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 bg-[#202c33] hover:bg-[#2a3942] text-white rounded-full transition-colors z-10"
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
