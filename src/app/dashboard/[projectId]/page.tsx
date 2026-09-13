'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Save,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  StickyNote,
} from 'lucide-react';
import { Artifact, Project } from '@/types';
import { QUESTIONS_HEADING, QUESTIONS_EMPTY } from '@/lib/ai/prd-prompt';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [brief, setBrief] = useState('');
  const [prdContent, setPrdContent] = useState('');
  const [prdId, setPrdId] = useState<string | null>(null);
  const [prdStatus, setPrdStatus] = useState<'draft' | 'approved' | null>(null);

  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        setProject((await res.json()).project);
      } else {
        setError('Gagal memuat proyek — coba muat ulang halaman.'); // R9/EC-6: jangan diam
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setError('Gagal memuat proyek — coba muat ulang halaman.');
    }
  }, [projectId]);

  const loadArtifacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/artifacts`);
      if (!res.ok) {
        console.error('Failed to fetch artifacts:', res.status);
        setError('Gagal memuat artefak — data yang tampil mungkin tidak lengkap.'); // R9/AD-8
        return;
      }
      const data = await res.json();
      const list: Artifact[] = data.artifacts || [];
      setArtifacts(list);
      const prd = list.find((a) => a.type === 'prd');
      const brief = list.find((a) => a.type === 'brief');
      if (prd) {
        setPrdId(prd.id);
        setPrdStatus(prd.status);
        setPrdContent(prd.content);
      }
      if (brief) setBrief(brief.content);
    } catch (err) {
      console.error('Failed to fetch artifacts:', err);
      setError('Gagal memuat artefak — data yang tampil mungkin tidak lengkap.');
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadProject();
    loadArtifacts();
  }, [projectId, loadProject, loadArtifacts]);

  const handleDraftPrd = async () => {
    setError('');
    setNotice('');
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal membuat draf PRD.');
        return;
      }
      setNotice('Draf PRD berhasil dibuat. Review, edit bila perlu, lalu setujui.');
      await loadArtifacts();
    } catch (err) {
      console.error('Failed to draft PRD:', err);
      setError('Gagal membuat draf PRD. Silakan coba lagi.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!prdId) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/artifacts/${prdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: prdContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan draft.');
        return;
      }
      setNotice('Draft PRD tersimpan.');
      await loadArtifacts();
    } catch (err) {
      console.error('Failed to save draft:', err);
      setError('Gagal menyimpan draft.');
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!prdId) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/artifacts/${prdId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyetujui PRD.');
        return;
      }
      setNotice('PRD disetujui — tahap Planning selesai. ✅');
      await loadArtifacts();
    } catch (err) {
      console.error('Failed to approve:', err);
      setError('Gagal menyetujui PRD.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBriefOnly = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, skipAi: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan brief.');
        return;
      }
      setNotice('Brief tersimpan.');
      await loadArtifacts();
    } catch (err) {
      console.error('Failed to save brief:', err);
      setError('Gagal menyimpan brief.');
    } finally {
      setBusy(false);
    }
  };

  const extractQuestions = (content: string): string[] => {
    // R7/AD-4: dibangun dari konstanta yang sama dengan prompt — satu sumber kebenaran
    const match = content.match(new RegExp(`${QUESTIONS_HEADING}\\n([\\s\\S]*)$`));
    if (!match) return [];
    return match[1]
      .split('\n')
      .map((l) => l.trim().replace(/^- /, ''))
      .filter((l) => l.length > 0 && l !== QUESTIONS_EMPTY);
  };

  if (notFound) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#0b141a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8696a0] mb-4">Proyek tidak ditemukan.</p>
          <Link href="/dashboard" className="text-[#00a884] hover:underline text-sm">
            ← Kembali ke daftar proyek
          </Link>
        </div>
      </div>
    );
  }

  const questions = extractQuestions(prdContent);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b141a]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[#8696a0] hover:text-[#00a884] text-sm mb-4"
        >
          <ArrowLeft size={15} /> Daftar proyek
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center">
            <FileText className="text-[#00a884]" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e9edef]">
              {project ? project.name : 'Memuat…'}
            </h1>
            <p className="text-sm text-[#8696a0]">Wizard Planning — dari brief ke PRD</p>
          </div>
        </div>
        {project?.description && (
          <p className="text-sm text-[#8696a0] mb-6 whitespace-pre-wrap">{project.description}</p>
        )}

        {error && (
          <div className="bg-[#3b1d22] border border-[#f15c6d]/40 text-[#f15c6d] text-xs rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-[#0f2e26] border border-[#00a884]/40 text-[#00a884] text-xs rounded-lg px-3 py-2 mb-4">
            {notice}
          </div>
        )}

        {/* Step 1: Brief */}
        <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
          <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
            <StickyNote size={18} className="text-[#00a884]" />
            <span className="font-medium text-sm">Langkah 1 — Tulis Brief</span>
            {artifacts.some((a) => a.type === 'brief') && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#2a3942] text-[#667781] border-[#2f3b43]">
                tersimpan
              </span>
            )}
          </div>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Tulis brief: apa yang ingin dibangun, untuk siapa, fitur apa saja yang kamu bayangkan…"
            rows={6}
            maxLength={8000}
            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#00a884] resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-[#667781]">{brief.length}/8.000 karakter</span>
            <button
              onClick={handleDraftPrd}
              disabled={!brief.trim() || generating || prdStatus === 'approved'}
              title={
                prdStatus === 'approved'
                  ? 'PRD sudah disetujui — tidak bisa membuat draf baru'
                  : 'Minta AI menyusun draf PRD dari brief'
              }
              className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Sparkles size={15} />
              {generating ? 'Menyusun draf…' : prdContent ? 'Draf Ulang PRD' : 'Draf PRD dengan AI'}
            </button>
          </div>
          {prdStatus === 'approved' && (
            <p className="text-[11px] text-[#f5c33b] mt-2">
              PRD sudah disetujui — draf baru dikunci (409) agar status tidak jadi zombie. Brief tetap bisa disimpan.
            </p>
          )}
          {prdStatus === 'approved' && (
            <button
              onClick={handleSaveBriefOnly}
              disabled={!brief.trim() || busy}
              className="mt-2 inline-flex items-center gap-2 bg-[#2a3942] hover:bg-[#334550] disabled:opacity-40 disabled:cursor-not-allowed text-[#e9edef] text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <StickyNote size={14} /> Simpan Brief saja
            </button>
          )}
        </section>

        {/* Step 2: PRD draft */}
        {prdContent && (
          <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
            <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
              <FileText size={18} className="text-[#00a884]" />
              <span className="font-medium text-sm">Langkah 2 — Review & Edit Draf PRD</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  prdStatus === 'approved'
                    ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                    : 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40'
                }`}
              >
                {prdStatus === 'approved' ? 'disetujui' : 'draft'}
              </span>
            </div>
            <textarea
              value={prdContent}
              onChange={(e) => setPrdContent(e.target.value)}
              readOnly={prdStatus === 'approved'}
              rows={20}
              className="w-full bg-[#111b21] text-[#e9edef] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-[#00a884] resize-y leading-relaxed"
            />

            {/* Pertanyaan kritis — blok menonjol, bukan catatan kaki */}
            {questions.length > 0 && (
              <div className="mt-3 bg-[#f5c33b]/10 border border-[#f5c33b]/40 rounded-lg p-3">
                <div className="flex items-center gap-2 text-[#f5c33b] text-sm font-medium mb-2">
                  <HelpCircle size={16} />
                  Pertanyaan Kritis Belum Terjawab ({questions.length})
                </div>
                <ul className="list-disc list-inside text-[#e9edef] text-xs space-y-1">
                  {questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleSaveDraft}
                disabled={busy || prdStatus === 'approved' || generating || !prdContent.trim()}
                className="inline-flex items-center gap-2 bg-[#2a3942] hover:bg-[#334550] disabled:opacity-40 disabled:cursor-not-allowed text-[#e9edef] text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <Save size={14} /> Simpan Draft
              </button>
              <button
                onClick={handleApprove}
                disabled={busy || generating || prdStatus === 'approved' || !prdContent.trim()}
                title={generating ? 'Tunggu draf selesai — cegah menyetujui konten basi' : 'Setujui PRD'}
                className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <CheckCircle2 size={14} /> Setujui PRD
              </button>
            </div>
          </section>
        )}

        {/* Artefak proyek */}
        {artifacts.length > 0 && (
          <section className="bg-[#202c33] rounded-xl p-4 border border-[#2f3b43]">
            <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
              <FileText size={18} className="text-[#8696a0]" />
              <span className="font-medium text-sm">Artefak Proyek</span>
            </div>
            <ul className="space-y-2">
              {artifacts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between text-xs text-[#e9edef] bg-[#2a3942] rounded-lg px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{a.type === 'brief' ? 'Brief' : a.type.toUpperCase()}</span>
                    <span className="text-[#667781]"> · tahap {a.stage}</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      a.status === 'approved'
                        ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                        : 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40'
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
