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

    // Validate Supabase URL format
    try {
      const url = new URL(supabaseUrl);
      if (!url.protocol.startsWith('http')) {
        throw new Error(`Invalid SUPABASE_URL protocol: ${url.protocol}. Must be http:// or https://`);
      }
      if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase')) {
        console.warn(`Warning: SUPABASE_URL (${supabaseUrl.substring(0, 50)}...) doesn't appear to be a Supabase URL. Expected format: https://xxxxx.supabase.co`);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid SUPABASE_URL format: "${supabaseUrl}". Must be a valid URL (e.g., https://xxxxx.supabase.co)`);
      }
      throw error;
    }

    // Validate service key format (should be a JWT-like string)
    if (supabaseServiceKey.length < 50) {
      console.warn(`Warning: SUPABASE_SERVICE_ROLE_KEY appears to be too short. Service role keys are typically long JWT strings.`);
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

    try {
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: options?.cacheControl || '3600',
          contentType,
          upsert: options?.upsert || false,
        });

      if (error) {
        // Check for HTML response error (invalid URL or service down)
        if (error.message.includes('Unexpected token') && error.message.includes('<!DOCTYPE')) {
          const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
          throw new Error(
            `Failed to upload file: Supabase returned HTML instead of JSON. ` +
            `This usually means: 1) SUPABASE_URL is incorrect (current: ${supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'not set'}), ` +
            `2) The Supabase project URL is invalid, ` +
            `3) Network/proxy issues, or ` +
            `4) Supabase service is down. ` +
            `Please verify your SUPABASE_URL in .env file matches your Supabase project URL (format: https://xxxxx.supabase.co)`
          );
        }

        // Provide more detailed error message for RLS issues
        if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          throw new Error(
            `Failed to upload file: ${error.message}. ` +
            `Please ensure: 1) SUPABASE_SERVICE_ROLE_KEY is set correctly, ` +
            `2) The bucket '${bucketName}' exists in Supabase, ` +
            `3) RLS policies allow service role access.`
          );
        }

        // Check for bucket not found errors
        if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
          throw new Error(
            `Failed to upload file: Bucket '${bucketName}' not found. ` +
            `Please ensure the bucket exists in your Supabase Storage dashboard. ` +
            `Current bucket name: ${bucketName}`
          );
        }

        throw new Error(`Failed to upload file: ${error.message}`);
      }

      if (!data) {
        throw new Error('Upload succeeded but no data returned');
      }

      return { path: data.path };
    } catch (error) {
      // Re-throw if it's already our custom error
      if (error instanceof Error && error.message.startsWith('Failed to upload file:')) {
        throw error;
      }
      
      // Handle unexpected errors
      if (error instanceof Error) {
        // Check if it's a JSON parse error from Supabase client
        if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
          const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
          throw new Error(
            `Failed to upload file: Invalid response from Supabase. ` +
            `Received HTML instead of JSON. ` +
            `Please verify: 1) SUPABASE_URL is correct (${supabaseUrl ? supabaseUrl.substring(0, 50) + '...' : 'not set'}), ` +
            `2) SUPABASE_SERVICE_ROLE_KEY is valid, ` +
            `3) Network connectivity to Supabase. ` +
            `Original error: ${error.message}`
          );
        }
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      
      throw new Error(`Failed to upload file: Unknown error occurred`);
    }
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

