import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TenantsService {
  constructor(private readonly prismaService: PrismaService) {}

async create(createTenantDto: CreateTenantDto, templateId: string) {
  try {
    const tenant = await this.prismaService.tenant.create({
      data: {
        name: createTenantDto.name,
        slug: createTenantDto.slug,
        plan: createTenantDto.plan,

        academy: {
          create: {
            name: createTenantDto.name,

            template: {
              connect: {
                id: Number(templateId),
              },
            },
          },
        },
      },

      include: {
        academy: {
          include: {
            template: true,
          },
        },
      },
    });

    return {
      message: 'Tenant and academy created successfully',
      tenant,
    };
  } catch (error) {
    console.error(error);
    throw new BadRequestException('Failed to create tenant and academy');
  }
}

  findOne(id: number) {
    return `This action returns a #${id} tenant`;
  }

  update(id: number, updateTenantDto: UpdateTenantDto) {
    return `This action updates a #${id} tenant`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenant`;
  }
}
