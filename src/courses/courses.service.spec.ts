import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
