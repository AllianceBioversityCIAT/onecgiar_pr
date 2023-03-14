import { Injectable } from '@nestjs/common';
import { CreateInnovationPathwayDto } from './dto/create-innovation-pathway.dto';
import { UpdateInnovationPathwayDto } from './dto/update-innovation-pathway.dto';

@Injectable()
export class InnovationPathwayService {
  create(createInnovationPathwayDto: CreateInnovationPathwayDto) {
    return 'This action adds a new innovationPathway';
  }

  findAll() {
    return `This action returns all innovationPathway`;
  }

  findOne(id: number) {
    return `This action returns a #${id} innovationPathway`;
  }

  update(id: number, updateInnovationPathwayDto: UpdateInnovationPathwayDto) {
    return `This action updates a #${id} innovationPathway`;
  }

  remove(id: number) {
    return `This action removes a #${id} innovationPathway`;
  }
}
