import { memo, ReactNode } from 'react';
import styles from './avatar.module.scss';
import BotSvg from 'src/icons/bot.svg?react';

interface AvatarProps {
  avatar?: string;
}

export const Avatar = memo((props: AvatarProps): ReactNode => {
  const { avatar } = props;

  if (avatar) {
    return <img src={avatar} alt="Bot Avatar" className={styles.bot_avatar} />;
  }

  return (
    <div className={styles.bot_avatar}>
      <BotSvg />
    </div>
  );
});
