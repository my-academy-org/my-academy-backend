import { Test, TestingModule } from '@nestjs/testing';
import { AcademiesService } from './academies.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AcademiesService', () => {
  let service: AcademiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademiesService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<AcademiesService>(AcademiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
