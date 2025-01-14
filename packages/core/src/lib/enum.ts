export enum FetchSSEAction {
  RESET_CHANNEL = 'RESET_CHANNEL',
  NONE = 'NONE',
}

export enum EventType {
  INIT = 'asgard.run.init',
  MESSAGE_START = 'asgard.message.start',
  MESSAGE_DELTA = 'asgard.message.delta',
  MESSAGE_COMPLETE = 'asgard.message.complete',
  DONE = 'asgard.run.done',
}

export enum MessageTemplateType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  LOCATION = 'LOCATION',
}
