import { MigrationInterface, QueryRunner } from 'typeorm';

export class bigChangeInDatabase1688498737949 implements MigrationInterface {
  name = 'bigChangeInDatabase1688498737949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` DROP FOREIGN KEY \`FK_8306466aef994a3e1346645563b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` DROP FOREIGN KEY \`FK_e23e1ec0ab2d53c5f02d858549c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions_budget\` DROP FOREIGN KEY \`FK_e284436427133a3d72d92c96317\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_030b9938e0e50a182205ba0d322\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP FOREIGN KEY \`FK_3816658291ea652e70e301db1be\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_5e6fe1c7d103c1dac94d3142f6a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP FOREIGN KEY \`FK_dd2fb5aafb98e06c3e61f61f749\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_157a2cef4b40e04e814de706cf5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_region\` DROP FOREIGN KEY \`FK_5d6f88e9ad16eaaab4cd2ab2a1e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries_sub_national\` DROP FOREIGN KEY \`FK_c01ebd6213f7ee1c06ff28c7a1a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country\` DROP FOREIGN KEY \`FK_5e91e009ff0f7b1266d959d64aa\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_actors\` DROP FOREIGN KEY \`FK_1dab9b7fceb52f93f69ce5bbb29\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_1e8239f94ef47fc1d5082a6f553\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_eoi_outcomes\` DROP FOREIGN KEY \`FK_2f8501c89baaddae679140d3a2c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_action_area_outcome\` DROP FOREIGN KEY \`FK_60fbcf902b48f673576a60a6251\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_acc40e6b5fb3746e235618093b4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiative_budget\` DROP FOREIGN KEY \`FK_645f70263b533adde1ff6e52e3f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_64714f53816392407e30ec0aa6f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_f1de1facdda4959b91d9085a88b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_institution_types\` DROP FOREIGN KEY \`FK_1af713d39be6c0935829c829c11\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_measures\` DROP FOREIGN KEY \`FK_586dfce83aaea4f2c522aff61fc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP FOREIGN KEY \`FK_bd436cbd72d34f1be8e61e51966\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_e316887d99495a701e7f68d30f3\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP FOREIGN KEY \`FK_5c57453edc10a775036dd2f2124\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_report\` DROP FOREIGN KEY \`FK_bef087d503eb67c6d679ed1a5f7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_impact_area_target\` DROP FOREIGN KEY \`FK_bb83bcf794fd3564526e7876748\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expertises\` DROP FOREIGN KEY \`FK_4976585652ceb2f3e0390068c9c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expert\` DROP FOREIGN KEY \`FK_a1b1bef8267aa7ae1232f61d144\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_measure\` DROP FOREIGN KEY \`FK_7dd28026f8b335844eeb77800e4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovation\` DROP FOREIGN KEY \`FK_4550aee4458fbb9b3a5e606dba0\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovations_function\` DROP FOREIGN KEY \`FK_e4752cc7cc870f330b0aa483bc7\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_10e4a92a8dcdf201c59cd37fa7d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`linked_result\` DROP FOREIGN KEY \`FK_3e54da5d7ceb315e386fc3a7158\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_projetct_budget\` DROP FOREIGN KEY \`FK_15c85e2230379a1ee6c9c622c7f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_2c75f37a5180edcc80c3da36df2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP FOREIGN KEY \`FK_ed32ac35727cd95c9f5dfb2b5d5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_879032c813e625f92bfbca87dc1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_55bca184237100f0ef8cc8fb0ea\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_target\` DROP FOREIGN KEY \`FK_e2d045bcad4f04a0227c9e9b404\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_indicators\` DROP FOREIGN KEY \`FK_c36f5eae67871a6f2a0d88055b9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_4d46ef3eec64ae4bbdf0688b7a4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use_measures\` DROP FOREIGN KEY \`FK_b3661483d2b6e269d030f30c65d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_e7eef5d06d8f5db94933566427b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_e7bbbc6476884ee2e2a655f3df5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_fcc7e47ef3f168812c8b4bd2ca8\``,
    );
    await queryRunner.query(
      `DROP INDEX \`FK_454bdc19227ad6a58d5ddfbaf7e\` ON \`result\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_keywords\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_region\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries_sub_national\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_actors\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_eoi_outcomes\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_action_area_outcome\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiative_budget\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expert_workshop_organized\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_package\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_sdg_targets\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_institution_types\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_measures\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_innovation_enabler_types\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_report\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_impact_area_target\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expertises\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expert\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_measure\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovation\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovations_function\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`linked_result\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_project\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_center\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_target\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_indicators\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use_measures\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`version_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_policy_changes\` DROP COLUMN \`version_id\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_policy_changes\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_dev\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_capacity_developments\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use_measures\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_indicators\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_target\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_center\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_project\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_projetct_budget\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`linked_result\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovations_function\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovation\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_measure\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expert\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expertises\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_impact_area_target\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_report\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_by_innovation_package\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_innovation_enabler_types\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_measures\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_institution_types\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_sdg_targets\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_package\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expert_workshop_organized\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiative_budget\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_action_area_outcome\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_eoi_outcomes\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_actors\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries_sub_national\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_region\` ADD \`version_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_keywords\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions_budget\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` ADD \`version_id\` bigint NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`FK_454bdc19227ad6a58d5ddfbaf7e\` ON \`result\` (\`reported_year_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_fcc7e47ef3f168812c8b4bd2ca8\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_e7bbbc6476884ee2e2a655f3df5\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_e7eef5d06d8f5db94933566427b\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use_measures\` ADD CONSTRAINT \`FK_b3661483d2b6e269d030f30c65d\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_4d46ef3eec64ae4bbdf0688b7a4\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_indicators\` ADD CONSTRAINT \`FK_c36f5eae67871a6f2a0d88055b9\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_impact_area_target\` ADD CONSTRAINT \`FK_e2d045bcad4f04a0227c9e9b404\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_55bca184237100f0ef8cc8fb0ea\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_879032c813e625f92bfbca87dc1\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_evidence\` ADD CONSTRAINT \`FK_ed32ac35727cd95c9f5dfb2b5d5\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_2c75f37a5180edcc80c3da36df2\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_pooled_projetct_budget\` ADD CONSTRAINT \`FK_15c85e2230379a1ee6c9c622c7f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`linked_result\` ADD CONSTRAINT \`FK_3e54da5d7ceb315e386fc3a7158\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_10e4a92a8dcdf201c59cd37fa7d\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovations_function\` ADD CONSTRAINT \`FK_e4752cc7cc870f330b0aa483bc7\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_complementary_innovation\` ADD CONSTRAINT \`FK_4550aee4458fbb9b3a5e606dba0\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_measure\` ADD CONSTRAINT \`FK_7dd28026f8b335844eeb77800e4\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expert\` ADD CONSTRAINT \`FK_a1b1bef8267aa7ae1232f61d144\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_expertises\` ADD CONSTRAINT \`FK_4976585652ceb2f3e0390068c9c\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_impact_area_target\` ADD CONSTRAINT \`FK_bb83bcf794fd3564526e7876748\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`platform_report\` ADD CONSTRAINT \`FK_bef087d503eb67c6d679ed1a5f7\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`template\` ADD CONSTRAINT \`FK_5c57453edc10a775036dd2f2124\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_e316887d99495a701e7f68d30f3\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD CONSTRAINT \`FK_bd436cbd72d34f1be8e61e51966\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_measures\` ADD CONSTRAINT \`FK_586dfce83aaea4f2c522aff61fc\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_institution_types\` ADD CONSTRAINT \`FK_1af713d39be6c0935829c829c11\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_f1de1facdda4959b91d9085a88b\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_64714f53816392407e30ec0aa6f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_initiative_budget\` ADD CONSTRAINT \`FK_645f70263b533adde1ff6e52e3f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_acc40e6b5fb3746e235618093b4\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_action_area_outcome\` ADD CONSTRAINT \`FK_60fbcf902b48f673576a60a6251\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_eoi_outcomes\` ADD CONSTRAINT \`FK_2f8501c89baaddae679140d3a2c\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_1e8239f94ef47fc1d5082a6f553\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_ip_result_actors\` ADD CONSTRAINT \`FK_1dab9b7fceb52f93f69ce5bbb29\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country\` ADD CONSTRAINT \`FK_5e91e009ff0f7b1266d959d64aa\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_countries_sub_national\` ADD CONSTRAINT \`FK_c01ebd6213f7ee1c06ff28c7a1a\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_region\` ADD CONSTRAINT \`FK_5d6f88e9ad16eaaab4cd2ab2a1e\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_157a2cef4b40e04e814de706cf5\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD CONSTRAINT \`FK_dd2fb5aafb98e06c3e61f61f749\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_5e6fe1c7d103c1dac94d3142f6a\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_mqap_institutions\` ADD CONSTRAINT \`FK_3816658291ea652e70e301db1be\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_030b9938e0e50a182205ba0d322\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_institutions_budget\` ADD CONSTRAINT \`FK_e284436427133a3d72d92c96317\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_authors\` ADD CONSTRAINT \`FK_e23e1ec0ab2d53c5f02d858549c\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_kp_altmetrics\` ADD CONSTRAINT \`FK_8306466aef994a3e1346645563b\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
