import { ReactNode, useMemo, useState } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { Avatar } from '../avatar';
import styles from './chart-template.module.scss';
import { ConversationBotMessage } from '@asgard-js/core';
import { Time } from '../time';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { ChartMessageTemplate } from '../../../../../core/src';
import { VegaLite, VisualizationSpec } from 'react-vega';
import clsx from 'clsx';
import classes from './chart-template.module.scss';

interface ChartTemplateProps {
  message: ConversationBotMessage;
}

export function ChartTemplate(props: ChartTemplateProps): ReactNode {
  const { message } = props;
  const template = message.message.template as ChartMessageTemplate;

  const { avatar } = useAsgardContext();

  const [option, setOption] = useState(
    template?.defaultChart ?? template?.chartOptions?.[0]?.type
  );

  const spec = useMemo<VisualizationSpec>(
    () =>
      template?.chartOptions?.find((item) => item.type === option)
        ?.spec as VisualizationSpec,
    [option, template.chartOptions]
  );

  const options = template.chartOptions;

  return (
    <TemplateBox type="bot" direction="vertical">
      <Avatar avatar={avatar} />
      <div className={clsx(classes.text, classes['text--bot'])} style={styles}>
        <div>{template.title}</div>
        <div>{template.description}</div>
      </div>
      <div className={styles.quick_replies_box}>
        {options.map((option) => (
          <button
            key={option.type}
            className={styles.quick_reply}
            onClick={() => setOption(option.type)}
          >
            {option.title}
          </button>
        ))}
      </div>
      <TemplateBoxContent quickReplies={template?.quickReplies}>
        <VegaLite data={template.data} spec={spec} />
      </TemplateBoxContent>
      <Time className={styles.chart_time} time={message.time} />
    </TemplateBox>
  );
}
