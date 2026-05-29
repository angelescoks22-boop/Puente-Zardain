import type { UserLevel } from '../../types';
import { getLevelLabel, isZardainLogoAvatar, type ProfileFrame, ZARDAIN_LOGO_SRC } from '../../utils/profile';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

type Props = {
  avatar: string;
  color: string;
  frame?: ProfileFrame;
  size?: Size;
  level?: UserLevel;
  className?: string;
};

export function ProfileAvatar({
  avatar,
  color,
  frame = 'none',
  size = 'md',
  level,
  className = '',
}: Props) {
  const isLogo = isZardainLogoAvatar(avatar);

  return (
    <span className={`profile-avatar-wrap profile-avatar-wrap--${size} ${className}`.trim()}>
      <span
        className={`profile-avatar profile-avatar--${size} profile-avatar-frame--${frame}${isLogo ? ' profile-avatar--logo' : ''}`}
        style={{ background: isLogo ? '#000000' : color }}
      >
        {isLogo ? (
          <img src={ZARDAIN_LOGO_SRC} alt="" className="profile-avatar-img" draggable={false} />
        ) : (
          avatar
        )}
      </span>
      {level && (
        <span className="profile-avatar-level" title={getLevelLabel(level)}>
          {getLevelLabel(level).charAt(0)}
        </span>
      )}
    </span>
  );
}
