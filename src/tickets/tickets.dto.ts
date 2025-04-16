import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';

export class findTicketParams {
  page: number;
  limit: number;
}

export class newTicketDto {
  @IsEnum(TicketType)
  type: TicketType;

  @IsNumber()
  @IsNotEmpty()
  companyId: number;
}

export class TicketDto {
  id: number;
  type: TicketType;
  companyId: number;
  assigneeId: number;
  status: TicketStatus;
  category: TicketCategory;

  static build(dao: Ticket): TicketDto {
    const ticketDto = new TicketDto();
    ticketDto.id = dao.id;
    ticketDto.type = dao.type;
    ticketDto.companyId = dao.companyId;
    ticketDto.assigneeId = dao.assigneeId;
    ticketDto.status = dao.status;
    ticketDto.category = dao.category;
    return ticketDto;
  }
}
