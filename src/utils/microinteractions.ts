type AddToCartFeedbackOptions = {
  emoji?: string;
  sourceElement?: Element | null;
};

function getCartIconElement(): Element | null {
  return document.querySelector('.bottom-nav a[href="/cart"] .nav-icon');
}

export function playAddToCartFeedback(options: AddToCartFeedbackOptions = {}): void {
  const { emoji = '🍔', sourceElement } = options;

  const bottomNav = document.querySelector('.bottom-nav');
  bottomNav?.classList.remove('cart-add-flash');
  void bottomNav?.getBoundingClientRect();
  bottomNav?.classList.add('cart-add-flash');
  window.setTimeout(() => bottomNav?.classList.remove('cart-add-flash'), 520);

  const cartIcon = getCartIconElement();
  if (!sourceElement || !cartIcon) return;

  const from = sourceElement.getBoundingClientRect();
  const to = cartIcon.getBoundingClientRect();

  const flyer = document.createElement('div');
  flyer.className = 'fly-to-cart-particle';
  flyer.textContent = emoji;
  flyer.style.left = `${from.left + from.width / 2}px`;
  flyer.style.top = `${from.top + from.height / 2}px`;
  document.body.appendChild(flyer);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  window.requestAnimationFrame(() => {
    flyer.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
    flyer.style.opacity = '0';
  });

  window.setTimeout(() => flyer.remove(), 650);

  const badge = cartIcon.querySelector('.nav-badge');
  if (badge) {
    badge.classList.remove('cart-badge-pop');
    void (badge as HTMLElement).offsetWidth;
    badge.classList.add('cart-badge-pop');
  }
}

export function pulseElement(element: Element | null): void {
  if (!element) return;
  element.classList.remove('tap-pulse');
  void (element as HTMLElement).offsetWidth;
  element.classList.add('tap-pulse');
  window.setTimeout(() => element.classList.remove('tap-pulse'), 320);
}
