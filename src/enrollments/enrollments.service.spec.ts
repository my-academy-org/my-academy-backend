import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsService } from './enrollments.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnrollmentsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
