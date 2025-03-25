export enum FetchSseAction {
  RESET_CHANNEL = 'RESET_CHANNEL',
  NONE = 'NONE',
}

export enum EventType {
  INIT = 'asgard.run.init',
  PROCESS = 'asgard.process',
  PROCESS_START = 'asgard.process.start',
  PROCESS_COMPLETE = 'asgard.process.complete',
  MESSAGE = 'asgard.message',
  MESSAGE_START = 'asgard.message.start',
  MESSAGE_DELTA = 'asgard.message.delta',
  MESSAGE_COMPLETE = 'asgard.message.complete',
  DONE = 'asgard.run.done',
  ERROR = 'asgard.run.error',
}

export enum MessageTemplateType {
  TEXT = 'TEXT',
  HINT = 'HINT',
  BUTTON = 'BUTTON',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  LOCATION = 'LOCATION',
  CAROUSEL = 'CAROUSEL',
}
