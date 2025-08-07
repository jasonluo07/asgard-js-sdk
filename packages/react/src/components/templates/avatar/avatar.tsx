import { memo, ReactNode } from 'react';
import styles from './avatar.module.scss';
import BotSvg from '../../../icons/bot.svg?react';
import clsx from 'clsx';

interface AvatarProps {
  avatar?: string;
}

export const Avatar = memo((props: AvatarProps): ReactNode => {
  const { avatar } = props;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt="Bot Avatar"
        className={clsx('asgard-avatar', styles.bot_avatar)}
      />
    );
  }

  return (
    <div className={clsx('asgard-avatar', styles.bot_avatar)}>
      <BotSvg />
    </div>
  );
});
