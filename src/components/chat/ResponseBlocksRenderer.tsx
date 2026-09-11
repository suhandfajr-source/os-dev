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
    <div className="space-y-3.5 text-[#111b21]">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'markdown':
            return <MarkdownRenderer key={index} content={block.content} />;

          case 'illustration': {
            const hasVisual = Boolean(block.svgContent || block.imageUrl);

            return (
              <div key={index} className="my-3 max-w-lg">
                {hasVisual && !block.failed ? (
                  <div className="bg-[#f0f2f5] border border-[#e9edef] rounded-2xl overflow-hidden shadow-sm group transition-all hover:border-[#008069]">
                    {/* Media Header Badge */}
                    <div className="px-3.5 py-2 bg-[#f8fafc] border-b border-[#e9edef] flex items-center justify-between text-[11px] text-[#667781]">
                      <span className="flex items-center gap-1.5 font-semibold text-[#008069]">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Media Ilustrasi Analogi
                      </span>
                      <span className="text-[10px] bg-[#e2e8f0] text-[#475569] px-2 py-0.5 rounded-full font-medium">Vektor SVG</span>
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
                        className="block w-full text-left relative overflow-hidden bg-[#0b141a] p-1.5 cursor-pointer"
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
                      <div className="p-2.5 bg-[#f8fafc] border-t border-[#e9edef] text-xs text-[#475569] flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-[#008069] flex-shrink-0 mt-0.5" />
                        <span className="leading-snug font-medium">{block.caption}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#f0f2f5] border border-[#e9edef] text-xs text-[#667781] flex items-start gap-2.5">
                    <ImageOff className="w-4 h-4 text-[#667781] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-[#111b21]">
                        {block.caption || block.alt || 'Visualisasi Analogi'}
                      </div>
                      <div className="text-[11px] text-[#667781] mt-0.5">
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
                  <div className="text-center text-xs text-[#667781] mt-1 font-medium italic">
                    {block.caption}
                  </div>
                )}
              </div>
            );

          case 'fun_fact':
            return (
              <div
                key={index}
                className="my-2.5 p-3.5 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-sm shadow-sm flex items-start gap-3"
              >
                <div className="p-1.5 rounded-lg bg-[#fef3c7] text-[#d97706] flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[#b45309] text-[11px] uppercase tracking-wider mb-0.5">
                    Tahukah Kamu? (Fun Fact)
                  </div>
                  <div className="text-[#78350f] text-xs md:text-sm leading-relaxed">
                    {block.content}
                  </div>
                </div>
              </div>
            );

          case 'try_it':
            return (
              <div
                key={index}
                className="my-2.5 p-3.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-sm shadow-sm"
              >
                <div className="flex items-center gap-2 font-bold text-[#1d4ed8] text-xs uppercase tracking-wider mb-2">
                  <PlayCircle className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                  <span>{block.title || 'Coba Sendiri di Terminal Kamu'}</span>
                </div>
                <ol className="space-y-1.5 text-[#1e40af] text-xs md:text-sm">
                  {block.steps.map((step, sIdx) => (
                    <li key={sIdx} className="flex items-start gap-2">
                      <span className="w-4.5 h-4.5 rounded-full bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd] flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0 mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span className="flex-1 leading-relaxed font-medium">{step}</span>
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
