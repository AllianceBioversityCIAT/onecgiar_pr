import { MigrationInterface, QueryRunner } from 'typeorm';

export class insertGlobalParametersAndCategories1700836504238
  implements MigrationInterface
{
  name = 'insertGlobalParametersAndCategories1700836504238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO \`global_parameter_categories\` (name,description) VALUES ('sharepoint',''), ('platform_global_variables',''), ('urls','');`,
    );

    await queryRunner.query(
      `INSERT INTO \`global_parameters\` (name, description, value,global_parameter_category_id)
        VALUES
        ('sp_display_name','Display Name ','',1),
        ('sp_application_id','Application ID','',1),
        ('sp_tenant_id','Tenant ID','',1),
        ('sp_client_secret_id','Client Secret ID','',1),
        ('sp_client_value','Client Value','',1),
        ('sp_grant_type','Grant Type','',1),
        ('sp_scope','Scope','',1),
        ('sp_token_url','Get token Url','',1),
        ('sp_site_id','Site id','',1),
        ('sp_drive_id','Drive id','',1),
        ('sp_microsoft_graph_api_url','Microsoft graph api url','',1),
        ('pgv_in_qa',NULL,'',2),
        ('pgv_ipsr_is_closed',NULL,'',2),
        ('pgv_result_is_closed',NULL,'',2);
        ('pgv_show_global_info',NULL,'',2);
        ('pgv_global_info_message',NULL,'',2);
        `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
