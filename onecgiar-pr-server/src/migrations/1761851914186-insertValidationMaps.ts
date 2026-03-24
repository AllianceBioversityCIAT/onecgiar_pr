import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertValidationMaps1761851914186 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM validation_maps WHERE display_name IN (
        'cap-dev-info',
        'evidences',
        'general-information',
        'geographic-location',
        'innovation-dev-info',
        'innovation-use-info',
        'knowledge-product-info',
        'links-to-results',
        'partners',
        'policy-change1-info',
        'theory-of-change'
    );`);
    await queryRunner.query(`INSERT INTO validation_maps (display_name, function_name) VALUES
        ('cap-dev-info', 'capacity_dev'),
        ('evidences', 'evidences'),
        ('general-information', 'general_information'),
        ('geographic-location', 'geo_location'),
        ('innovation-dev-info', 'innovation_dev'),
        ('innovation-use-info', 'innovation_use'),
        ('knowledge-product-info', 'knowledge_product'),
        ('links-to-results', 'link_result'),
        ('partners', 'partners'),
        ('policy-change1-info', 'policy_change'),
        ('theory-of-change', 'toc');`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM validation_maps WHERE display_name IN (
        'cap-dev-info',
        'evidences',
        'general-information',
        'geographic-location',
        'innovation-dev-info',
        'innovation-use-info',
        'knowledge-product-info',
        'links-to-results',
        'partners',
        'policy-change1-info',
        'theory-of-change'
    );`);
  }
}
