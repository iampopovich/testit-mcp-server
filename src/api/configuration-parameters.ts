import type { TestITApiClient } from "../client.js";

export interface ConfigurationParameterBody {
  name: string;
  values: Array<{ value: string }>;
  projects?: Array<{ id: string }>;
}

/** Returns an envelope {data, totalCount}; nested values/projects are envelopes too. */
export function searchConfigurationParameters(
  client: TestITApiClient,
  body: Record<string, unknown>,
): Promise<{ data: Array<Record<string, unknown>>; totalCount: number }> {
  return client.post("/api/v2/configuration-parameters/search", body);
}

export function getConfigurationParameter(client: TestITApiClient, id: string): Promise<unknown> {
  return client.get(`/api/v2/configuration-parameters/${id}`);
}

export function createConfigurationParameter(
  client: TestITApiClient,
  body: ConfigurationParameterBody,
): Promise<unknown> {
  return client.post("/api/v2/configuration-parameters", body);
}

export function updateConfigurationParameter(
  client: TestITApiClient,
  id: string,
  body: ConfigurationParameterBody,
): Promise<unknown> {
  return client.put(`/api/v2/configuration-parameters/${id}`, body);
}

export function deleteConfigurationParameter(client: TestITApiClient, id: string): Promise<unknown> {
  return client.delete(`/api/v2/configuration-parameters/${id}`);
}
