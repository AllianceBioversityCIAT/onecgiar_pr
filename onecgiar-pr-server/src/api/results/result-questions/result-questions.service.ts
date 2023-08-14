import { Injectable } from '@nestjs/common';
import { CreateResultQuestionDto } from './dto/create-result-question.dto';
import { UpdateResultQuestionDto } from './dto/update-result-question.dto';

@Injectable()
export class ResultQuestionsService {
  create(createResultQuestionDto: CreateResultQuestionDto) {
    return 'This action adds a new resultQuestion';
  }

  findAll() {
    return `This action returns all resultQuestions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultQuestion`;
  }

  update(id: number, updateResultQuestionDto: UpdateResultQuestionDto) {
    return `This action updates a #${id} resultQuestion`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultQuestion`;
  }
}
