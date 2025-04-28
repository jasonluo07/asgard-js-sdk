import { ClientConfig } from '@asgard-js/core';

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
    fieldsV1: Record<string, any>;
    subresource: string;
  }>;
};

export const getBotProviderModels = (
  config: ClientConfig
): {
  getAsgardBotProviderMetadata: () => Promise<BotProviderMetadataResponse>;
} => {
  if (!config.botProviderEndpoint) {
    throw new Error('Bot provider endpoint is not defined in the config');
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

  return {
    getAsgardBotProviderMetadata,
  };
};
