import { useEffect, useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { ProfileAvatar } from './ProfileAvatar';
import {
  PROFILE_AVATAR_GROUPS,
  PROFILE_COLORS,
  PROFILE_FRAMES,
  getProfileDisplay,
  isZardainLogoAvatar,
  type ProfileFrame,
  ZARDAIN_LOGO_SRC,
} from '../../utils/profile';
import type { User } from '../../types';

type StylePatch = Pick<User, 'profileAvatar' | 'profileColor' | 'profileTagline' | 'profileFrame'>;

type Props = {
  user: User;
  onSave: (patch: Partial<StylePatch>, quiet?: boolean) => Promise<void>;
};

export function ProfileStyleCard({ user, onSave }: Props) {
  const display = getProfileDisplay(user);
  const [tagline, setTagline] = useState(display.tagline);
  const [saving, setSaving] = useState(false);
  const taglineTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setTagline(display.tagline);
  }, [display.tagline]);

  const save = async (patch: Partial<StylePatch>, quiet = false) => {
    setSaving(true);
    try {
      await onSave(patch, quiet);
    } finally {
      setSaving(false);
    }
  };

  const handleTaglineChange = (value: string) => {
    const trimmed = value.slice(0, 60);
    setTagline(trimmed);
    clearTimeout(taglineTimer.current);
    taglineTimer.current = setTimeout(() => {
      if (trimmed !== display.tagline) {
        void save({ profileTagline: trimmed }, true);
      }
    }, 700);
  };

  const handleTaglineBlur = () => {
    clearTimeout(taglineTimer.current);
    if (tagline !== display.tagline) {
      void save({ profileTagline: tagline });
    }
  };

  return (
    <Card className="profile-style-card">
      <div className="profile-style-header">
        <div>
          <h3>Tu estilo</h3>
          <p className="hint">Elige avatar, color y marco. Se guarda al instante.</p>
        </div>
        {saving && <span className="profile-style-saving">Guardando…</span>}
      </div>

      <div className="profile-style-preview">
        <ProfileAvatar
          avatar={display.avatar}
          color={display.color}
          frame={display.frame}
          size="xl"
          level={user.level}
        />
        <div className="profile-style-preview-text">
          <strong style={{ color: display.color }}>{user.name}</strong>
          {tagline ? (
            <p className="profile-tagline">{tagline}</p>
          ) : (
            <p className="hint">Añade una frase que te represente</p>
          )}
        </div>
      </div>

      <label className="profile-tagline-field">
        Frase del perfil
        <input
          className="input"
          value={tagline}
          maxLength={60}
          placeholder="Ej: Fan del doble bacon 🍔"
          onChange={(e) => handleTaglineChange(e.target.value)}
          onBlur={handleTaglineBlur}
        />
        <span className="profile-tagline-count">{tagline.length}/60</span>
      </label>

      {PROFILE_AVATAR_GROUPS.map((group) => (
        <div key={group.label} className="profile-style-section">
          <p className="hint">{group.label}</p>
          <div className="avatar-grid">
            {group.avatars.map((a) => (
              <button
                key={a}
                type="button"
                className={`avatar-option ${display.avatar === a ? 'selected' : ''}${isZardainLogoAvatar(a) ? ' avatar-option--logo' : ''}`}
                onClick={() => void save({ profileAvatar: a })}
                aria-label={isZardainLogoAvatar(a) ? 'Logo Zardain' : `Avatar ${a}`}
              >
                {isZardainLogoAvatar(a) ? (
                  <img src={ZARDAIN_LOGO_SRC} alt="" className="avatar-option-logo" draggable={false} />
                ) : (
                  a
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="profile-style-section">
        <p className="hint">Color de acento</p>
        <div className="color-grid">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-option ${display.color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => void save({ profileColor: c })}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="profile-style-section">
        <p className="hint">Marco del avatar</p>
        <div className="frame-grid">
          {PROFILE_FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`frame-option ${display.frame === f.id ? 'selected' : ''}`}
              onClick={() => void save({ profileFrame: f.id as ProfileFrame })}
            >
              <ProfileAvatar
                avatar={display.avatar}
                color={display.color}
                frame={f.id}
                size="sm"
              />
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
