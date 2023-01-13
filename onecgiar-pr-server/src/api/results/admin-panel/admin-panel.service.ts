import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateAdminPanelDto } from './dto/create-admin-panel.dto';
import { UpdateAdminPanelDto } from './dto/update-admin-panel.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { AdminPanelRepository } from './admin-panel.repository';

@Injectable()
export class AdminPanelService {

  constructor(
    private _handlersError: HandlersError,
    private _adminPanelRepository: AdminPanelRepository
  ){}

  create(createAdminPanelDto: CreateAdminPanelDto) {
    return 'This action adds a new adminPanel';
  }

  async reportResultCompleteness() {
    try {
      const results =  await this._adminPanelRepository.reportResultCompleteness();
      return {
        response: results,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async submissionsByResults(resultId: number) {
    try {
      const submissions =  await this._adminPanelRepository.submissionsByResults(resultId);
      return {
        response: submissions,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async userReport() {
    try {
      const users =  await this._adminPanelRepository.userReport();
      return {
        response: users,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} adminPanel`;
  }

  update(id: number, updateAdminPanelDto: UpdateAdminPanelDto) {
    return `This action updates a #${id} adminPanel`;
  }

  remove(id: number) {
    return `This action removes a #${id} adminPanel`;
  }
}
