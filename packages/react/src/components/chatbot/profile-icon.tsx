import { ReactNode } from 'react';
import ProfileSvg from '../../icons/profile.svg?react';

interface ProfileIconProps {
  avatar?: string;
}

export function ProfileIcon(props: ProfileIconProps): ReactNode {
  const { avatar } = props;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt="avatar"
        style={{
          width: 33,
          height: 32,
          borderRadius: '50%',
        }}
      />
    );
  }

  return <ProfileSvg />;
}
