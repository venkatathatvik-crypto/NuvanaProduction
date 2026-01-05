import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Create connection pool with pooling parameters optimized for production
    const connectionString = process.env.DATABASE_URL as string;
    
    const pool = new Pool({
      connectionString,
      max: 30, // Maximum number of clients in the pool (increased for production load)
      idleTimeoutMillis: 60000, // Close idle clients after 60 seconds
      connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection cannot be established
    });

    // Log pool errors for better monitoring
    pool.on('error', (err) => {
      this.logger.error('Unexpected pool error:', err);
    });

    const adapter = new PrismaPg(pool);
    
    super({ 
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ Database connected successfully with connection pooling (max: 30 connections)');
        return;
      } catch (error) {
        retries--;
        this.logger.error(`Failed to connect to database. Retries left: ${retries}`, error);
        if (retries === 0) {
          this.logger.warn('⚠️ Could not connect to database after several attempts. Application will continue, but database features will fail.');
        } else {
          // Wait for 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}
