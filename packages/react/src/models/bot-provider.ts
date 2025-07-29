import { ClientConfig } from '@jasonluo07/asgard-js-core';
import { annotationSelectorFromBotProviderMetadata } from '../utils/selectors';

export type BotProviderMetadataResponse = {
  name: string;
  namespace: string;
  uid: string;
  resourceVersion: string;
  generation: number;
  creationTimestamp: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  managedFields: Array<{
    manager: string;
    operation: string;
    apiVersion: string;
    time: string;
    fieldsType: string;
    fieldsV1: Record<string, unknown>;
    subresource: string;
  }>;
};

const stubGetAsgardBotProviderMetadata =
  async (): Promise<BotProviderMetadataResponse> => {
    return {
      name: '',
      namespace: '',
      uid: '',
      resourceVersion: '0',
      generation: 0,
      creationTimestamp: new Date().toISOString(),
      labels: {},
      annotations: {
        'asgard-ai.com/additional-annotation': JSON.stringify({
          embedConfig: {
            theme: {
              chatbot: {},
              botMessage: {},
              userMessage: {},
            },
          },
        }),
      },
      managedFields: [],
    };
  };

const stubGetAnnotations = async (): Promise<Record<string, unknown>> => {
  const metadata = await stubGetAsgardBotProviderMetadata();

  return annotationSelectorFromBotProviderMetadata(metadata);
};

export const getBotProviderModels = (
  config: ClientConfig
): {
  getAsgardBotProviderMetadata: () => Promise<BotProviderMetadataResponse>;
  getAnnotations: () => Promise<Record<string, unknown>>;
} => {
  if (!config.botProviderEndpoint) {
    // eslint-disable-next-line no-console
    console.warn(
      '[getBotProviderModels] botProviderEndpoint is not defined in config. ' +
        'Bot provider features will be disabled. Consider providing botProviderEndpoint for full functionality.'
    );

    return {
      getAsgardBotProviderMetadata: stubGetAsgardBotProviderMetadata,
      getAnnotations: stubGetAnnotations,
    };
  }

  const headers: Record<string, string> = {};

  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  async function getAsgardBotProviderMetadata(): Promise<BotProviderMetadataResponse> {
    const response = await fetch(`${config.botProviderEndpoint}/metadata`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const json: { data: BotProviderMetadataResponse } = await response.json();

    return json.data;
  }

  async function getAnnotations(): Promise<Record<string, unknown>> {
    const metadata = await getAsgardBotProviderMetadata();

    return annotationSelectorFromBotProviderMetadata(metadata);
  }

  return {
    getAsgardBotProviderMetadata,
    getAnnotations,
  };
};
