import { Body, HttpException, ConflictException, Controller, Get, Post } from '@nestjs/common';
const { Op } = require('sequelize');
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { newTicketDto, TicketDto } from './tickets.dto';


const TicketTypeMappingToCategory = {
  [TicketType.managementReport]: TicketCategory.accounting,
  [TicketType.registrationAddressChange]: TicketCategory.corporate,
  [TicketType.strikeOff]: TicketCategory.management,
}

const TicketCategoryMappingToRoles = {
  [TicketCategory.accounting]: UserRole.accountant,
  [TicketCategory.corporate]: UserRole.corporateSecretary,
  [TicketCategory.management]: UserRole.director,
}

@Controller('api/v1/tickets')
export class TicketsController {
  @Get()
  async findAll() {
    return await Ticket.findAll({ include: [Company, User] });
  }

  // TODO: move dto to common, and use service module for separation of concerns, based on ticket type
  @Post()
  async create(@Body() newTicketDto: newTicketDto) {
    const { type, companyId } = newTicketDto;

    try {
      if (type === TicketType.registrationAddressChange) {
        const existingTicket = await Ticket.findOne({
          where: { companyId, type, status: TicketStatus.open },
        })

        if (existingTicket)
          throw new ConflictException(
            `Ticket with type ${type} already exists for company ${companyId}`,
          );
      }

      const category = TicketTypeMappingToCategory[type];
      const userRole = TicketCategoryMappingToRoles[category];

      let assignees = await User.findAll({
        where: { companyId, role: userRole},
        order: [['createdAt', 'DESC']],
      });

      if (!assignees.length && category === TicketCategory.corporate) {
        assignees = await User.findAll({
          where: { companyId, role: UserRole.director},
          order: [['createdAt', 'DESC']],
        });
      }

      if (!assignees.length) {
        throw new HttpException(
          `Cannot find user with role ${userRole} to create a ticket`,
          404
        );
      }
      
      let assignee = assignees[0];
      if (assignees.length > 1 && type !== TicketType.managementReport) {
        throw new ConflictException(
            `Multiple users with role ${userRole}. Cannot create a ticket`,
          );
      }

      const ticket = await Ticket.create({
        companyId,
        assigneeId: assignee.id,
        category,
        type,
        status: TicketStatus.open,
      });

      if (type === TicketType.strikeOff) {
        await Ticket.update(
          { status: TicketStatus.resolved },
          { where: { companyId, status: TicketStatus.open, type: {
            [Op.ne]: TicketType.strikeOff,
          }}}
        );
      }

      const ticketDto: TicketDto = {
        id: ticket.id,
        type: ticket.type,
        assigneeId: ticket.assigneeId,
        status: ticket.status,
        category: ticket.category,
        companyId: ticket.companyId,
      };

      return ticketDto;

    } catch (error) {
      throw error;
    }
  }
}
