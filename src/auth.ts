export interface TokenManagerOptions {
  baseUrl: string;
  apiToken: string;
}

export class TokenManager {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(options: TokenManagerOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiToken = options.apiToken;
  }

  async getAccessToken(): Promise<string> {
    return this.apiToken;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
