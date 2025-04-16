import { Body, Query, Controller, Get, Post } from '@nestjs/common';
import { findTicketParams, newTicketDto } from './tickets.dto';
import { TicketsService } from './tickets.service';


@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async findAll(@Query() params: findTicketParams) {
    const res = await this.ticketsService.findAll(params.page, params.limit);

    return res
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;
    const res = await this.ticketsService.create(type, companyId);

    return res;
  }
}
