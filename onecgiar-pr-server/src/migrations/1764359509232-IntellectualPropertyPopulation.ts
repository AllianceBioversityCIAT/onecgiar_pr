import { MigrationInterface, QueryRunner } from "typeorm";

export class IntellectualPropertyPopulation1764359509232 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO intellectual_property_experts
      (is_active, first_name, last_name, email, center_code)
      VALUES
      (true, 'Marcel', 'Nwalozie', 'm.nwalozie@cgiar.org', 'CENTER-01'),
      (true, 'Saidu', 'Bah', 's.bah@cgiar.org', 'CENTER-01'),

      (true, 'David', 'Rodriguez Machado', 'd.r.rodriguez@cgiar.org', 'CENTER-03'),
      (true, 'David', 'Rodriguez Machado', 'd.r.rodriguez@cgiar.org', 'CENTER-02'),

      (true, 'Rusdiati', 'Utami', 'r.utami@cifor-icraf.org', 'CENTER-04'),

      (true, 'Karina', 'Najarro Del Villar', 'k.n.delvillar@cgiar.org', 'CENTER-05'),
      (true, 'Liliana', 'Rojas Campos', 'l.rojas@cgiar.org', 'CENTER-05'),

      (true, 'Yenny', 'Sotomayor', 'yenny.sotomayor@cgiar.org', 'CENTER-06'),
      (true, 'Maria', 'Bellido', 'm.bellido@cgiar.org', 'CENTER-06'),

      (true, 'Sahar Said', 'Ibrahim', 's.ibrahim@cgiar.org', 'CENTER-07'),
      (true, 'Selim', 'Guvener', 's.guvener@cgiar.org', 'CENTER-07'),

      (true, 'Faridah', 'Munyi', 'f.munyi@cifor-icraf.org', 'CENTER-08'),

      (true, 'Sravanti', 'Vedula', 'Sravanti.vedula@icrisat.org', 'CENTER-09'),
      (true, 'Surya Mani', 'Tripathi', 'suryamani.tripathi@icrisat.org', 'CENTER-09'),

      (true, 'Indira', 'Yerramareddy', 'i.yerramareddy@cgiar.org', 'CENTER-10'),

      (true, 'Morenike', 'Abu', 'mo.abu@cgiar.org', 'CENTER-11'),
      (true, 'Precious', 'Adebanjo', 'p.adebanjo@cgiar.org', 'CENTER-11'),
      (true, 'Emmanuel', 'Aluko', 'e.aluko@cgiar.org', 'CENTER-11'),
      (true, 'Ola', 'Oluwatobi', 'o.ola@cgiar.org', 'CENTER-11'),

      (true, 'Eva', 'Kathambana', 'E.Kathambana@cgiar.org', 'CENTER-12'),

      (true, 'Melannie', 'Cabangbang', 'm.cabangbang@cgiar.org', 'CENTER-13'),

      (true, 'Pradeepa', 'Amarasekera', 'P.Amarasekera@cgiar.org', 'CENTER-14'),
      (true, 'Apoorwa', 'Nanayakkara', 'A.Nanayakkara@cgiar.org', 'CENTER-14'),

      (true, 'Su Ching', 'Tan', 'S.Tan@cgiar.org', 'CENTER-15'),

      (true, 'Ana Carolina', 'Roa Rodriguez', 'a.c.rodriguez@cgiar.org', 'CENTER-16');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM intellectual_property_experts
      WHERE email IN (
        'm.nwalozie@cgiar.org',
        's.bah@cgiar.org',
        'd.r.rodriguez@cgiar.org',
        'r.utami@cifor-icraf.org',
        'k.n.delvillar@cgiar.org',
        'l.rojas@cgiar.org',
        'yenny.sotomayor@cgiar.org',
        'm.bellido@cgiar.org',
        's.ibrahim@cgiar.org',
        's.guvener@cgiar.org',
        'f.munyi@cifor-icraf.org',
        'Sravanti.vedula@icrisat.org',
        'suryamani.tripathi@icrisat.org',
        'i.yerramareddy@cgiar.org',
        'mo.abu@cgiar.org',
        'p.adebanjo@cgiar.org',
        'e.aluko@cgiar.org',
        'o.ola@cgiar.org',
        'E.Kathambana@cgiar.org',
        'm.cabangbang@cgiar.org',
        'P.Amarasekera@cgiar.org',
        'A.Nanayakkara@cgiar.org',
        'S.Tan@cgiar.org',
        'a.c.rodriguez@cgiar.org'
      );
    `);
  }

}
