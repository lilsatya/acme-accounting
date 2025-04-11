import { HttpException, HttpStatus, ConflictException, Injectable } from '@nestjs/common';
const { Op } = require('sequelize');
import { Company } from '../../db/models/Company';
import {
  Ticket,
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { TicketDto } from './tickets.dto';

@Injectable()
export class TicketsService {
  private async createManagementReportTicket(companyId: number): Promise<TicketDto> {
    const type = TicketType.managementReport;
    const userRole = UserRole.accountant;
    const category = TicketCategory.accounting;

    const assignee = await User.findOne({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    if (assignee == null) {
      throw new HttpException(
        `Cannot find user with role ${userRole} to create a ticket`,
        HttpStatus.NOT_FOUND,
      );
    }

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });

    return TicketDto.build(ticket);
  }

  private async createRegistrationAddressChangeTicket(companyId: number): Promise<TicketDto> {
    const type = TicketType.registrationAddressChange;
    const userRole = [UserRole.corporateSecretary, UserRole.director];
    const category = TicketCategory.corporate;

    const existingTicket = await Ticket.findOne({
      where: { companyId, type, status: TicketStatus.open },
    })

    if (existingTicket)
      throw new ConflictException(
        `Ticket with type ${type} already exists for company ${companyId}`,
      );

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    const secretaries = assignees.filter((u) => u.role === UserRole.corporateSecretary);
    const directors = assignees.filter((u) => u.role === UserRole.director);

    if (secretaries.length === 0 && directors.length === 0) {
      throw new HttpException(
        `Cannot find user with role ${userRole} to create a ticket`,
        HttpStatus.NOT_FOUND,
      );
    }
    const assignee = secretaries[0] || directors[0];

    if (secretaries.length > 1) {
      throw new ConflictException(
      `Multiple users with role ${UserRole.corporateSecretary}. Cannot create a ticket`,
      );
    }

    if (directors.length > 1) {
      throw new ConflictException(
      `Multiple users with role ${UserRole.director}. Cannot create a ticket`,
      );
    }    

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });

    return TicketDto.build(ticket);;
  }

  private async createStrikeOffTicket(companyId: number): Promise<TicketDto> {
    const type = TicketType.strikeOff;
    const userRole = UserRole.director;
    const category = TicketCategory.management;

    const assignees = await User.findAll({
      where: { companyId, role: userRole },
      order: [['createdAt', 'DESC']],
    });

    if (!assignees.length) {
      throw new HttpException(
        `Cannot find user with role ${userRole} to create a ticket`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (assignees.length > 1) {
      throw new ConflictException(
      `Multiple users with role ${userRole}. Cannot create a ticket`,
      );
    }
    
    const assignee = assignees[0];

    const ticket = await Ticket.create({
      companyId,
      assigneeId: assignee.id,
      category,
      type,
      status: TicketStatus.open,
    });

    await Ticket.update(
      { status: TicketStatus.resolved },
      { where: { companyId, status: TicketStatus.open, type: {
        [Op.ne]: TicketType.strikeOff,
      }}}
    );

    return TicketDto.build(ticket);
  }

  async findAll(): Promise<TicketDto[]> {
    const tickets = await Ticket.findAll({
      include: [Company, User],
    });

    return tickets.map((ticket) => TicketDto.build(ticket));
  }

  async create(type: TicketType, companyId: number): Promise<TicketDto> {
    try {
      switch (type) {
        case TicketType.managementReport:
          return await this.createManagementReportTicket(companyId);
        case TicketType.registrationAddressChange:
          return await this.createRegistrationAddressChangeTicket(companyId);
        case TicketType.strikeOff:
          return await this.createStrikeOffTicket(companyId);
        default:
          throw new HttpException(
            `Ticket type ${type} not supported`,
            HttpStatus.NOT_IMPLEMENTED,
          );
      }

    } catch (error) {
      throw error;
    }
  }
}
