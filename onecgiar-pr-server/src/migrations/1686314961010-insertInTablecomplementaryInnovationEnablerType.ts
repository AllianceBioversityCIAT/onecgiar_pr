import { MigrationInterface, QueryRunner } from "typeorm"

export class insertInTablecomplementaryInnovationEnablerType1686314961010 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO complementary_innovation_enabler_types (version_id,complementary_innovation_enabler_types_id,\`group\`,\`type\`,\`level\`) VALUES
            (0,1,'(Bio)physical enablers',NULL,0),
            (0,2,'Policy / organizational or institutional enablers',NULL,0),
            (0,3,'Economic enablers',NULL,0),
            (0,5,'Technological enablers',NULL,0),
            (0,6,'Socio-cultural enablers',NULL,0),
            (0,8,'Access to quality infrastructure',1,1),
            (0,9,'Access to productive assets (e.g. labor)',1,1),
            (0,10,'Agro-climatic conditions/ resilience',1,1),
            (0,11,'Road / transport',8,2),
            (0,12,'Energy / Power',8,2);`
          );

          await queryRunner.query(
               `INSERT INTO prdb.complementary_innovation_enabler_types (version_id,complementary_innovation_enabler_types_id,\`group\`,\`type\`,\`level\`) VALUES
	          (0,13,'Irrigation',8,2),
	          (0,14,'Other',8,2),
	          (0,15,'Policy and legal frameworks (incl. land tenure, by-laws, subsidies)',2,1),
	          (0,16,'Business models (e.g. contract farming, seed business models, etc.)',2,1),
	          (0,17,'Political commitment and investment',2,1),
	          (0,18,'Stakeholder collaboration/ coordination (e.g. innovation platforms, living labs, PPPs)',2,1),
	          (0,19,'Incentive mechanisms',2,1),
	          (0,20,'Functional value chains (incl. trade enablers)',3,1),
	          (0,21,'Access to agri-inputs',3,1),
	          (0,22,'Access to agri-output markets',3,1); `
          );

          await queryRunner.query(`
          INSERT INTO complementary_innovation_enabler_types (version_id,complementary_innovation_enabler_types_id,\`group\`,\`type\`,\`level\`) VALUES
            (0,23,'Access to finance/ investment/ insurance',3,1),
            (0,24,'Quality / quantity seed',21,2),
            (0,25,'Fertilizer',21,2),
            (0,26,'Pest and disease control products',21,2),
            (0,27,'Other',21,2),
            (0,28,'Access to digital information/ communication/ data',5,1),
            (0,29,'Access to mechanization, equipment and tools',5,1),
            (0,30,'Management practices (crop, livestock, etc.)',5,1),
            (0,31,'Public or private extension/ service delivery (non-digital)',6,1),
            (0,32,'Training/ capacity/ knowledge sharing',6,1);`);

            await queryRunner.query(` 
            INSERT INTO complementary_innovation_enabler_types (version_id,complementary_innovation_enabler_types_id,\`group\`,\`type\`,\`level\`) VALUES
            (0,33,'Innovation user trust',6,1),
            (0,34,'Behavioral change',6,1),
            (0,35,'User and consumer preferences/ demand',6,1);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
