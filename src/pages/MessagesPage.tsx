import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Clock,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { Conversation, Message, Provider } from '@/lib/types';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
} from '@/lib/data';
import { useI18n } from '@/lib/i18n';

interface MessagesPageProps {
  conversationId?: string;
  onNavigate: (path: string) => void;
}

export function MessagesPage({ conversationId, onNavigate }: MessagesPageProps) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<(Conversation & { provider?: Provider | null })[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation & { provider?: Provider | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
      if (data.length > 0 && !conversationId) {
        setActiveConv(data[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const found = conversations.find((c) => c.id === conversationId);
      if (found) setActiveConv(found);
    }
  }, [conversationId, conversations]);

  const loadMessages = useCallback(async () => {
    if (!activeConv) return;
    setMsgLoading(true);
    try {
      const data = await fetchMessages(activeConv.id);
      setMessages(data);
    } catch {
      /* ignore */
    } finally {
      setMsgLoading(false);
    }
  }, [activeConv]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeConv, loadMessages]);

  const handleSend = async () => {
    if (!draft.trim() || !activeConv) return;
    setSending(true);
    try {
      if (navigator.onLine) {
        const msg = await sendMessage(activeConv.id, 'traveller', draft.trim());
        setMessages((prev) => [...prev, msg]);
      } else {
        // Queue message offline (T-45)
        const { queueOfflineAction } = await import('@/lib/offline');
        await queueOfflineAction({
          type: 'message',
          payload: { conversation_id: activeConv.id, sender: 'traveller', body: draft.trim() },
        });
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          conversation_id: activeConv.id,
          sender: 'traveller',
          body: draft.trim(),
          delivered: false,
          created_at: new Date().toISOString(),
        } as Message]);
      }
      setDraft('');
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <MessageCircle className="mx-auto h-12 w-12 text-ink-300" />
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-sand-50">
          No conversations yet
        </h2>
        <p className="mt-2 text-ink-500 dark:text-sand-400">
          Start a conversation with a provider from any listing page.
        </p>
        <button onClick={() => onNavigate('/listings')} className="btn-primary mt-6">
          Browse experiences
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="container-page py-8">
        <button onClick={() => onNavigate('/')} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-sand-50">
          Messages
        </h1>

        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConv(conv);
                  onNavigate(`/messages/${conv.id}`);
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  activeConv?.id === conv.id
                    ? 'border-terracotta-400 bg-terracotta-50 dark:bg-terracotta-900/20'
                    : 'border-sand-200 bg-white hover:border-sand-300 dark:border-ink-700 dark:bg-ink-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-ink-900 dark:text-sand-100 truncate">
                    {conv.provider?.display_name ?? 'Provider'}
                  </h3>
                  <span className="text-xs text-ink-400 dark:text-sand-500 flex-shrink-0">
                    {new Date(conv.last_message_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-500 dark:text-sand-400 truncate">
                  {conv.subject || 'No subject'}
                </p>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                    conv.status === 'open'
                      ? 'bg-zellige-100 text-zellige-700 dark:bg-zellige-900/30 dark:text-zellige-300'
                      : 'bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-sand-400'
                  }`}
                >
                  {conv.status}
                </span>
              </button>
            ))}
          </div>

          {/* Message thread */}
          {activeConv ? (
            <div className="card flex flex-col lg:max-h-[70vh]">
              {/* Header */}
              <div className="border-b border-sand-100 px-5 py-4 dark:border-ink-800">
                <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-sand-50">
                  {activeConv.provider?.display_name ?? 'Provider'}
                </h2>
                <p className="text-sm text-ink-500 dark:text-sand-400">
                  {activeConv.subject}
                </p>
                {activeConv.provider && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-ink-400 dark:text-sand-500">
                    <Clock className="h-3 w-3" />
                    Avg response: {activeConv.provider.response_time_hours}h
                  </div>
                )}
                {/* 24h no-reply alternatives (T-47) */}
                {activeConv.provider && (() => {
                  const hoursSince = (Date.now() - new Date(activeConv.last_message_at).getTime()) / 3600000;
                  if (hoursSince > 24 && activeConv.status === 'open') {
                    return (
                      <div className="mt-2 rounded-lg bg-saffron-50 p-2 text-xs text-saffron-700 dark:bg-saffron-900/20 dark:text-saffron-300">
                        No reply in over 24 hours. <button onClick={() => onNavigate('/listings')} className="font-medium underline">Find other providers</button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {msgLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-terracotta-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-400 dark:text-sand-500">
                    No messages yet. Start the conversation.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'traveller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          msg.sender === 'traveller'
                            ? 'bg-terracotta-500 text-white'
                            : 'bg-sand-100 text-ink-800 dark:bg-ink-700 dark:text-sand-100'
                        }`}
                      >
                        <p>{msg.body}</p>
                        <span className={`mt-1 block text-xs ${msg.sender === 'traveller' ? 'text-white/70' : 'text-ink-400 dark:text-sand-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-sand-100 p-4 dark:border-ink-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="btn-primary h-10 w-10 p-0 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex items-center justify-center p-16 text-ink-400 dark:text-sand-500">
              <AlertCircle className="h-8 w-8" />
              <p className="ml-2">Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
