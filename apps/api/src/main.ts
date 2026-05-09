import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { PrismaService } from "./prisma/prisma.service.js";

function corsOrigin() {
  const configuredOrigin = process.env.CORS_ORIGIN?.trim();

  if (!configuredOrigin || configuredOrigin === "*") {
    return true;
  }

  return configuredOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: corsOrigin(),
      credentials: true,
    },
  });
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);
  app.setGlobalPrefix("");
  await app.listen(Number(process.env.PORT ?? 4000));
}

void bootstrap();
