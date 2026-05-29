import { create } from 'zustand';

type DialogKind = 'alert' | 'confirm';

type DialogState = {
  open: boolean;
  kind: DialogKind;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: ((value: boolean) => void) | null;
};

type AlertStore = {
  dialog: DialogState;
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  closeDialog: (confirmed: boolean) => void;
};

const emptyDialog = (): DialogState => ({
  open: false,
  kind: 'alert',
  title: '',
  message: '',
  confirmLabel: 'Entendido',
  cancelLabel: 'Cancelar',
  resolve: null,
});

export const useAlertStore = create<AlertStore>((set, get) => ({
  dialog: emptyDialog(),

  alert: (message, title = 'Aviso') =>
    new Promise((resolve) => {
      set({
        dialog: {
          open: true,
          kind: 'alert',
          title,
          message,
          confirmLabel: 'Entendido',
          cancelLabel: 'Cancelar',
          resolve: () => resolve(),
        },
      });
    }),

  confirm: (message, title = 'Confirmar') =>
    new Promise((resolve) => {
      set({
        dialog: {
          open: true,
          kind: 'confirm',
          title,
          message,
          confirmLabel: 'Confirmar',
          cancelLabel: 'Cancelar',
          resolve,
        },
      });
    }),

  closeDialog: (confirmed) => {
    const { dialog } = get();
    dialog.resolve?.(confirmed);
    set({ dialog: emptyDialog() });
  },
}));
