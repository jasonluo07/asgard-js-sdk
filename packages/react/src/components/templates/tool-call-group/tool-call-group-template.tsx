import { ReactNode } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { ToolCallGroup, ToolCallGroupProps } from './tool-call-group';

interface ToolCallGroupTemplateProps extends ToolCallGroupProps {
  time?: Date;
}

// The tool-call group renders as a self-contained bordered panel — unlike chat bubbles it shows no
// avatar or timestamp. `time` stays in the props (the custom renderToolCallGroup callback still
// receives it), but the default template does not display it.
export function ToolCallGroupTemplate(props: ToolCallGroupTemplateProps): ReactNode {
  const { time: _time, ...toolCallGroupProps } = props;

  return (
    <TemplateBox className="asgard-tool-call-group-template" type="bot" direction="vertical">
      <TemplateBoxContent>
        <ToolCallGroup {...toolCallGroupProps} />
      </TemplateBoxContent>
    </TemplateBox>
  );
}
