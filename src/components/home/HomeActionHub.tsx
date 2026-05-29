import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CartItem } from '../../types';
import { formatPrice } from '../../utils/format';

export type HomeAction = {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  path?: string;
  onClick?: () => void;
  delay: number;
  accent?: boolean;
  disabled?: boolean;
};

type BuildOptions = {
  lastOrder: CartItem[] | null;
  ordersOpen?: boolean;
  onRepeat: () => void;
};

export function buildHomeActions({ lastOrder, ordersOpen = true, onRepeat }: BuildOptions): HomeAction[] {
  const lastTotal = lastOrder?.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) ?? 0;

  const list: HomeAction[] = [
    {
      id: 'quick',
      emoji: '🍔',
      label: 'Algo rápido',
      hint: 'Lo más pedido · opciones simples',
      path: '/quick',
      delay: 0.05,
      accent: true,
      disabled: !ordersOpen,
    },
    {
      id: 'suggest',
      emoji: '🎯',
      label: 'Recomiéndame algo',
      hint: 'IA personalizada para ti',
      path: '/ai-recommendation',
      delay: 0.12,
      disabled: !ordersOpen,
    },
    {
      id: 'menu',
      emoji: '👨‍🍳',
      label: 'Ver carta completa',
      hint: 'Todas las categorías',
      path: '/menu',
      delay: 0.19,
      disabled: !ordersOpen,
    },
  ];

  if (lastOrder && lastOrder.length > 0) {
    list.push({
      id: 'repeat',
      emoji: '🔁',
      label: 'Repetir pedido',
      hint: `${lastOrder.length} producto${lastOrder.length !== 1 ? 's' : ''} · ${formatPrice(lastTotal)}`,
      onClick: onRepeat,
      delay: 0.26,
      disabled: !ordersOpen,
    });
  }

  list.push({
    id: 'about',
    emoji: 'ℹ️',
    label: 'Sobre nosotros',
    hint: 'Conoce Puente Zardain',
    path: '/about',
    delay: 0.33,
  });

  return list;
}

type HubProps = {
  actions: HomeAction[];
  onNavigate?: (path: string) => void;
  className?: string;
};

export function HomeActionHub({ actions, onNavigate, className = '' }: HubProps) {
  const navigate = useNavigate();

  const go = useCallback(
    (path: string) => {
      if (onNavigate) onNavigate(path);
      else navigate(path);
    },
    [navigate, onNavigate],
  );

  return (
    <section className={`home-action-hub ${className}`.trim()}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`onboarding-action home-action ${action.accent ? 'onboarding-action--accent' : ''}`}
          style={{ animationDelay: `${action.delay}s` }}
          disabled={action.disabled}
          onClick={() => {
            if (action.disabled) return;
            if (action.onClick) action.onClick();
            else if (action.path) go(action.path);
          }}
        >
          <span className="onboarding-action-emoji">{action.emoji}</span>
          <span className="onboarding-action-text">
            <strong>{action.label}</strong>
            <small>{action.hint}</small>
          </span>
          <span className="onboarding-action-arrow">→</span>
        </button>
      ))}
    </section>
  );
}

export function useHomeActions(
  lastOrder: CartItem[] | null,
  onRepeat: () => void,
  ordersOpen = true,
) {
  return useMemo(
    () => buildHomeActions({ lastOrder, ordersOpen, onRepeat }),
    [lastOrder, ordersOpen, onRepeat],
  );
}
