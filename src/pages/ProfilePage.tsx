import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';

import { useOrderStore } from '../store/orderStore';

import { useAppStore } from '../store/appStore';

import { useThemeStore } from '../store/themeStore';

import { Button } from '../components/ui/Button';

import { Card } from '../components/ui/Card';

import { LevelCard } from '../components/gamification/LevelCard';

import { ZardasWidget } from '../components/gamification/ZardasWidget';

import { formatBirthdayDisplay } from '../utils/birthday';

import { ProfileAvatar } from '../components/profile/ProfileAvatar';

import { ProfileStyleCard } from '../components/profile/ProfileStyleCard';

import { AddressManager } from '../components/address/AddressManager';

import { BadgeGrid } from '../components/gamification/BadgeGrid';

import { getProfileDisplay } from '../utils/profile';

import type { User } from '../types';



export function ProfilePage() {

  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);

  const logout = useAuthStore((s) => s.logout);

  const updateProfile = useAuthStore((s) => s.updateProfile);

  const fetchOrders = useOrderStore((s) => s.fetchOrders);

  const orders = useOrderStore((s) => s.orders);

  const loadFavorites = useAppStore((s) => s.loadFavorites);

  const showToast = useAppStore((s) => s.showToast);

  const darkMode = useThemeStore((s) => s.darkMode);

  const toggleDarkMode = useThemeStore((s) => s.toggleDarkMode);



  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', birthday: '' });

  const [error, setError] = useState('');



  useEffect(() => {

    if (!user) return;

    fetchOrders(user.id);

    loadFavorites(user.id);

    setForm({

      name: user.name,

      phone: user.phone,

      birthday: user.birthday ?? '',

    });

  }, [user, fetchOrders, loadFavorites]);



  if (!user) {

    return (

      <div className="page profile-page">

        <Card className="auth-cta">

          <p>Inicia sesión para ver tu perfil y ganar Zardas</p>

          <Button fullWidth onClick={() => navigate('/auth')}>Entrar / Registrarse</Button>

        </Card>

      </div>

    );

  }



  const favoriteProduct = (() => {

    const counts = new Map<string, { name: string; qty: number }>();

    orders

      .filter((o) => o.userId === user.id)

      .flatMap((o) => o.items)

      .forEach((item) => {

        const cur = counts.get(item.productId);

        counts.set(item.productId, {

          name: item.product.name,

          qty: (cur?.qty ?? 0) + item.quantity,

        });

      });

    let best = '—';

    let max = 0;

    counts.forEach(({ name, qty }) => {

      if (qty > max) {

        max = qty;

        best = name;

      }

    });

    return best;

  })();



  const handleSave = async () => {

    setError('');

    try {

      await updateProfile(form);

      setEditing(false);

      showToast('Datos actualizados');

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Error');

    }

  };



  const handleSaveStyle = async (patch: Partial<User>, quiet = false) => {

    await updateProfile(patch);

    if (!quiet) showToast('Estilo actualizado ✨');

  };



  const display = getProfileDisplay(user);



  return (

    <div className="page profile-page">

      <div className="profile-hero profile-hero--rich">

        <ProfileAvatar

          avatar={display.avatar}

          color={display.color}

          frame={display.frame}

          size="xxl"

          level={user.level}

        />

        <h1 style={{ color: display.color }}>{user.name}</h1>

        {display.tagline && <p className="profile-tagline profile-tagline--hero">{display.tagline}</p>}

        <p className="hint">{user.email}</p>

        <p className="profile-member-since">

          Cliente desde {new Date(user.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}

        </p>

      </div>



      <ProfileStyleCard user={user} onSave={handleSaveStyle} />



      <ZardasWidget user={user} />

      <LevelCard level={user.level} orderCount={user.orderCount} />



      <Card>

        <div className="profile-header">

          <h3>Datos personales</h3>

          <button type="button" className="link-btn" onClick={() => setEditing(!editing)}>

            {editing ? 'Cancelar' : 'Editar'}

          </button>

        </div>



        {editing ? (

          <div className="auth-form">

            <label>

              Nombre

              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            </label>

            <label>

              Teléfono

              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            </label>

            <label>

              Cumpleaños

              <input

                type="date"

                className="input"

                value={form.birthday}

                onChange={(e) => setForm({ ...form, birthday: e.target.value })}

              />

            </label>

            {error && <p className="form-error">{error}</p>}

            <Button onClick={handleSave}>Guardar</Button>

          </div>

        ) : (

          <div className="profile-info">

            <p><strong style={{ color: display.color }}>{user.name}</strong></p>

            <p>{user.phone}</p>

            <p>{user.email}</p>

            {user.address && <p>📍 {user.address}</p>}

            {user.birthday && <p>🎂 {formatBirthdayDisplay(user.birthday)}</p>}

            {user.birthdayFreeProductPending && (

              <p className="birthday-pending">🎁 Tienes una bebida gratis pendiente</p>

            )}

          </div>

        )}

      </Card>



      <Card>

        <AddressManager addresses={user.addresses ?? []} onUpdated={() => {}} />

      </Card>



      <BadgeGrid user={user} orders={orders.filter((o) => o.userId === user.id)} />



      <Card className="stats-card">

        <h3>📊 Estadísticas</h3>

        <div className="stats-grid">

          <div className="stat">

            <span className="stat-value">{user.orderCount}</span>

            <span className="stat-label">Pedidos</span>

          </div>

          <div className="stat">

            <span className="stat-value">{favoriteProduct}</span>

            <span className="stat-label">Favorito</span>

          </div>

          <div className="stat">

            <span className="stat-value">{user.level}</span>

            <span className="stat-label">Nivel</span>

          </div>

          <div className="stat">

            <span className="stat-value">{user.streak}🔥</span>

            <span className="stat-label">Racha</span>

          </div>

        </div>

      </Card>



      <Card>

        <h3>🌙 Apariencia</h3>

        <p className="hint">Activa el modo oscuro para una experiencia más cómoda de noche.</p>

        <Button variant="secondary" fullWidth onClick={toggleDarkMode}>

          {darkMode ? '☀️ Modo claro' : '🌙 Modo oscuro'}

        </Button>

      </Card>



      <div className="profile-links profile-links--main">

        <Button variant="secondary" fullWidth onClick={() => navigate('/zardas')}>💎 Zardas</Button>

        <Button variant="secondary" fullWidth onClick={() => navigate('/reviews')}>⭐ Reseñas</Button>

        <Button variant="secondary" fullWidth onClick={() => navigate('/about')}>ℹ️ Sobre nosotros</Button>

      </div>



      <div className="profile-links">

      <Button variant="secondary" fullWidth onClick={() => navigate('/support')}>🆘 Ayuda y soporte</Button>

      <Button variant="secondary" fullWidth onClick={() => navigate('/history')}>📜 Historial</Button>

        <Button variant="secondary" fullWidth onClick={() => navigate('/favorites')}>❤️ Favoritos</Button>

        <Button variant="secondary" fullWidth onClick={() => navigate('/chat')}>💬 Chat con el local</Button>

      </div>



      <Button variant="ghost" fullWidth onClick={() => { logout(); navigate('/'); }}>

        Cerrar sesión

      </Button>

    </div>

  );

}

