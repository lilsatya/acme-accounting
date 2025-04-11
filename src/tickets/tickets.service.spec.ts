import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../../db/models/Company';
import {
  TicketCategory,
  TicketStatus,
  TicketType,
} from '../../db/models/Ticket';
import { User, UserRole } from '../../db/models/User';
import { DbModule } from '../db.module';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService],
      imports: [DbModule],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', async () => {
    expect(service).toBeDefined();
    expect(typeof service.findAll).toBe('function');
    expect(typeof service.create).toBe('function');
  });

  describe('create', () => {
    describe('managementReport', () => {
      it('creates managementReport ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await service.create(
          TicketType.managementReport,
          company.id,
        );

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple accountants, assign the last one', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });
        const user2 = await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const ticket = await service.create(
          TicketType.managementReport,
          company.id,
        );

        expect(ticket.category).toBe(TicketCategory.accounting);
        expect(ticket.assigneeId).toBe(user2.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there is no accountant, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          service.create(
            TicketType.managementReport,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role accountant to create a ticket`,
          ),
        );
      });
    });

    describe('registrationAddressChange', () => {
      it('creates registrationAddressChange ticket', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        const ticket = await service.create(
          TicketType.registrationAddressChange,
          company.id,
        );

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there is any ongoing registrationAddressChange ticket, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await service.create(
          TicketType.registrationAddressChange,
          company.id,
        );

        await expect(
          service.create(
            TicketType.registrationAddressChange,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Ticket with type registrationAddressChange already exists for company ${company.id}`,
          ),
        );
      });

      it('if there is no secretary, change to director', async () => {
        const company = await Company.create({ name: 'test' });
        const user = await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });

        const ticket = await service.create(
          TicketType.registrationAddressChange,
          company.id,
        );

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are secretary and director, prioritize secretary', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
          createdAt: new Date('2023-01-01'),
        });

        const user = await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
          createdAt: new Date('2023-01-02'),
        });

        const ticket = await service.create(
          TicketType.registrationAddressChange,
          company.id,
        );

        expect(ticket.category).toBe(TicketCategory.corporate);
        expect(ticket.assigneeId).toBe(user.id);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple directors, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });

        await expect(
          service.create(
            TicketType.registrationAddressChange,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role director. Cannot create a ticket`,
          ),
        );
      });

      it('if there are multiple secretaries, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.corporateSecretary,
          companyId: company.id,
        });

        await expect(
          service.create(
            TicketType.registrationAddressChange,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role corporateSecretary. Cannot create a ticket`,
          ),
        );
      });

      it('if there are no secretaries or directors, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          service.create(
            TicketType.registrationAddressChange,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role corporateSecretary,director to create a ticket`,
          ),
        );
      });
    });

    describe('strikeOff', () => {
      it('creates strikeOff ticket', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.accountant,
          companyId: company.id,
        });

        const user = await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });

        await service.create(
          TicketType.managementReport,
          company.id,
        );

        const ticket = await service.create(
          TicketType.strikeOff,
          company.id,
        );

        const listOfExistingTicket = await service.findAll();
        const filtered = listOfExistingTicket.filter((t => t.type === TicketType.managementReport))[0];

        expect(ticket.category).toBe(TicketCategory.management);
        expect(ticket.assigneeId).toBe(user.id);
        expect(filtered.status).toBe(TicketStatus.resolved);
        expect(ticket.status).toBe(TicketStatus.open);
      });

      it('if there are multiple directors, throw', async () => {
        const company = await Company.create({ name: 'test' });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });
        await User.create({
          name: 'Test User',
          role: UserRole.director,
          companyId: company.id,
        });

        await expect(
          service.create(
            TicketType.strikeOff,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Multiple users with role director. Cannot create a ticket`,
          ),
        );
      });

      it('if there are no directors, throw', async () => {
        const company = await Company.create({ name: 'test' });

        await expect(
          service.create(
            TicketType.strikeOff,
            company.id,
          ),
        ).rejects.toEqual(
          new ConflictException(
            `Cannot find user with role director to create a ticket`,
          ),
        );
      });
    });
  });
});
