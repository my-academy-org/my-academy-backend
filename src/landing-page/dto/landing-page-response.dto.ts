import { TemplateType } from '../../../generated/prisma/enums.js';

export class AcademyInfoDto {
  name: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export class TemplateDto {
  type: TemplateType;
  name: string;
}

export class LandingPageDto {
  heroTitle: string | null;
  heroDescription: string | null;
  heroImageUrl: string | null;

  aboutTitle: string | null;
  aboutDescription: string | null;

  instructorName: string | null;
  instructorBio: string | null;
  instructorImage: string | null;
  qualifications: string | null;
  experienceYears: number | null;

  features: unknown;

  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;

  footerText: string | null;
}

export class CourseDto {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
}

export class LandingPageResponseDto {
  tenantId: number;
  academy: AcademyInfoDto;
  template: TemplateDto;
  landingPage: LandingPageDto | null;
  courses: CourseDto[];
}
