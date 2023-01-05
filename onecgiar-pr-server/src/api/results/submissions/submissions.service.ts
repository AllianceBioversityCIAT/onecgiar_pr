import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { submissionRepository } from './submissions.repository';
import { ResultRepository } from '../result.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Submission } from './entities/submission.entity';
import { resultValidationRepository } from '../results-validation-module/results-validation-module.repository';

@Injectable()
export class SubmissionsService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _submissionRepository: submissionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultValidationRepository: resultValidationRepository

  ){}

  async submitFunction(resultId: number, user: TokenDto, createSubmissionDto: CreateSubmissionDto){
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const isValid = await this._resultValidationRepository.resultIsValid(result.id);

      if(!isValid){
        throw {
          response: {},
          message: 'This result cannot be submit, sections are missing to complete',
          status: HttpStatus.NOT_ACCEPTABLE,
        };
      }

      const data = await this._resultRepository.update(result.id, {status: 1});
      let newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = true;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);
      return {
        response: data,
        message: 'the result has been submitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async unsubmitFunction(resultId: number, user: TokenDto, createSubmissionDto: CreateSubmissionDto){
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!createSubmissionDto?.comment) {
        throw {
          response: {},
          message: 'No justification provided',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const data = await this._resultRepository.update(result.id, {status: 0});
      let newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = false;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);
      return {
        response: data,
        message: 'the result has been unsubmitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  create(createSubmissionDto: CreateSubmissionDto) {
    return 'This action adds a new submission';
  }

  findAll() {
    return `This action returns all submissions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} submission`;
  }

  update(id: number, updateSubmissionDto: UpdateSubmissionDto) {
    return `This action updates a #${id} submission`;
  }

  remove(id: number) {
    return `This action removes a #${id} submission`;
  }
}
