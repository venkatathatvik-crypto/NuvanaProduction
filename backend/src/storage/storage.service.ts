import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private readonly filesBucket: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    }

    // Create Supabase client with service role key to bypass RLS
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    // Use single bucket for all files (audio, video, PDFs)
    this.filesBucket = this.configService.get<string>('SUPABASE_FILES_BUCKET') || 'FILES_BUCKET';
  }

  /**
   * Upload a file to Supabase storage
   * Uses single FILES_BUCKET for all file types (audio, video, PDFs)
   */
  async uploadFile(
    bucket: 'files' | 'voice_notes',
    filePath: string,
    file: Buffer,
    contentType: string,
    options?: { cacheControl?: string; upsert?: boolean }
  ): Promise<{ path: string }> {
    // Use single bucket for all file types
    const bucketName = this.filesBucket;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType,
        upsert: options?.upsert || false,
      });

    if (error) {
      // Provide more detailed error message for RLS issues
      if (error.message.includes('row-level security') || error.message.includes('RLS')) {
        throw new Error(
          `Failed to upload file: ${error.message}. ` +
          `Please ensure: 1) SUPABASE_SERVICE_ROLE_KEY is set correctly, ` +
          `2) The bucket '${bucketName}' exists in Supabase, ` +
          `3) RLS policies allow service role access.`
        );
      }
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned');
    }

    return { path: data.path };
  }

  /**
   * Get public URL for a file
   * Uses single FILES_BUCKET for all file types
   */
  getPublicUrl(bucket: 'files' | 'voice_notes', filePath: string): string {
    // Use single bucket for all file types
    const bucketName = this.filesBucket;
    const { data } = this.supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * Delete a file from Supabase storage
   * Uses single FILES_BUCKET for all file types
   */
  async deleteFile(
    bucket: 'files' | 'voice_notes',
    filePath: string
  ): Promise<void> {
    // Use single bucket for all file types
    const bucketName = this.filesBucket;

    const { error } = await this.supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

