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
  ListChecks,
  Pencil,
  Check,
  X,
  Play,
  RotateCcw,
  Kanban,
  History,
  Send,
} from 'lucide-react';
import { Artifact, Project, Story, StoryStatus, ChangelogEntry } from '@/types';
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

  // Langkah 3 — spec + stories (story 4)
  const [specId, setSpecId] = useState<string | null>(null);
  const [specStatus, setSpecStatus] = useState<'draft' | 'approved' | null>(null);
  const [specContent, setSpecContent] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editStoryTitle, setEditStoryTitle] = useState('');
  const [editStoryDescription, setEditStoryDescription] = useState('');
  const [storyWarningShown, setStoryWarningShown] = useState(false);

  // Story Board & Changelog (story 5)
  const [changelogs, setChangelogs] = useState<ChangelogEntry[]>([]);
  const [changelogNote, setChangelogNote] = useState('');
  const [addingChangelog, setAddingChangelog] = useState(false);
  const [updatingStoryId, setUpdatingStoryId] = useState<string | null>(null);

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
      const spec = list.find((a) => a.type === 'spec');
      if (prd) {
        setPrdId(prd.id);
        setPrdStatus(prd.status);
        setPrdContent(prd.content);
      }
      if (brief) setBrief(brief.content);
      if (spec) {
        setSpecId(spec.id);
        setSpecStatus(spec.status);
        setSpecContent(spec.content);
      }
    } catch (err) {
      console.error('Failed to fetch artifacts:', err);
      setError('Gagal memuat artefak — data yang tampil mungkin tidak lengkap.');
    }
  }, [projectId]);

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/stories`);
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    }
  }, [projectId]);

  const loadChangelogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/changelog`);
      if (res.ok) {
        const data = await res.json();
        setChangelogs(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch changelogs:', err);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadProject();
    loadArtifacts();
    loadStories();
    loadChangelogs();
  }, [projectId, loadProject, loadArtifacts, loadStories, loadChangelogs]);

  const nonDraftStoryCount = stories.filter((s) => s.status !== 'draft').length;
  const approvedStories = stories.filter((s) => s.status === 'approved');
  const doingStories = stories.filter((s) => s.status === 'doing');
  const doneStories = stories.filter((s) => s.status === 'done');

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

  const handleDraftSpec = async () => {
    setError('');
    setNotice('');
    // Lapisan UX (bukan guard API): konfirmasi regenerate saat ada story draft
    if (specContent && stories.some((s) => s.status === 'draft')) {
      const ok = window.confirm(
        'Regenerate akan MENGGANTI seluruh spec dan stories draft (termasuk editanmu). Lanjutkan?'
      );
      if (!ok) return;
    }
    setGeneratingSpec(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/draft-spec`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal memecah PRD.');
        return;
      }
      setNotice('Spec + stories berhasil dibuat. Review, edit bila perlu, lalu setujui per item.');
      await loadArtifacts();
      await loadStories();
    } catch (err) {
      console.error('Failed to draft spec:', err);
      setError('Gagal memecah PRD menjadi spec + stories.');
    } finally {
      setGeneratingSpec(false);
    }
  };

  const handleSaveSpecDraft = async () => {
    if (!specId) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/artifacts/${specId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: specContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan draft spec.');
        return;
      }
      setNotice('Draft spec tersimpan.');
    } catch (err) {
      console.error('Failed to save spec draft:', err);
      setError('Gagal menyimpan draft spec.');
    } finally {
      setBusy(false);
    }
  };

  const handleApproveSpec = async () => {
    if (!specId) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch(`/api/artifacts/${specId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyetujui spec.');
        return;
      }
      setNotice('Spec disetujui — terkunci.');
      await loadArtifacts();
    } catch (err) {
      console.error('Failed to approve spec:', err);
      setError('Gagal menyetujui spec.');
    } finally {
      setBusy(false);
    }
  };

  const handleApproveStory = async (storyId: string) => {
    setError('');
    setNotice('');
    // Peringatan konsekuensi sebelum approve story pertama ( elicitation story 4 )
    if (nonDraftStoryCount === 0 && !storyWarningShown) {
      const ok = window.confirm(
        'Menyetujui story PERTAMA akan mengunci regenerasi spec + stories secara permanen (409). Lanjutkan?'
      );
      if (!ok) return;
      setStoryWarningShown(true);
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyetujui story.');
        return;
      }
      await loadStories();
    } catch (err) {
      console.error('Failed to approve story:', err);
      setError('Gagal menyetujui story.');
    } finally {
      setBusy(false);
    }
  };

  const startEditStory = (s: Story) => {
    setEditingStoryId(s.id);
    setEditStoryTitle(s.title);
    setEditStoryDescription(s.description);
  };

  const handleSaveStory = async (storyId: string) => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editStoryTitle, description: editStoryDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan story.');
        return;
      }
      setEditingStoryId(null);
      await loadStories();
    } catch (err) {
      console.error('Failed to update story:', err);
      setError('Gagal menyimpan story.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStoryStatus = async (storyId: string, status: 'doing' | 'done') => {
    setError('');
    setNotice('');
    setUpdatingStoryId(storyId);
    try {
      const res = await fetch(`/api/stories/${storyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal memperbarui status story.');
        return;
      }
      const label = status === 'doing' ? 'sedang dikerjakan' : 'selesai';
      setNotice(`Status story diperbarui ke ${label}.`);
      await loadStories();
    } catch (err) {
      console.error('Failed to update story status:', err);
      setError('Gagal memperbarui status story.');
    } finally {
      setUpdatingStoryId(null);
    }
  };

  const handleAddChangelog = async () => {
    const trimmed = changelogNote.trim();
    if (!trimmed) return;
    setError('');
    setNotice('');
    setAddingChangelog(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/changelog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menambahkan catatan changelog.');
        return;
      }
      setChangelogNote('');
      setNotice('Catatan changelog berhasil ditambahkan.');
      await loadChangelogs();
    } catch (err) {
      console.error('Failed to add changelog:', err);
      setError('Gagal menambahkan catatan changelog.');
    } finally {
      setAddingChangelog(false);
    }
  };

  const getStoryStatusBadge = (status: StoryStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40';
      case 'doing':
        return 'bg-[#3b82f6]/20 text-[#60a5fa] border-[#3b82f6]/40';
      case 'done':
        return 'bg-[#10b981]/25 text-[#34d399] border-[#10b981]/50';
      default:
        return 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40';
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

        {/* Langkah 3: Spec + Stories (muncul saat PRD approved) */}
        {prdStatus === 'approved' && (
          <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
            <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
              <FileText size={18} className="text-[#00a884]" />
              <span className="font-medium text-sm">Langkah 3 — Pecah PRD jadi Spec + Stories</span>
              {stories.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40">
                  {nonDraftStoryCount}/{stories.length} story disetujui
                </span>
              )}
            </div>

            <button
              onClick={handleDraftSpec}
              disabled={generatingSpec || specStatus === 'approved' || nonDraftStoryCount > 0}
              title={
                nonDraftStoryCount > 0
                  ? 'Ada story yang sudah disetujui — regenerasi terkunci'
                  : 'Minta AI memecah PRD menjadi spec + stories'
              }
              className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Sparkles size={15} />
              {generatingSpec ? 'Memecah PRD…' : specContent ? 'Draf Ulang Spec + Stories' : 'Pecah PRD dengan AI'}
            </button>

            {specContent && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2 text-[#e9edef]">
                  <span className="text-xs font-medium">Spec</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      specStatus === 'approved'
                        ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
                        : 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40'
                    }`}
                  >
                    {specStatus === 'approved' ? 'disetujui' : 'draft'}
                  </span>
                </div>
                <textarea
                  value={specContent}
                  onChange={(e) => setSpecContent(e.target.value)}
                  readOnly={specStatus === 'approved'}
                  rows={16}
                  className="w-full bg-[#111b21] text-[#e9edef] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-[#00a884] resize-y leading-relaxed"
                />
                {specStatus !== 'approved' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      onClick={handleSaveSpecDraft}
                      disabled={busy || generatingSpec || !specContent.trim()}
                      className="inline-flex items-center gap-2 bg-[#2a3942] hover:bg-[#334550] disabled:opacity-40 disabled:cursor-not-allowed text-[#e9edef] text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      <Save size={14} /> Simpan Draft Spec
                    </button>
                    <button
                      onClick={handleApproveSpec}
                      disabled={busy || generatingSpec || !specContent.trim()}
                      className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle2 size={14} /> Setujui Spec
                    </button>
                  </div>
                )}
              </div>
            )}

            {stories.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2 text-[#e9edef]">
                  <ListChecks size={16} className="text-[#00a884]" />
                  <span className="text-xs font-medium">Stories ({stories.length})</span>
                </div>
                <div className="space-y-2">
                  {stories.map((s, i) =>
                    editingStoryId === s.id ? (
                      <div key={s.id} className="bg-[#111b21] rounded-lg p-3 border border-[#00a884]/50">
                        <input
                          type="text"
                          value={editStoryTitle}
                          onChange={(e) => setEditStoryTitle(e.target.value)}
                          maxLength={200}
                          className="w-full bg-[#2a3942] text-[#e9edef] rounded px-2 py-1.5 text-xs mb-2 outline-none focus:ring-1 focus:ring-[#00a884]"
                        />
                        <textarea
                          value={editStoryDescription}
                          onChange={(e) => setEditStoryDescription(e.target.value)}
                          rows={4}
                          maxLength={20000}
                          className="w-full bg-[#2a3942] text-[#e9edef] rounded px-2 py-1.5 text-xs mb-2 outline-none focus:ring-1 focus:ring-[#00a884] resize-y"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveStory(s.id)}
                            disabled={busy}
                            className="bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 text-white text-[11px] font-medium px-2.5 py-1 rounded flex items-center gap-1"
                          >
                            <Check size={12} /> Simpan
                          </button>
                          <button
                            onClick={() => setEditingStoryId(null)}
                            className="bg-[#2a3942] hover:bg-[#334550] text-[#e9edef] text-[11px] px-2.5 py-1 rounded flex items-center gap-1"
                          >
                            <X size={12} /> Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={s.id}
                        className="bg-[#2a3942] rounded-lg p-3 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[#e9edef] text-xs font-medium">
                            {i + 1}. {s.title}
                          </p>
                          <p className="text-[#8696a0] text-[11px] mt-1 whitespace-pre-wrap">{s.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 items-center">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${getStoryStatusBadge(s.status)}`}
                          >
                            {s.status}
                          </span>
                          {s.status === 'draft' && (
                            <>
                              <button
                                onClick={() => startEditStory(s)}
                                title="Edit story"
                                className="p-1.5 rounded text-[#8696a0] hover:text-[#00a884] hover:bg-[#202c33] transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleApproveStory(s.id)}
                                disabled={busy}
                                title="Setujui story"
                                className="p-1.5 rounded text-[#8696a0] hover:text-[#00a884] hover:bg-[#202c33] disabled:opacity-40 transition-colors"
                              >
                                <CheckCircle2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tahap Development — Story Board (Story 5) */}
        {stories.length > 0 && (
          <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
            <div className="flex items-center justify-between mb-3 text-[#e9edef]">
              <div className="flex items-center gap-2">
                <Kanban size={18} className="text-[#00a884]" />
                <span className="font-medium text-sm">Tahap Development — Story Board</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8696a0]">
                <span>{doingStories.length} sedang dikerjakan</span>
                <span>·</span>
                <span>{doneStories.length} selesai</span>
              </div>
            </div>

            {nonDraftStoryCount === 0 ? (
              <p className="text-xs text-[#8696a0] bg-[#111b21] rounded-lg p-3">
                Belum ada story yang disetujui. Setujui story di Langkah 3 Planning di atas agar masuk ke antrean pengerjaan board.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kolom 1: Siap Dikerjakan (approved) */}
                <div className="bg-[#111b21] rounded-lg p-3 border border-[#2f3b43]/70 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#e9edef]">Siap Dikerjakan</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40 font-medium">
                      {approvedStories.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {approvedStories.length === 0 ? (
                      <p className="text-[11px] text-[#667781] italic py-2 text-center">Tidak ada story</p>
                    ) : (
                      approvedStories.map((s) => (
                        <div key={s.id} className="bg-[#202c33] rounded-md p-2.5 border border-[#2f3b43]">
                          <p className="text-[#e9edef] text-xs font-medium">{s.title}</p>
                          <p className="text-[#8696a0] text-[11px] mt-1 whitespace-pre-wrap line-clamp-3">
                            {s.description}
                          </p>
                          <div className="mt-2.5 pt-2 border-t border-[#2f3b43] flex justify-end">
                            <button
                              onClick={() => handleUpdateStoryStatus(s.id, 'doing')}
                              disabled={updatingStoryId !== null || busy}
                              className="inline-flex items-center gap-1 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 text-white text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
                            >
                              <Play size={11} /> Mulai
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Kolom 2: Sedang Dikerjakan (doing) */}
                <div className="bg-[#111b21] rounded-lg p-3 border border-[#2f3b43]/70 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#60a5fa]">Sedang Dikerjakan</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/40 font-medium">
                      {doingStories.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {doingStories.length === 0 ? (
                      <p className="text-[11px] text-[#667781] italic py-2 text-center">Tidak ada story</p>
                    ) : (
                      doingStories.map((s) => (
                        <div key={s.id} className="bg-[#202c33] rounded-md p-2.5 border border-[#3b82f6]/40">
                          <p className="text-[#e9edef] text-xs font-medium">{s.title}</p>
                          <p className="text-[#8696a0] text-[11px] mt-1 whitespace-pre-wrap line-clamp-3">
                            {s.description}
                          </p>
                          <div className="mt-2.5 pt-2 border-t border-[#2f3b43] flex justify-end">
                            <button
                              onClick={() => handleUpdateStoryStatus(s.id, 'done')}
                              disabled={updatingStoryId !== null || busy}
                              className="inline-flex items-center gap-1 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
                            >
                              <Check size={11} /> Selesai
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Kolom 3: Selesai (done) */}
                <div className="bg-[#111b21] rounded-lg p-3 border border-[#2f3b43]/70 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#34d399]">Selesai</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#10b981]/25 text-[#34d399] border border-[#10b981]/50 font-medium">
                      {doneStories.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {doneStories.length === 0 ? (
                      <p className="text-[11px] text-[#667781] italic py-2 text-center">Belum ada yang selesai</p>
                    ) : (
                      doneStories.map((s) => (
                        <div key={s.id} className="bg-[#202c33] rounded-md p-2.5 border border-[#10b981]/30">
                          <p className="text-[#e9edef] text-xs font-medium line-through text-[#8696a0]">{s.title}</p>
                          <p className="text-[#667781] text-[11px] mt-1 whitespace-pre-wrap line-clamp-2">
                            {s.description}
                          </p>
                          <div className="mt-2.5 pt-2 border-t border-[#2f3b43] flex justify-end">
                            <button
                              onClick={() => handleUpdateStoryStatus(s.id, 'doing')}
                              disabled={updatingStoryId !== null || busy}
                              title="Buka ulang story ke status Sedang Dikerjakan"
                              className="inline-flex items-center gap-1 bg-[#2a3942] hover:bg-[#334550] disabled:opacity-40 text-[#e9edef] text-[11px] font-medium px-2 py-1 rounded transition-colors"
                            >
                              <RotateCcw size={11} /> Buka ulang
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tahap Development — Changelog (Story 5) */}
        <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
          <div className="flex items-center justify-between mb-3 text-[#e9edef]">
            <div className="flex items-center gap-2">
              <History size={18} className="text-[#00a884]" />
              <span className="font-medium text-sm">Tahap Development — Changelog</span>
            </div>
            <span className="text-[11px] text-[#8696a0]">
              {changelogs.length} catatan · append-only
            </span>
          </div>

          {/* Form input */}
          <div className="mb-4">
            <textarea
              value={changelogNote}
              onChange={(e) => setChangelogNote(e.target.value)}
              placeholder="Tulis catatan keputusan arsitektur, bugfix, atau progres pengerjaan di sini…"
              rows={3}
              maxLength={2000}
              className="w-full bg-[#111b21] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#00a884] resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-[#667781]">{changelogNote.length}/2.000 karakter</span>
              <button
                onClick={handleAddChangelog}
                disabled={!changelogNote.trim() || addingChangelog}
                className="inline-flex items-center gap-1.5 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Send size={13} />
                {addingChangelog ? 'Menyimpan…' : 'Tambah Catatan'}
              </button>
            </div>
          </div>

          {/* Daftar catatan */}
          <div className="space-y-2">
            {changelogs.length === 0 ? (
              <p className="text-xs text-[#8696a0] bg-[#111b21] rounded-lg p-3 text-center">
                Belum ada catatan changelog.
              </p>
            ) : (
              changelogs.map((c) => (
                <div key={c.id} className="bg-[#111b21] rounded-lg p-3 border border-[#2f3b43]">
                  <div className="flex items-center justify-between text-[11px] text-[#8696a0] mb-1.5">
                    <span className="font-mono">{c.created_at}</span>
                  </div>
                  <p className="text-[#e9edef] text-xs whitespace-pre-wrap break-words leading-relaxed">{c.note}</p>
                </div>
              ))
            )}
          </div>
        </section>

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
