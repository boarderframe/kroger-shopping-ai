import { KrogerApiClient } from './client';
import { UserProfile } from '../types/kroger';

export class IdentityApi {
  constructor(private client: KrogerApiClient) {}

  async getUserProfile(accessToken: string): Promise<UserProfile> {
    const response = await this.client.get<{ data: UserProfile }>(
      '/identity/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  }
}