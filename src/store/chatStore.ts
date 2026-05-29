import { create } from 'zustand';
import { getUnreadChatCount, getMyConversations } from '../api/chat';
import { onChatMessage, onChatNotification } from '../api/chatSocket';
import { useAppStore } from './appStore';

type ChatState = {
  unreadTotal: number;
  activeConversationId: string | null;
  init: () => void;
  refreshUnread: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  clearUnread: () => void;
};

let initialized = false;

export const useChatStore = create<ChatState>((set, get) => ({
  unreadTotal: 0,
  activeConversationId: null,

  refreshUnread: async () => {
    try {
      const data = await getUnreadChatCount();
      set({ unreadTotal: data.total });
    } catch {
      try {
        const convs = await getMyConversations();
        set({ unreadTotal: convs.reduce((s, c) => s + c.unreadByUser, 0) });
      } catch {
        /* noop */
      }
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  clearUnread: () => set({ unreadTotal: 0 }),

  init: () => {
    if (initialized) return;
    initialized = true;

    void get().refreshUnread();

    onChatMessage((msg) => {
      if (msg.sender === 'admin' && msg.conversationId !== get().activeConversationId) {
        set((s) => ({ unreadTotal: s.unreadTotal + 1 }));
      }
    });

    onChatNotification((payload) => {
      void get().refreshUnread();
      useAppStore.getState().addNotification('💬 Nuevo mensaje', payload.preview.slice(0, 80));
    });
  },
}));
