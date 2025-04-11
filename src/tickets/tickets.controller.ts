import { Body, Controller, Get, Post } from '@nestjs/common';
import { Company } from '../../db/models/Company';
import {
  Ticket,
} from '../../db/models/Ticket';
import { User } from '../../db/models/User';
import { newTicketDto } from './tickets.dto';
import { TicketsService } from './tickets.service';


@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  async findAll() {
    const res = await this.ticketsService.findAll();

    return res
  }

  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;
    const res = await this.ticketsService.create(type, companyId);

    return res;
  }
}
