import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';

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
}
