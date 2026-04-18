import { Controller, Get, UseGuards } from "@nestjs/common";
import { DemoDomainService } from "../demo/demo-domain.service.js";
import { DemoAuthGuard } from "../common/auth.js";

@Controller("corridors")
@UseGuards(DemoAuthGuard)
export class CorridorsController {
  constructor(private readonly domain: DemoDomainService) {}

  @Get()
  list() {
    return this.domain.listCorridors();
  }
}

