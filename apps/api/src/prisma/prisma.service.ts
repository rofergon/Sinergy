import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (process.env.FUNDING_PERSISTENCE_MODE === "memory") {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    if (process.env.FUNDING_PERSISTENCE_MODE === "memory") {
      return;
    }
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });
  }
}
