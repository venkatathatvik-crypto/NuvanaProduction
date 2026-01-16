import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL as string;
    const preSuperLogger = new Logger(PrismaService.name);
    
    if (!connectionString) {
      preSuperLogger.error('❌ DATABASE_URL is not defined in environment variables!');
    } else {
      try {
        const url = new URL(connectionString.replace('postgresql://', 'http://')); // URL parser trick
        preSuperLogger.log(`🔍 Attempting to connect to DB host: ${url.hostname}`);
        preSuperLogger.log(`🔍 Database name: ${url.pathname.split('/')[1]}`);
        preSuperLogger.log(`🔍 SSL Mode: ${url.searchParams.get('sslmode') || 'not set'}`);
      } catch (e) {
        preSuperLogger.warn('⚠️ Could not parse DATABASE_URL for logging, but proceeding with connection attempt.');
      }
    }
    
    const pool = new Pool({
      connectionString,
      max: 30, // Maximum number of clients in the pool (increased for production load)
      idleTimeoutMillis: 60000, // Close idle clients after 60 seconds
      connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection cannot be established
    });

    const adapter = new PrismaPg(pool);
    
    super({ 
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });

    // NOW we can use this.logger
    pool.on('error', (err) => {
      this.logger.error('❌ Unexpected pool error:', err);
      if (err.message.includes('ENOTFOUND')) {
        this.logger.error('🔍 DIAGNOSIS: DNS Resolution failed. The system cannot find the database host.');
      }
    });
  }

  async onModuleInit() {
    let retries = 5;
    const startTime = Date.now();
    this.logger.log(`🚀 Initializing Database connection (Attempt 1/5)...`);
    
    while (retries > 0) {
      try {
        const attemptStart = Date.now();
        await this.$connect();
        const duration = Date.now() - attemptStart;
        this.logger.log(`✅ Database connected successfully in ${duration}ms with connection pooling (max: 30 connections)`);
        return;
      } catch (error) {
        retries--;
        const elapsed = (Date.now() - startTime) / 1000;
        this.logger.error(`❌ Failed to connect to database (Attempt ${5 - retries}/5). Elapsed: ${elapsed.toFixed(1)}s`);
        this.logger.error(`❌ Error Message: ${error.message}`);
        
        if (error.message.includes('ENOTFOUND')) {
          this.logger.error('🔍 DIAGNOSIS: DNS Resolution Failure. Your machine cannot resolve the database hostname.');
        } else if (error.message.includes('ECONNREFUSED')) {
          this.logger.error('🔍 DIAGNOSIS: Connection Refused. The database server is reachable but rejecting connections.');
        } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
          this.logger.error('🔍 DIAGNOSIS: Connection Timeout. Network is slow or firewall is blocking the port.');
        }

        if (retries === 0) {
          this.logger.warn('⚠️ Could not connect to database after 5 attempts. Application will continue, but database features will fail.');
        } else {
          this.logger.log('⏳ Retrying in 2 seconds...');
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
