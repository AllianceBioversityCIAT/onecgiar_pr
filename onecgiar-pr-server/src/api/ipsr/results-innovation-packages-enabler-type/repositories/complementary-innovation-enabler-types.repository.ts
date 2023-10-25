import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource, Repository } from 'typeorm';
import { ComplementaryInnovationEnablerTypes } from '../entities/complementary-innovation-enabler-types.entity';

@Injectable()
export class ComplementaryInnovationEnablerTypesRepository extends Repository<ComplementaryInnovationEnablerTypes> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(
      ComplementaryInnovationEnablerTypes,
      dataSource.createEntityManager(),
    );
  }

  async getAllComplementaryInnovationsType() {
    const comentaryPrincipals: any[] = await this.query(`
        SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
            FROM prdb.complementary_innovation_enabler_types ciet 
                where ciet.type is null and ciet.level = 0;`);

    const comentarySubPrincipals: any[] = await this.query(`
            SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
                    FROM prdb.complementary_innovation_enabler_types ciet 
                        where ciet.level = 1;`);

    const comentarySub: any[] = await this.query(`
            SELECT ciet.complementary_innovation_enabler_types_id, ciet.group, ciet.type 
                    FROM prdb.complementary_innovation_enabler_types ciet 
                        where ciet.level = 2;`);
    comentarySubPrincipals.forEach((elemt) => {
      elemt.subCategories = comentarySub.filter(
        (element) =>
          element.type == elemt.complementary_innovation_enabler_types_id,
      );
    });

    for (let index = 0; index < comentaryPrincipals.length; index++) {
      comentaryPrincipals[index].subCategories = comentarySubPrincipals.filter(
        (element) =>
          element.type ==
          comentaryPrincipals[index].complementary_innovation_enabler_types_id,
      );
    }

    return {
      response: {
        comentaryPrincipals,
      },
      message: 'Sections have been successfully validated',
      status: HttpStatus.OK,
    };
  }
}
