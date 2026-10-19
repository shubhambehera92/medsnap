import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Inbox, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { logAudit } from '@/lib/audit';

export const Chat = () => {
  const { chatThreads, messages, photos, addMessage } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | null>(chatThreads[0]?.id ?? null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const active = chatThreads.find((t) => t.id === activeId) || null;
  const threadMessages = active ? messages.filter((m) => m.threadId === active.id) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  const send = () => {
    if (!active || !text.trim()) return;
    addMessage({
      id: `m-${Date.now()}`,
      threadId: active.id,
      author: user?.name || 'Unknown',
      authorRole: user?.role || 'Nurse',
      content: text.trim(),
      type: 'text',
      timestamp: new Date().toISOString(),
    });
    logAudit({ action: 'Chat Message', patient: active.patientName, details: text.trim().slice(0, 80) });
    setText('');
  };

  return (
    <MainLayout title="Team Chat">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-ink">Team Chat</h1>
          <p className="text-ink2">Threads per patient — photos shared by reference only</p>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100dvh-16rem)] md:h-[calc(100dvh-15rem)]">
          {/* Thread list */}
          <div className={`overflow-y-auto space-y-2 ${active ? 'hidden md:block' : ''}`}>
            {chatThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActiveId(thread.id)}
                className={`w-full text-left rounded-xl border p-3 transition-colors min-h-[44px] ${
                  thread.id === activeId
                    ? 'border-primary bg-primary-light/30'
                    : 'border-border bg-surface hover:bg-bg'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink text-sm">{thread.patientName}</span>
                  <span className="text-[10px] text-muted">
                    {new Date(thread.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-ink2 mt-1 truncate">{thread.lastMessage}</p>
              </button>
            ))}
          </div>

          {/* Conversation */}
          <div
            className={`rounded-2xl border border-border bg-surface flex flex-col overflow-hidden ${
              active ? '' : 'hidden md:flex'
            }`}
          >
            {active ? (
              <>
                <div className="flex items-center gap-2 p-3 border-b border-border">
                  <button
                    onClick={() => setActiveId(null)}
                    className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-bg"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-medium text-ink">{active.patientName}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {threadMessages.map((m) => {
                    const mine = m.author === user?.name;
                    const photo = m.photoId ? photos.find((p) => p.id === m.photoId) : null;
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                            mine ? 'bg-primary text-white dark:text-[#04211E]' : 'bg-bg text-ink'
                          }`}
                        >
                          {!mine && (
                            <p className="text-xs font-medium opacity-70 mb-1">
                              {m.author} · {m.authorRole}
                            </p>
                          )}
                          {m.type === 'photo' && photo ? (
                            <button
                              onClick={() => navigate(`/photo/${photo.id}`)}
                              className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-sm"
                            >
                              <img src={photo.imageData} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              <span>Open photo in viewer</span>
                            </button>
                          ) : (
                            <p className="text-sm">{m.content}</p>
                          )}
                          <p className="text-[10px] opacity-60 mt-1 tabular-nums">
                            {new Date(m.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <div className="p-3 border-t border-border flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    placeholder="Message…"
                    className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim()}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-primary text-white dark:text-[#04211E] disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Inbox}
                title="No thread selected"
                message="Pick a patient thread to start chatting."
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
