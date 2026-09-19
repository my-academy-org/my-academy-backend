import { Injectable } from '@nestjs/common';
import { CreateLandingPageDto } from './dto/create-landing-page.dto.js';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto.js';

@Injectable()
export class LandingPageService {
  create(createLandingPageDto: CreateLandingPageDto) {
    return 'This action adds a new landingPage';
  }

  findAll() {
    return `This action returns all landingPage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} landingPage`;
  }

  update(id: number, updateLandingPageDto: UpdateLandingPageDto) {
    return `This action updates a #${id} landingPage`;
  }

  remove(id: number) {
    return `This action removes a #${id} landingPage`;
  }
}
