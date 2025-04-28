import { BotProviderMetadataResponse } from '../models/bot-provider';

export const annotationSelectorFromBotProviderMetadata = (
  value: BotProviderMetadataResponse
): Record<string, unknown> => {
  return JSON.parse(value.annotations['asgard-ai.com/additional-annotation']);
};
