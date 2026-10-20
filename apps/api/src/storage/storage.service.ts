import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SIGNED_READ_URL_TTL_SECONDS = 60 * 60; // 1 hora

// Bucket privado de imágenes de producto. El frontend nunca ve las
// credenciales: pide signed URLs al backend para subir y leer.
// La imagen es opcional en todo el sistema: sin configurar Supabase,
// los endpoints de producto funcionan igual con imageUrl = null.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: SupabaseClient | null = null;
  private bucket: string;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket =
      this.config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'product-images';
    if (url && key) {
      this.client = createClient(url, key);
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async createSignedUploadUrl(imageKey: string) {
    const client = this.requireClient();
    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUploadUrl(imageKey);
    if (error) {
      this.logger.error(`Supabase createSignedUploadUrl: ${error.message}`);
      throw new ServiceUnavailableException(
        'No se pudo preparar la subida de la imagen. Intente de nuevo.',
      );
    }
    return data;
  }

  async createSignedReadUrl(imageKey: string): Promise<string | null> {
    if (!this.client) return null;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(imageKey, SIGNED_READ_URL_TTL_SECONDS);
    if (error) {
      this.logger.warn(`Supabase createSignedUrl: ${error.message}`);
      return null;
    }
    return data.signedUrl;
  }

  async removeObject(imageKey: string): Promise<void> {
    if (!this.client) return;
    await this.client.storage.from(this.bucket).remove([imageKey]);
  }

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Almacenamiento de imágenes no configurado',
      );
    }
    return this.client;
  }
}
