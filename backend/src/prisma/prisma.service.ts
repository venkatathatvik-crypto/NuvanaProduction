import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Connector, IpAddressTypes, AuthTypes } from '@google-cloud/cloud-sql-connector';

let _connector: Connector | null = null;

async function createPool(): Promise<Pool> {
  const instanceConnectionName = process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME;
  if (!instanceConnectionName) {
    throw new Error('CLOUD_SQL_INSTANCE_CONNECTION_NAME is required but not set');
  }

  _connector = new Connector();
  const clientOpts = await _connector.getOptions({
    instanceConnectionName,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.PASSWORD,
  });
  return new Pool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 30,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
  });
}

export async function createPrismaService(): Promise<PrismaService> {
  const pool = await createPool();
  const adapter = new PrismaPg(pool);
  return new PrismaService(pool, adapter);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly pool: Pool, adapter: PrismaPg) {
    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    let retries = 5;
    const startTime = Date.now();
    this.logger.log(`🚀 Initializing Database connection (Attempt 1/5)...`);

    this.pool.on('error', (err) => {
      this.logger.error('❌ Pool error:', err.message);
    });

    while (retries > 0) {
      try {
        const attemptStart = Date.now();
        await this.$connect();
        const duration = Date.now() - attemptStart;
        const mode = _connector ? 'Cloud SQL Connector' : 'direct connection';
        this.logger.log(`✅ Database connected via ${mode} in ${duration}ms with connection pooling (max: 30 connections)`);
        return;
      } catch (error) {
        retries--;
        const elapsed = (Date.now() - startTime) / 1000;
        this.logger.error(`❌ Failed to connect (Attempt ${5 - retries}/5). Elapsed: ${elapsed.toFixed(1)}s`);
        this.logger.error(`❌ Error: ${error.message}`);

        if (retries === 0) {
          this.logger.warn('⚠️ Could not connect after 5 attempts. Database features will fail.');
        } else {
          this.logger.log('⏳ Retrying in 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    if (_connector) {
      _connector.close();
      _connector = null;
    }
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
