import { MigrationInterface, QueryRunner } from 'typeorm';

export class insertDiscontinuedOptions1690914910764
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
            insert into investment_discontinued_option (\`option\`) values ('No or limited progress in improving the readiness of the innovation.'), 
            ('The innovation lead and/or team took up new responsibilities.'), 
            ('Limited Initiative resource availability required deprioritization of the innovation.'), 
            ('Limited bilateral co-investment required deprioritization of the innovation.'),
            ('Absence of strong demand and scaling partners for the innovation.'),
            ('Other');`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
