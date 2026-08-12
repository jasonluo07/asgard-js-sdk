import { ReactNode } from 'react';
import { TemplateBox, TemplateBoxContent } from '../template-box';
import { ToolCallGroup, ToolCallGroupProps } from './tool-call-group';

// The tool-call group renders as a self-contained bordered panel — unlike chat bubbles it shows no
// avatar.
export function ToolCallGroupTemplate(props: ToolCallGroupProps): ReactNode {
  return (
    <TemplateBox className="asgard-tool-call-group-template" type="bot" direction="vertical">
      <TemplateBoxContent>
        <ToolCallGroup {...props} />
      </TemplateBoxContent>
    </TemplateBox>
  );
}
