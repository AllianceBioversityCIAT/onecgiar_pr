-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
-- -----------------------------------------------------
-- Schema prdb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema prdb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `prdb` DEFAULT CHARACTER SET utf8mb3 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`result_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`result_types` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`gender_tag_levels`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`gender_tag_levels` (
  `id` BIGINT NOT NULL,
  `title` VARCHAR(45) NULL,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`users` (
  `id` BIGINT NOT NULL,
  `first_name` VARCHAR(200) NULL,
  `last_name` VARCHAR(200) NULL,
  `email` VARCHAR(100) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`versions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`versions` (
  `id` BIGINT NOT NULL,
  `version_name` VARCHAR(45) NOT NULL,
  `start_date` VARCHAR(45) NULL,
  `end_date` VARCHAR(45) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`years`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`years` (
  `year` INT NOT NULL,
  `active` TINYINT NOT NULL DEFAULT 1,
  `start_date` TIMESTAMP NULL,
  `end_date` TIMESTAMP NULL,
  PRIMARY KEY (`year`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`result_levels`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`result_levels` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`legacy_indicators_list`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`legacy_indicators_list` (
  `legacy_id` VARCHAR(50) NOT NULL,
  `indicator_type` VARCHAR(50) NULL,
  `year` INT NULL,
  `CRP` VARCHAR(50) NULL,
  `title` VARCHAR(1500) NULL,
  `description` TEXT NULL,
  `geo_scope` TEXT NULL,
  `detail_link` VARCHAR(2000) NULL,
  `is_migrated` TINYINT NULL,
  PRIMARY KEY (`legacy_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`climate_tag_levels`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`climate_tag_levels` (
  `id` BIGINT NOT NULL,
  `title` VARCHAR(45) NULL,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`geographic_scopes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`geographic_scopes` (
  `geographic_scope_id` BIGINT NOT NULL,
  `name` VARCHAR(50) NULL,
  `Description` VARCHAR(2000) NULL,
  PRIMARY KEY (`geographic_scope_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results` (
  `id` BIGINT NOT NULL,
  `title` VARCHAR(45) NOT NULL,
  `description` TEXT NULL,
  `reported_year_id` INT NOT NULL,
  `result_level_id` BIGINT NOT NULL,
  `result_type_id` VARCHAR(20) NOT NULL,
  `gender_tag_level_id` BIGINT NULL,
  `climate_tag_levels_id` BIGINT NULL,
  `legacy_indicators_list_id` VARCHAR(50) NULL,
  `is_krs` TINYINT NULL,
  `krs_link` VARCHAR(2000) NULL,
  `geographic_scope_id` BIGINT NOT NULL,
  `has_countries` TINYINT NULL,
  `has_regions` TINYINT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  `status` TINYINT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_results_result_types1`
    FOREIGN KEY (`result_type_id`)
    REFERENCES `mydb`.`result_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_gender_tag_level1`
    FOREIGN KEY (`gender_tag_level_id`)
    REFERENCES `mydb`.`gender_tag_levels` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_current_year1`
    FOREIGN KEY (`reported_year_id`)
    REFERENCES `mydb`.`years` (`year`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_result_levels1`
    FOREIGN KEY (`result_level_id`)
    REFERENCES `mydb`.`result_levels` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_legacy_indicators_list1`
    FOREIGN KEY (`legacy_indicators_list_id`)
    REFERENCES `mydb`.`legacy_indicators_list` (`legacy_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_climate_tag_levels1`
    FOREIGN KEY (`climate_tag_levels_id`)
    REFERENCES `mydb`.`climate_tag_levels` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_geographic_scopes1`
    FOREIGN KEY (`geographic_scope_id`)
    REFERENCES `mydb`.`geographic_scopes` (`geographic_scope_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_result_types1_idx` ON `mydb`.`results` (`result_type_id` ASC) VISIBLE;

CREATE INDEX `fk_results_gender_tag_level1_idx` ON `mydb`.`results` (`gender_tag_level_id` ASC) VISIBLE;

CREATE INDEX `fk_results_users1_idx` ON `mydb`.`results` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_users2_idx` ON `mydb`.`results` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_versions1_idx` ON `mydb`.`results` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_current_year1_idx` ON `mydb`.`results` (`reported_year_id` ASC) VISIBLE;

CREATE INDEX `fk_results_result_levels1_idx` ON `mydb`.`results` (`result_level_id` ASC) VISIBLE;

CREATE INDEX `fk_results_legacy_indicators_list1_idx` ON `mydb`.`results` (`legacy_indicators_list_id` ASC) VISIBLE;

CREATE INDEX `fk_results_climate_tag_levels1_idx` ON `mydb`.`results` (`climate_tag_levels_id` ASC) VISIBLE;

CREATE INDEX `fk_results_geographical_scope1_idx` ON `mydb`.`results` ( ASC) VISIBLE;

CREATE INDEX `fk_results_geographic_scopes1_idx` ON `mydb`.`results` (`geographic_scope_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`action_areas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`action_areas` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(50) NULL,
  `description` VARCHAR(45) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`inititiatives`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`inititiatives` (
  `id` BIGINT NOT NULL,
  `official_code` VARCHAR(45) NULL,
  `name` VARCHAR(500) NULL,
  `short_name` VARCHAR(100) NULL,
  `action_area_id` BIGINT NULL,
  `toc_id` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_inititiatives_action_areas1`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `mydb`.`action_areas` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_inititiatives_action_areas1_idx1` ON `mydb`.`inititiatives` (`action_area_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`initiative_roles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`initiative_roles` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL COMMENT 'Owner/Contributor',
  `description` VARCHAR(45) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_by_inititiatives`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_inititiatives` (
  `result_initiative_id` BIGINT(20) NOT NULL,
  `inititiative_id` BIGINT NOT NULL,
  `initiative_role_id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL DEFAULT sysdate(),
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`result_initiative_id`),
  CONSTRAINT `fk_results_by_inititiatives_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_inititiatives_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_inititiatives_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_inititiatives_initiative_roles1`
    FOREIGN KEY (`initiative_role_id`)
    REFERENCES `mydb`.`initiative_roles` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_inititiatives_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_inititiatives_inititiatives1`
    FOREIGN KEY (`inititiative_id`)
    REFERENCES `mydb`.`inititiatives` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_inititiatives_users2_idx` ON `mydb`.`results_by_inititiatives` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_users1_idx` ON `mydb`.`results_by_inititiatives` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_versions1_idx` ON `mydb`.`results_by_inititiatives` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_initiative_roles1_idx` ON `mydb`.`results_by_inititiatives` (`initiative_role_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_results1_idx` ON `mydb`.`results_by_inititiatives` (`results_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_inititiatives1_idx` ON `mydb`.`results_by_inititiatives` (`inititiative_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`institution_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`institution_types` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(45) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`institutions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`institutions` (
  `id` BIGINT NOT NULL,
  `name` TEXT NULL,
  `acronym` VARCHAR(45) NULL,
  `website_link` VARCHAR(255) NULL,
  `institution_type_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_institutions_institution_types1`
    FOREIGN KEY (`institution_type_id`)
    REFERENCES `mydb`.`institution_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_institutions_institution_types1_idx` ON `mydb`.`institutions` (`institution_type_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`institution_roles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`institution_roles` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(50) NULL COMMENT 'Actor/Partner',
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_by_institutions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_institutions` (
  `id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `institutions_id` INT NOT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_results_has_institutions_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_has_institutions_institutions1`
    FOREIGN KEY (`institutions_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_institution_roles1`
    FOREIGN KEY (`institution_roles_id`)
    REFERENCES `mydb`.`institution_roles` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_has_institutions_institutions1_idx` ON `mydb`.`results_by_institutions` (`institutions_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institutions_results1_idx` ON `mydb`.`results_by_institutions` (`results_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_institution_roles1_idx` ON `mydb`.`results_by_institutions` (`institution_roles_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_users1_idx` ON `mydb`.`results_by_institutions` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_users2_idx` ON `mydb`.`results_by_institutions` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_versions1_idx` ON `mydb`.`results_by_institutions` (`version_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_by_institutions_idx` ON `mydb`.`results_by_institutions` (`results_id` ASC, `institutions_id` ASC, `institution_roles_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_by_institution_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_institution_types` (
  `result_by_institution_id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `institution_types_id` BIGINT NOT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `creation_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`result_by_institution_id`),
  CONSTRAINT `fk_results_has_institution_types_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_has_institution_types_institution_types1`
    FOREIGN KEY (`institution_types_id`)
    REFERENCES `mydb`.`institution_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_institution_roles1`
    FOREIGN KEY (`institution_roles_id`)
    REFERENCES `mydb`.`institution_roles` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_has_institution_types_institution_types1_idx` ON `mydb`.`results_by_institution_types` (`institution_types_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institution_types_results1_idx` ON `mydb`.`results_by_institution_types` (`results_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_institution_roles1_idx` ON `mydb`.`results_by_institution_types` (`institution_roles_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_users1_idx` ON `mydb`.`results_by_institution_types` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_users2_idx` ON `mydb`.`results_by_institution_types` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_versions1_idx` ON `mydb`.`results_by_institution_types` (`version_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_results_by_institution_types_idx` ON `mydb`.`results_by_institution_types` (`results_id` ASC, `institution_types_id` ASC, `institution_roles_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`evidences`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`evidences` (
  `id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `link` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `gender_related` TINYINT NOT NULL,
  `youth_related` TINYINT NOT NULL,
  `knowledge_product_related` BIGINT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_evidences_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_evidences_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_evidences_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_evidences_result_evidence_id`
    FOREIGN KEY (`knowledge_product_related`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_evidences_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_evidences_versions1_idx` ON `mydb`.`evidences` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_evidences_users1_idx` ON `mydb`.`evidences` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_evidences_users2_idx` ON `mydb`.`evidences` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_evidences_result_evidence_id_idx` ON `mydb`.`evidences` (`knowledge_product_related` ASC) VISIBLE;

CREATE INDEX `fk_evidences_results1_idx` ON `mydb`.`evidences` (`result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_by_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_level` (
  `result_types_id` BIGINT NOT NULL,
  `result_levels_id` BIGINT NOT NULL,
  PRIMARY KEY (`result_types_id`, `result_levels_id`),
  CONSTRAINT `fk_results_by_level_result_types1`
    FOREIGN KEY (`result_types_id`)
    REFERENCES `mydb`.`result_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_level_result_levels1`
    FOREIGN KEY (`result_levels_id`)
    REFERENCES `mydb`.`result_levels` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_level_result_levels1_idx` ON `mydb`.`results_by_level` (`result_levels_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`partner_delivery_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`partner_delivery_types` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(500) NOT NULL,
  `is_active` TINYINT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_by_institutions_by_deliveries_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_institutions_by_deliveries_types` (
  `result_inst_by_deliv_id` BIGINT NOT NULL,
  `partner_delivery_type_id` BIGINT NOT NULL,
  `result_by_institution_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` VARCHAR(45) NULL,
  PRIMARY KEY (`result_inst_by_deliv_id`),
  CONSTRAINT `fk_results_by_institutions_by deliveries_types_partner_delive1`
    FOREIGN KEY (`partner_delivery_type_id`)
    REFERENCES `mydb`.`partner_delivery_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_results_by_ins1`
    FOREIGN KEY (`result_by_institution_id`)
    REFERENCES `mydb`.`results_by_institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_versions1`
    FOREIGN KEY (`versions_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_institutions_by deliveries_types_partner_deli_idx` ON `mydb`.`results_by_institutions_by_deliveries_types` (`partner_delivery_type_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_results_by_i_idx` ON `mydb`.`results_by_institutions_by_deliveries_types` (`result_by_institution_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_users1_idx` ON `mydb`.`results_by_institutions_by_deliveries_types` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_users2_idx` ON `mydb`.`results_by_institutions_by_deliveries_types` (`last_updated_by` ASC) INVISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_versions1_idx` ON `mydb`.`results_by_institutions_by_deliveries_types` (`versions_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_by_institutions_by_deliveries_types_idx` ON `mydb`.`results_by_institutions_by_deliveries_types` (`partner_delivery_type_id` ASC, `result_by_institution_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`geographic_scopes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`geographic_scopes` (
  `geographic_scope_id` BIGINT NOT NULL,
  `name` VARCHAR(50) NULL,
  `Description` VARCHAR(2000) NULL,
  PRIMARY KEY (`geographic_scope_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_institutions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_institutions` (
  `result_institution_id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `institutions_id` INT NOT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL DEFAULT NULL,
  `last_updated_date` DATE NULL DEFAULT NULL,
  PRIMARY KEY (`result_institution_id`),
  CONSTRAINT `fk_results_has_institutions_institutions1`
    FOREIGN KEY (`institutions_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_institution_roles1`
    FOREIGN KEY (`institution_roles_id`)
    REFERENCES `mydb`.`institution_roles` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_has_institutions_institutions1_idx` ON `mydb`.`results_institutions` (`institutions_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institutions_results1_idx` ON `mydb`.`results_institutions` (`results_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_institution_roles1_idx` ON `mydb`.`results_institutions` (`institution_roles_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_users1_idx` ON `mydb`.`results_institutions` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_users2_idx` ON `mydb`.`results_institutions` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_versions1_idx` ON `mydb`.`results_institutions` (`version_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_by_institutions_idx` ON `mydb`.`results_institutions` (`results_id` ASC, `institutions_id` ASC, `institution_roles_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institutions_results1` ON `mydb`.`results_institutions` (`results_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institutions_institutions1` ON `mydb`.`results_institutions` (`institutions_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_institution_roles1` ON `mydb`.`results_institutions` (`institution_roles_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_users1` ON `mydb`.`results_institutions` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_users2` ON `mydb`.`results_institutions` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_versions1` ON `mydb`.`results_institutions` (`version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_institution_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_institution_types` (
  `result_institution_type_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `institution_type_id` BIGINT NOT NULL,
  `institution_role_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `creation_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL DEFAULT NULL,
  `last_updated_date` DATE NULL DEFAULT NULL,
  PRIMARY KEY (`result_institution_type_id`),
  CONSTRAINT `fk_results_has_institution_types_institution_types1`
    FOREIGN KEY (`institution_type_id`)
    REFERENCES `mydb`.`institution_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_institution_roles1`
    FOREIGN KEY (`institution_role_id`)
    REFERENCES `mydb`.`institution_roles` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institution_types_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_has_institution_types_institution_types1_idx` ON `mydb`.`results_institution_types` (`institution_type_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institution_types_results1_idx` ON `mydb`.`results_institution_types` (`result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_institution_roles1_idx` ON `mydb`.`results_institution_types` (`institution_role_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_users1_idx` ON `mydb`.`results_institution_types` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_users2_idx` ON `mydb`.`results_institution_types` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_versions1_idx` ON `mydb`.`results_institution_types` (`version_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_by_institution_types_idx` ON `mydb`.`results_institution_types` (`result_id` ASC, `institution_type_id` ASC, `institution_role_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institution_types_results1` ON `mydb`.`results_institution_types` (`result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_has_institution_types_institution_types1` ON `mydb`.`results_institution_types` (`institution_type_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_institution_roles1` ON `mydb`.`results_institution_types` (`institution_role_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_users1` ON `mydb`.`results_institution_types` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_users2` ON `mydb`.`results_institution_types` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institution_types_versions1` ON `mydb`.`results_institution_types` (`version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_level` (
  `result_level_id` BIGINT NOT NULL,
  `result_types_id` BIGINT NOT NULL,
  `result_levels_id` BIGINT NOT NULL,
  `is_active` TINYINT NULL DEFAULT NULL,
  PRIMARY KEY (`result_level_id`))
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_level_result_levels1_idx` ON `mydb`.`results_level` (`result_levels_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_level_result_types1` ON `mydb`.`results_level` (`result_types_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_level_result_levels1` ON `mydb`.`results_level` (`result_levels_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_institutions_delivery_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_institutions_delivery_types` (
  `result_inst_dlv_type_id` BIGINT NOT NULL,
  `partner_delivery_type_id` BIGINT NOT NULL,
  `result_by_institution_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL DEFAULT NULL,
  `last_updated_date` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`result_inst_dlv_type_id`),
  CONSTRAINT `fk_results_by_institutions_by deliveries_types_partner_delive1`
    FOREIGN KEY (`partner_delivery_type_id`)
    REFERENCES `mydb`.`partner_delivery_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_results_by_ins1`
    FOREIGN KEY (`result_by_institution_id`)
    REFERENCES `mydb`.`results_institutions` (`result_institution_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_institutions_by_deliveries_types_versions1`
    FOREIGN KEY (`versions_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_institutions_by deliveries_types_partner_deli_idx` ON `mydb`.`results_institutions_delivery_types` (`partner_delivery_type_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_results_by_i_idx` ON `mydb`.`results_institutions_delivery_types` (`result_by_institution_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_users1_idx` ON `mydb`.`results_institutions_delivery_types` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_users2_idx` ON `mydb`.`results_institutions_delivery_types` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_versions1_idx` ON `mydb`.`results_institutions_delivery_types` (`versions_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_result_by_institutions_by_delivery_types` ON `mydb`.`results_institutions_delivery_types` (`partner_delivery_type_id` ASC, `result_by_institution_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by deliveries_types_partner_delive1` ON `mydb`.`results_institutions_delivery_types` (`partner_delivery_type_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_results_by_ins1` ON `mydb`.`results_institutions_delivery_types` (`result_by_institution_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_users1` ON `mydb`.`results_institutions_delivery_types` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_users2` ON `mydb`.`results_institutions_delivery_types` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_institutions_by_deliveries_types_versions1` ON `mydb`.`results_institutions_delivery_types` (`versions_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`centers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`centers` (
  `center_id` BIGINT NOT NULL,
  `institution_id` BIGINT NOT NULL,
  `financial_code` VARCHAR(45) NULL,
  PRIMARY KEY (`center_id`),
  CONSTRAINT `fk_centers_institutions2`
    FOREIGN KEY (`institution_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_centers_institutions1_idx` ON `mydb`.`centers` (`institutions_id` ASC) VISIBLE;

CREATE INDEX `fk_centers_institutions1` ON `mydb`.`centers` (`institutions_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`non_pooled_projects`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`non_pooled_projects` (
  `non_pooled_project_id` BIGINT NOT NULL,
  `grant_title` VARCHAR(500) NULL,
  `center_grant_id` VARCHAR(45) NULL,
  `results_id` BIGINT NOT NULL,
  `lead_center_id` BIGINT NOT NULL,
  `funder_institution_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`non_pooled_project_id`),
  CONSTRAINT `fk_table1_users11`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users21`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions11`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_non_pooled_projects_centers2`
    FOREIGN KEY (`lead_center_id`)
    REFERENCES `mydb`.`centers` (`center_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_non_pooled_projects_institutions2`
    FOREIGN KEY (`funder_institution_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_non_pooled_projects_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_non_pooled_projects_institutions1_idx` ON `mydb`.`non_pooled_projects` (`funder` ASC) VISIBLE;

CREATE INDEX `fk_non_pooled_projects_centers1_idx` ON `mydb`.`non_pooled_projects` (`lead_center` ASC) VISIBLE;

CREATE INDEX `fk_non_pooled_projects_institutions1` ON `mydb`.`non_pooled_projects` (`funder` ASC) VISIBLE;

CREATE INDEX `fk_non_pooled_projects_centers1` ON `mydb`.`non_pooled_projects` (`lead_center` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`regions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`regions` (
  `region_id` BIGINT NOT NULL,
  `um49code` VARCHAR(45) NULL,
  `name` VARCHAR(100) NULL,
  `parent_region_id` BIGINT NOT NULL,
  PRIMARY KEY (`region_id`),
  CONSTRAINT `fk_regions_regions2`
    FOREIGN KEY (`parent_region_id`)
    REFERENCES `mydb`.`regions` (`region_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_regions_regions1_idx` ON `mydb`.`regions` (`parent_region_id` ASC) VISIBLE;

CREATE INDEX `fk_regions_regions1` ON `mydb`.`regions` (`parent_region_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_regions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_regions` (
  `result_region_id` BIGINT NOT NULL,
  `region_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `created_by` BIGINT NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_region_id`),
  CONSTRAINT `fk_results_regions_regions1`
    FOREIGN KEY (`region_id`)
    REFERENCES `mydb`.`regions` (`region_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_versions1`
    FOREIGN KEY (`versions_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_regions_regions1_idx` ON `mydb`.`results_regions` (`region_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_regions_results1_idx` ON `mydb`.`results_regions` (`result_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_by_regions_idx` ON `mydb`.`results_regions` (`region_id` ASC, `result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_regions_regions1` ON `mydb`.`results_regions` (`region_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_regions_results1` ON `mydb`.`results_regions` (`result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`countries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`countries` (
  `country_id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `iso_alpha2` VARCHAR(2) NULL,
  `iso_alpha3` VARCHAR(3) NULL,
  PRIMARY KEY (`country_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_countries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_countries` (
  `result_country_id` BIGINT NOT NULL,
  `country_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`result_country_id`),
  CONSTRAINT `fk_results_cuntries_countries1`
    FOREIGN KEY (`country_id`)
    REFERENCES `mydb`.`countries` (`country_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_cuntries_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_countries_versions1`
    FOREIGN KEY (`versions_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_countries_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_countries_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_by_countries_countries1_idx` ON `mydb`.`results_countries` (`country_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_countries_results1_idx` ON `mydb`.`results_countries` (`result_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_by_countries_idx` ON `mydb`.`results_countries` (`result_id` ASC, `country_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_countries_countries1` ON `mydb`.`results_countries` (`country_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_countries_results1` ON `mydb`.`results_countries` (`result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`countries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`countries` (
  `country_id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `iso_alpha2` VARCHAR(2) NULL,
  `iso_alpha3` VARCHAR(3) NULL,
  PRIMARY KEY (`country_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`regions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`regions` (
  `region_id` BIGINT NOT NULL,
  `um49code` VARCHAR(45) NULL,
  `name` VARCHAR(100) NULL,
  `parent_region_id` BIGINT NOT NULL,
  PRIMARY KEY (`region_id`),
  CONSTRAINT `fk_regions_regions2`
    FOREIGN KEY (`parent_region_id`)
    REFERENCES `mydb`.`regions` (`region_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_regions_regions2_idx` ON `mydb`.`regions` (`parent_region_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_regions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_regions` (
  `result_region_id` BIGINT NOT NULL,
  `region_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `created_by` BIGINT NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_region_id`),
  CONSTRAINT `fk_results_regions_regions1`
    FOREIGN KEY (`region_id`)
    REFERENCES `mydb`.`regions` (`region_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_regions_versions1`
    FOREIGN KEY (`versions_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_regions_regions1_idx` ON `mydb`.`results_regions` (`region_id` ASC) VISIBLE;

CREATE INDEX `fk_results_regions_results1_idx` ON `mydb`.`results_regions` (`result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_regions_users1_idx` ON `mydb`.`results_regions` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_regions_users2_idx` ON `mydb`.`results_regions` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_regions_versions1_idx` ON `mydb`.`results_regions` (`versions_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_countries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_countries` (
  `result_country_id` BIGINT NOT NULL,
  `country_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`result_country_id`),
  CONSTRAINT `fk_results_cuntries_countries1`
    FOREIGN KEY (`country_id`)
    REFERENCES `mydb`.`countries` (`country_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_cuntries_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_countries_versions1`
    FOREIGN KEY (`versions_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_countries_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_countries_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_cuntries_countries1_idx` ON `mydb`.`results_countries` (`country_id` ASC) VISIBLE;

CREATE INDEX `fk_results_cuntries_results1_idx` ON `mydb`.`results_countries` (`result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_countries_versions1_idx` ON `mydb`.`results_countries` (`versions_id` ASC) VISIBLE;

CREATE INDEX `fk_results_countries_users1_idx` ON `mydb`.`results_countries` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_countries_users2_idx` ON `mydb`.`results_countries` (`last_updated_by` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`example`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`example` (
  `id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_table1_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_table1_users1_idx` ON `mydb`.`example` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_users2_idx` ON `mydb`.`example` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`example` (`version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`linked_results`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`linked_results` (
  `linked_result_id` VARCHAR(45) NOT NULL,
  `origin_result_id` BIGINT NOT NULL,
  `dest_result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`linked_result_id`),
  CONSTRAINT `fk_table1_users10`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users20`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions10`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_linked_results_results1`
    FOREIGN KEY (`origin_result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_linked_results_results2`
    FOREIGN KEY (`dest_result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_table1_users1_idx` ON `mydb`.`linked_results` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_users2_idx` ON `mydb`.`linked_results` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`linked_results` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_linked_results_results1_idx` ON `mydb`.`linked_results` (`origin_result_id` ASC) VISIBLE;

CREATE INDEX `fk_linked_results_results2_idx` ON `mydb`.`linked_results` (`dest_result_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_linked_results_idx` ON `mydb`.`linked_results` (`origin_result_id` ASC, `dest_result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`centers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`centers` (
  `center_id` BIGINT NOT NULL,
  `institution_id` BIGINT NOT NULL,
  `financial_code` VARCHAR(45) NULL,
  PRIMARY KEY (`center_id`),
  CONSTRAINT `fk_centers_institutions2`
    FOREIGN KEY (`institution_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_centers_institutions2_idx` ON `mydb`.`centers` (`institution_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`non_pooled_projects`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`non_pooled_projects` (
  `non_pooled_project_id` BIGINT NOT NULL,
  `grant_title` VARCHAR(500) NULL,
  `center_grant_id` VARCHAR(45) NULL,
  `results_id` BIGINT NOT NULL,
  `lead_center_id` BIGINT NOT NULL,
  `funder_institution_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`non_pooled_project_id`),
  CONSTRAINT `fk_table1_users11`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users21`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions11`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_non_pooled_projects_centers2`
    FOREIGN KEY (`lead_center_id`)
    REFERENCES `mydb`.`centers` (`center_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_non_pooled_projects_institutions2`
    FOREIGN KEY (`funder_institution_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_non_pooled_projects_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_table1_users1_idx` ON `mydb`.`non_pooled_projects` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_users2_idx` ON `mydb`.`non_pooled_projects` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`non_pooled_projects` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_non_pooled_projects_centers2_idx` ON `mydb`.`non_pooled_projects` (`lead_center_id` ASC) VISIBLE;

CREATE INDEX `fk_non_pooled_projects_institutions2_idx` ON `mydb`.`non_pooled_projects` (`funder_institution_id` ASC) VISIBLE;

CREATE INDEX `fk_non_pooled_projects_results1_idx` ON `mydb`.`non_pooled_projects` (`results_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`toc_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`toc_level` (
  `toc_level_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(2000) NULL,
  PRIMARY KEY (`toc_level_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`initiatives_work_packages`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`initiatives_work_packages` (
  `work_package_id` INT NOT NULL,
  `inititiative_id` BIGINT NOT NULL,
  `work_package_oficial_code` BIGINT NULL,
  `name` VARCHAR(100) NULL,
  `short_name` VARCHAR(20) NULL,
  PRIMARY KEY (`work_package_id`),
  CONSTRAINT `fk_initiatives_work_packages_inititiatives1`
    FOREIGN KEY (`inititiative_id`)
    REFERENCES `mydb`.`inititiatives` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_initiatives_work_packages_inititiatives1_idx` ON `mydb`.`initiatives_work_packages` (`inititiative_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`toc_results`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`toc_results` (
  `toc_result_id` BIGINT NOT NULL,
  `toc_internal_id` VARCHAR(100) NULL,
  `title` VARCHAR(100) NULL,
  `description` VARCHAR(2000) NULL,
  `toc_level_id` BIGINT NOT NULL,
  `toc_type_id` BIGINT NOT NULL,
  `inititiative_id` BIGINT NOT NULL,
  `work_package_id` INT NOT NULL,
  PRIMARY KEY (`toc_result_id`),
  CONSTRAINT `fk_toc_results_toc_level1`
    FOREIGN KEY (`toc_level_id`)
    REFERENCES `mydb`.`toc_level` (`toc_level_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_toc_results_inititiatives1`
    FOREIGN KEY (`inititiative_id`)
    REFERENCES `mydb`.`inititiatives` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_toc_results_initiatives_work_packages1`
    FOREIGN KEY (`work_package_id`)
    REFERENCES `mydb`.`initiatives_work_packages` (`work_package_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_toc_results_toc_level1_idx` ON `mydb`.`toc_results` (`toc_level_id` ASC) VISIBLE;

CREATE INDEX `fk_toc_results_inititiatives1_idx` ON `mydb`.`toc_results` (`inititiative_id` ASC) VISIBLE;

CREATE INDEX `fk_toc_results_initiatives_work_packages1_idx` ON `mydb`.`toc_results` (`work_package_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`action_area_outcomes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`action_area_outcomes` (
  `action_area_id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(45) NULL,
  PRIMARY KEY (`action_area_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_toc_results`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_toc_results` (
  `result_toc_result_id` VARCHAR(45) NOT NULL,
  `toc_result_id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `action_area_outcome_id` BIGINT NOT NULL,
  `planned_result` TINYINT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_toc_result_id`),
  CONSTRAINT `fk_table1_users12`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users22`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions12`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_toc_results_toc_results1`
    FOREIGN KEY (`toc_result_id`)
    REFERENCES `mydb`.`toc_results` (`toc_result_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_toc_results_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_toc_results_action_area_outcomes1`
    FOREIGN KEY (`action_area_outcome_id`)
    REFERENCES `mydb`.`action_area_outcomes` (`action_area_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_table1_users1_idx` ON `mydb`.`results_toc_results` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_users2_idx` ON `mydb`.`results_toc_results` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`results_toc_results` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_toc_results_toc_results1_idx` ON `mydb`.`results_toc_results` (`toc_result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_toc_results_results1_idx` ON `mydb`.`results_toc_results` (`results_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_results_toc_results_idx` ON `mydb`.`results_toc_results` (`toc_result_id` ASC, `results_id` ASC, `action_area_outcome_id` ASC) VISIBLE;

CREATE INDEX `fk_results_toc_results_action_area_outcomes1_idx` ON `mydb`.`results_toc_results` (`action_area_outcome_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_centers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_centers` (
  `result_center_id` BIGINT NOT NULL,
  `is_primary` TINYINT NOT NULL,
  `center_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_center_id`),
  CONSTRAINT `fk_table1_users13`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users23`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions13`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_centers_centers1`
    FOREIGN KEY (`center_id`)
    REFERENCES `mydb`.`centers` (`center_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_centers_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_table1_users1_idx` ON `mydb`.`results_centers` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_users2_idx` ON `mydb`.`results_centers` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`results_centers` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_centers_centers1_idx` ON `mydb`.`results_centers` (`center_id` ASC) VISIBLE;

CREATE INDEX `fk_results_centers_results1_idx` ON `mydb`.`results_centers` (`result_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_centers_idx` ON `mydb`.`results_centers` (`center_id` ASC, `result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`impact_areas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`impact_areas` (
  `impact_area_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(2000) NULL,
  PRIMARY KEY (`impact_area_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`impact_area_indicators`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`impact_area_indicators` (
  `impact_area_indicator_id` BIGINT NOT NULL,
  `smo_code` VARCHAR(20) NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(2000) NULL,
  `target_year` INT NULL,
  `impact_area_id` BIGINT NOT NULL,
  PRIMARY KEY (`impact_area_indicator_id`),
  CONSTRAINT `fk_impact_area_indicators_impact_areas1`
    FOREIGN KEY (`impact_area_id`)
    REFERENCES `mydb`.`impact_areas` (`impact_area_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_impact_area_indicators_impact_areas1_idx` ON `mydb`.`impact_area_indicators` (`impact_area_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`impact_area_targets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`impact_area_targets` (
  `impact_area_target_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `impact_area_id` BIGINT NOT NULL,
  PRIMARY KEY (`impact_area_target_id`),
  CONSTRAINT `fk_impact_area_targets_impact_areas1`
    FOREIGN KEY (`impact_area_id`)
    REFERENCES `mydb`.`impact_areas` (`impact_area_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_impact_area_targets_impact_areas1_idx` ON `mydb`.`impact_area_targets` (`impact_area_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_impact_area_target`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_impact_area_target` (
  `result_impact_area_target_id` VARCHAR(45) NOT NULL,
  `result_id` BIGINT NOT NULL,
  `impact_area_target_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_impact_area_target_id`),
  CONSTRAINT `fk_table1_users14`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users24`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions14`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_example_copy1_impact_area_targets1`
    FOREIGN KEY (`impact_area_target_id`)
    REFERENCES `mydb`.`impact_area_targets` (`impact_area_target_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_example_copy1_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_impact_area_target_users1_idx` ON `mydb`.`results_impact_area_target` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_target_user2_idx` ON `mydb`.`results_impact_area_target` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`results_impact_area_target` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_target1_idx` ON `mydb`.`results_impact_area_target` (`impact_area_target_id` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_targets_results1_idx` ON `mydb`.`results_impact_area_target` (`result_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_results_impact_area_targets_idx` ON `mydb`.`results_impact_area_target` (`result_id` ASC, `impact_area_target_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_impact_area_indicators`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_impact_area_indicators` (
  `results_impact_area_indicator_id` VARCHAR(45) NOT NULL,
  `impact_area_indicator_id` BIGINT NOT NULL,
  `result_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`results_impact_area_indicator_id`),
  CONSTRAINT `fk_table1_users15`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users25`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions15`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_impact_area_indicators_impact_area_indicators1`
    FOREIGN KEY (`impact_area_indicator_id`)
    REFERENCES `mydb`.`impact_area_indicators` (`impact_area_indicator_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_impact_area_indicators_results1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_impact_area_indicators_users1_idx` ON `mydb`.`results_impact_area_indicators` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_indicators_users2_idx` ON `mydb`.`results_impact_area_indicators` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_indicators_versions1_idx` ON `mydb`.`results_impact_area_indicators` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_indicators_impact_area_indicators1_idx` ON `mydb`.`results_impact_area_indicators` (`impact_area_indicator_id` ASC) VISIBLE;

CREATE INDEX `fk_results_impact_area_indicators_results1_idx` ON `mydb`.`results_impact_area_indicators` (`result_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_results_impact_area_indicators_idx` ON `mydb`.`results_impact_area_indicators` (`impact_area_indicator_id` ASC, `result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_innovations_use`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_innovations_use` (
  `result_innovation_use_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_innovation_use_id`),
  CONSTRAINT `fk_table1_users16`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users26`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions16`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_innovations_use_users1_idx` ON `mydb`.`results_innovations_use` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_innovations_use_users2_idx` ON `mydb`.`results_innovations_use` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_innovations_use_versions1_idx` ON `mydb`.`results_innovations_use` (`version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_policy_changes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_policy_changes` (
  `result_policy_change_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_policy_change_id`),
  CONSTRAINT `fk_table1_users160`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users260`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions160`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_table1_users1_idx` ON `mydb`.`results_policy_changes` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_users2_idx` ON `mydb`.`results_policy_changes` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_table1_versions1_idx` ON `mydb`.`results_policy_changes` (`version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`melia_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`melia_types` (
  `melia_type_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(1000) NULL,
  PRIMARY KEY (`melia_type_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_knowledge_products`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_knowledge_products` (
  `result_knowledge_product_id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `handle` VARCHAR(200) NULL,
  `issue_date` BIGINT NULL,
  `knowledge_product_type` VARCHAR(100) NULL,
  `is_peer_reviewed` TINYINT NULL,
  `is_isi` TINYINT NULL,
  `doi` VARCHAR(200) NULL,
  `accesibility` VARCHAR(100) NULL,
  `licence` VARCHAR(100) NULL,
  `comodity` VARCHAR(100) NULL,
  `sponsors` TEXT NULL,
  `findable` FLOAT NULL,
  `accesible` FLOAT NULL,
  `interoperable` FLOAT NULL,
  `reusable` FLOAT NULL,
  `is_melia` TINYINT NULL,
  `melia_previous_submitted` TINYINT NULL,
  `melia_type_id` BIGINT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_knowledge_product_id`),
  CONSTRAINT `fk_results_knowledge_products_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_knowledge_products_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_knowledge_products_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_knowledge_products_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_knowledge_products_melia_types1`
    FOREIGN KEY (`melia_type_id`)
    REFERENCES `mydb`.`melia_types` (`melia_type_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_knowledge_products_users1_idx` ON `mydb`.`results_knowledge_products` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_knowledge_products_users2_idx` ON `mydb`.`results_knowledge_products` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_knowledge_products_versions1_idx` ON `mydb`.`results_knowledge_products` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_knowledge_products_results1_idx` ON `mydb`.`results_knowledge_products` (`results_id` ASC) INVISIBLE;

CREATE INDEX `fk_results_knowledge_products_melia_types1_idx` ON `mydb`.`results_knowledge_products` (`melia_type_id` ASC) VISIBLE;

CREATE UNIQUE INDEX `uk_results_knowledge_products_idx` ON `mydb`.`results_knowledge_products` (`results_id` ASC, `version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_kp_mqap_institutions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_kp_mqap_institutions` (
  `result_kp_mqap_institution_id` BIGINT NOT NULL,
  `result_knowledge_product_id` BIGINT NOT NULL,
  `intitution_name` VARCHAR(200) NOT NULL,
  `predicted_institution_id` BIGINT NOT NULL,
  `confidant` INT NULL,
  `results_by_institutions_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_kp_mqap_institution_id`),
  CONSTRAINT `fk_table1_users17`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users27`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions17`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_mqap_institutions_results_knowledge_products1`
    FOREIGN KEY (`result_knowledge_product_id`)
    REFERENCES `mydb`.`results_knowledge_products` (`result_knowledge_product_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_mqap_institutions_institutions2`
    FOREIGN KEY (`predicted_institution_id`)
    REFERENCES `mydb`.`institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_mqap_institutions_results_by_institutions1`
    FOREIGN KEY (`results_by_institutions_id`)
    REFERENCES `mydb`.`results_by_institutions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_mqap_institutions_users1_idx` ON `mydb`.`results_kp_mqap_institutions` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_mqap_institutions_users2_idx` ON `mydb`.`results_kp_mqap_institutions` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_mqap_institutions_versions1_idx` ON `mydb`.`results_kp_mqap_institutions` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_mqap_institutions_results_knowledge_products1_idx` ON `mydb`.`results_kp_mqap_institutions` (`result_knowledge_product_id` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_mqap_institutions_institutions2_idx` ON `mydb`.`results_kp_mqap_institutions` (`predicted_institution_id` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_mqap_institutions_results_by_institutions1_idx` ON `mydb`.`results_kp_mqap_institutions` (`results_by_institutions_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_results_kp_mqap_institutions_idx` ON `mydb`.`results_kp_mqap_institutions` (`result_knowledge_product_id` ASC, `results_by_institutions_id` ASC, `version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`action_area_outcomes_action_areas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`action_area_outcomes_action_areas` (
  `action_area_outcomes_action_area_is` BIGINT NOT NULL,
  `action_area_outcome_id` BIGINT NOT NULL,
  `action_area_id` BIGINT NOT NULL,
  PRIMARY KEY (`action_area_outcomes_action_area_is`),
  CONSTRAINT `fk_action_area_outcomes_has_action_areas_action_area_outcomes1`
    FOREIGN KEY (`action_area_outcome_id`)
    REFERENCES `mydb`.`action_area_outcomes` (`action_area_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_action_area_outcomes_has_action_areas_action_areas1`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `mydb`.`action_areas` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_action_area_outcomes_has_action_areas_action_areas1_idx` ON `mydb`.`action_area_outcomes_action_areas` (`action_area_id` ASC) VISIBLE;

CREATE INDEX `fk_action_area_outcomes_has_action_areas_action_area_outcom_idx` ON `mydb`.`action_area_outcomes_action_areas` (`action_area_outcome_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_kp_authors`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_kp_authors` (
  `result_kp_author_id` BIGINT NOT NULL,
  `author_name` VARCHAR(200) NULL,
  `orcid` BIGINT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  `result_knowledge_product_id` BIGINT NOT NULL,
  PRIMARY KEY (`result_kp_author_id`),
  CONSTRAINT `fk_results_kp_authors_users18`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_authors_users28`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_authors_versions18`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_authors_results_knowledge_products1`
    FOREIGN KEY (`result_knowledge_product_id`)
    REFERENCES `mydb`.`results_knowledge_products` (`result_knowledge_product_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_kp_authors_users1_idx` ON `mydb`.`results_kp_authors` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_authors_users2_idx` ON `mydb`.`results_kp_authors` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_authors_versions1_idx` ON `mydb`.`results_kp_authors` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_authors_results_knowledge_products1_idx` ON `mydb`.`results_kp_authors` (`result_knowledge_product_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_kp_altmetrics`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_kp_altmetrics` (
  `result_kp_altmetrics_id` BIGINT NOT NULL,
  `result_knowledge_product_id` BIGINT NOT NULL,
  `altmetric_id` VARCHAR(100) NULL,
  `journal` VARCHAR(200) NULL,
  `score` FLOAT NULL,
  `cited_by_posts` BIGINT NULL,
  `cited_by_delicious` BIGINT NULL,
  `cited_by_facebook_pages` BIGINT NULL,
  `cited_by_blogs` BIGINT NULL,
  `cited_by_forum_users` BIGINT NULL,
  `cited_by_google_plus_users` BIGINT NULL,
  `cited_by_linkedin_users` BIGINT NULL,
  `cited_by_news_outlets` BIGINT NULL,
  `cited_by_peer_review_sites` BIGINT NULL,
  `cited_by_pinterest_users` BIGINT NULL,
  `cited_by_policies` BIGINT NULL,
  `cited_by_stack_exchange_resources` BIGINT NULL,
  `cited_by_reddit_users` BIGINT NULL,
  `cited_by_research_highlight_platforms` BIGINT NULL,
  `cited_by_twitter_users` BIGINT NULL,
  `cited_by_youtube_channels` BIGINT NULL,
  `cited_by_weibo_users` BIGINT NULL,
  `cited_by_wikipedia_pages` BIGINT NULL,
  `last_updated` DATE NULL,
  `image_small` VARCHAR(200) NULL,
  `image_medium` VARCHAR(200) NULL,
  `image_large` VARCHAR(200) NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_kp_altmetrics_id`),
  CONSTRAINT `fk_table1_users18`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users28`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions18`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_altmetrics_results_knowledge_products1`
    FOREIGN KEY (`result_knowledge_product_id`)
    REFERENCES `mydb`.`results_knowledge_products` (`result_knowledge_product_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_kp_altmetrics_users1_idx` ON `mydb`.`results_kp_altmetrics` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_altmetrics_users2_idx` ON `mydb`.`results_kp_altmetrics` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_altmetrics_versions1_idx` ON `mydb`.`results_kp_altmetrics` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_altmetrics_results_knowledge_products1_idx` ON `mydb`.`results_kp_altmetrics` (`result_knowledge_product_id` ASC) INVISIBLE;

CREATE UNIQUE INDEX `uk_results_kp_altmetrics_idx` ON `mydb`.`results_kp_altmetrics` (`result_knowledge_product_id` ASC, `version_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`results_kp_keywords`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_kp_keywords` (
  `result_kp_keyword_id` BIGINT NOT NULL,
  `result_knowledge_product_id` BIGINT NOT NULL,
  `keyword` VARCHAR(200) NULL,
  `is_agrovoc` TINYINT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
  PRIMARY KEY (`result_kp_keyword_id`),
  CONSTRAINT `fk_table1_users19`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_users29`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_table1_versions19`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_kp_keywords_results_knowledge_products1`
    FOREIGN KEY (`result_knowledge_product_id`)
    REFERENCES `mydb`.`results_knowledge_products` (`result_knowledge_product_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_kp_keywords_users1_idx` ON `mydb`.`results_kp_keywords` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_keywords_users2_idx` ON `mydb`.`results_kp_keywords` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_keywords_versions1_idx` ON `mydb`.`results_kp_keywords` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_kp_keywords_results_knowledge_products1_idx` ON `mydb`.`results_kp_keywords` (`result_knowledge_product_id` ASC) VISIBLE;

USE `prdb` ;

-- -----------------------------------------------------
-- Table `prdb`.`action`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`action` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `description` TEXT NOT NULL,
  `active` TINYINT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_action_area`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_action_area` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_outcome_indicators`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_outcome_indicators` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `smo_code` TEXT NULL DEFAULT NULL,
  `outcome_indicator_statement` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 34
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_action_areas_outcomes_indicators`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_action_areas_outcomes_indicators` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `outcome_smo_code` TEXT NOT NULL,
  `outcome_statement` TEXT NOT NULL,
  `outcome_indicator_smo_code` TEXT NULL DEFAULT NULL,
  `outcome_indicator_statement` TEXT NULL DEFAULT NULL,
  `action_area_id` INT NULL DEFAULT NULL,
  `outcome_id` INT NULL DEFAULT NULL,
  `outcome_indicator_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_7de34124fca17393e863f4d76fc`
    FOREIGN KEY (`outcome_indicator_id`)
    REFERENCES `prdb`.`clarisa_outcome_indicators` (`id`),
  CONSTRAINT `FK_93c77252693ec1998a3336bf6c5`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `prdb`.`clarisa_action_area` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_93c77252693ec1998a3336bf6c5` ON `prdb`.`clarisa_action_areas_outcomes_indicators` (`action_area_id` ASC) VISIBLE;

CREATE INDEX `FK_7de34124fca17393e863f4d76fc` ON `prdb`.`clarisa_action_areas_outcomes_indicators` (`outcome_indicator_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_countries`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_countries` (
  `name` TEXT NOT NULL,
  `iso_alpha_3` TEXT NOT NULL,
  `id` INT NOT NULL AUTO_INCREMENT,
  `iso_alpha_2` VARCHAR(5) NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 895
DEFAULT CHARACTER SET = utf8mb3;

CREATE UNIQUE INDEX `IDX_4ea24ca2df0eee8206c45aa065` ON `prdb`.`clarisa_countries` (`iso_alpha_2` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_regions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_regions` (
  `um49Code` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `parent_regions_code` INT NULL DEFAULT NULL,
  PRIMARY KEY (`um49Code`),
  CONSTRAINT `FK_f53db7a608c0289defd4e9b33bd`
    FOREIGN KEY (`parent_regions_code`)
    REFERENCES `prdb`.`clarisa_regions` (`um49Code`))
ENGINE = InnoDB
AUTO_INCREMENT = 831
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_f53db7a608c0289defd4e9b33bd` ON `prdb`.`clarisa_regions` (`parent_regions_code` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_countries_regions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_countries_regions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `country_id` INT NULL DEFAULT NULL,
  `region_code` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_1aa06ba82f6e1560f3a909dcb6e`
    FOREIGN KEY (`country_id`)
    REFERENCES `prdb`.`clarisa_countries` (`id`),
  CONSTRAINT `FK_e6ce4401446d7eae889e7bef09e`
    FOREIGN KEY (`region_code`)
    REFERENCES `prdb`.`clarisa_regions` (`um49Code`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_1aa06ba82f6e1560f3a909dcb6e` ON `prdb`.`clarisa_countries_regions` (`country_id` ASC) VISIBLE;

CREATE INDEX `FK_e6ce4401446d7eae889e7bef09e` ON `prdb`.`clarisa_countries_regions` (`region_code` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_geographic_scope`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_geographic_scope` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 56
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_impact_areas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_impact_areas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `description` TEXT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 6
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_global_targets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_global_targets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `target` TEXT NOT NULL,
  `impact_area_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_adbcfdd27fb4523599f288cc5f6`
    FOREIGN KEY (`impact_area_id`)
    REFERENCES `prdb`.`clarisa_impact_areas` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 12
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_adbcfdd27fb4523599f288cc5f6` ON `prdb`.`clarisa_global_targets` (`impact_area_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_impact_area_indicator`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_impact_area_indicator` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `indicator_statement` TEXT NULL DEFAULT NULL,
  `target_year` INT NOT NULL,
  `target_unit` TEXT NULL DEFAULT NULL,
  `value` INT NULL DEFAULT NULL,
  `is_aplicable_projected_benefits` TINYINT NOT NULL,
  `impact_area_id` INT NULL DEFAULT NULL,
  `name` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_5f494f087f37427697e312bf887`
    FOREIGN KEY (`impact_area_id`)
    REFERENCES `prdb`.`clarisa_impact_areas` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 21
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_5f494f087f37427697e312bf887` ON `prdb`.`clarisa_impact_area_indicator` (`impact_area_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_initiatives`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_initiatives` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `official_code` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `short_name` TEXT NOT NULL,
  `active` TINYINT NOT NULL,
  `action_area_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_3723eac1ecd7b99a6eae1f74037`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `prdb`.`clarisa_action_area` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 35
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_3723eac1ecd7b99a6eae1f74037` ON `prdb`.`clarisa_initiatives` (`action_area_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_innovation_characteristic`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_innovation_characteristic` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `definition` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 5
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_innovation_readiness_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_innovation_readiness_level` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `definition` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 21
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_innovation_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_innovation_type` (
  `code` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `definition` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`code`))
ENGINE = InnoDB
AUTO_INCREMENT = 16
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_institution_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_institution_types` (
  `name` TEXT NOT NULL,
  `code` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`code`))
ENGINE = InnoDB
AUTO_INCREMENT = 42
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_institutions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_institutions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `acronym` TEXT NULL DEFAULT NULL,
  `website_link` TEXT NULL DEFAULT NULL,
  `institution_type_code` INT NULL DEFAULT NULL,
  `headquarter_country_iso2` VARCHAR(5) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_59d96103953820802de1dd60065`
    FOREIGN KEY (`headquarter_country_iso2`)
    REFERENCES `prdb`.`clarisa_countries` (`iso_alpha_2`),
  CONSTRAINT `FK_a1ead859f7976b0999f889ea2cd`
    FOREIGN KEY (`institution_type_code`)
    REFERENCES `prdb`.`clarisa_institution_types` (`code`))
ENGINE = InnoDB
AUTO_INCREMENT = 9965
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_a1ead859f7976b0999f889ea2cd` ON `prdb`.`clarisa_institutions` (`institution_type_code` ASC) VISIBLE;

CREATE INDEX `FK_59d96103953820802de1dd60065` ON `prdb`.`clarisa_institutions` (`headquarter_country_iso2` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_melia_study_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_melia_study_type` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 9
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_policy_stage`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_policy_stage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `definition` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 9
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`clarisa_regions_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`clarisa_regions_types` (
  `name` TEXT NOT NULL,
  `id` INT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `first_name` TEXT NOT NULL,
  `last_name` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `is_cgiar` TINYINT NOT NULL,
  `password` TEXT NULL DEFAULT NULL,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `active` TINYINT NOT NULL DEFAULT '1',
  `created_date` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_by` INT NULL DEFAULT NULL,
  `last_updated_date` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `last_updated_by` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_af87ddcc787d5d988d19fc8b175`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_f32b1cb14a9920477bcfd63df2c`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 17
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_f32b1cb14a9920477bcfd63df2c` ON `prdb`.`users` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_af87ddcc787d5d988d19fc8b175` ON `prdb`.`users` (`last_updated_by` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`version`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`version` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `version_name` TEXT NOT NULL,
  `start_date` TEXT NULL DEFAULT NULL,
  `end_date` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`year`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`year` (
  `year` YEAR NOT NULL,
  `active` TINYINT NOT NULL DEFAULT '1',
  `start_date` TIMESTAMP NULL DEFAULT NULL,
  `end_date` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`year`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`gender_tag_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`gender_tag_level` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`legacy_result`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`legacy_result` (
  `indicator_type` TEXT NULL DEFAULT NULL,
  `year` INT NULL DEFAULT NULL,
  `crp` TEXT NULL DEFAULT NULL,
  `legacy_id` VARCHAR(45) NOT NULL,
  `title` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `geo_scope` TEXT NULL DEFAULT NULL,
  `detail_link` TEXT NULL DEFAULT NULL,
  `is_migrated` TINYINT NULL DEFAULT NULL,
  PRIMARY KEY (`legacy_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`result_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result_type` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`result_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result_level` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 5
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`result`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `description` TEXT NULL DEFAULT NULL,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `gender_tag_level_id` BIGINT NULL DEFAULT NULL,
  `version_id` BIGINT NOT NULL,
  `result_type_id` INT NULL DEFAULT NULL,
  `status` TINYINT NULL DEFAULT '0',
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  `reported_year_id` YEAR NULL DEFAULT NULL,
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `result_level_id` INT NULL DEFAULT NULL,
  `title` TEXT NOT NULL,
  `legacy_id` VARCHAR(45) NULL DEFAULT NULL,
  `krs_url` TEXT NULL DEFAULT NULL,
  `is_krs` TINYINT NULL DEFAULT NULL,
  `climate_change_tag_level_id` BIGINT NULL DEFAULT NULL,
  `no_applicable_partner` TINYINT NOT NULL DEFAULT '0',
  `geographic_scope_id` BIGINT NULL DEFAULT NULL,
  `has_regions` TINYINT NULL DEFAULT NULL,
  `has_countries` TINYINT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_454bdc19227ad6a58d5ddfbaf7e`
    FOREIGN KEY (`reported_year_id`)
    REFERENCES `prdb`.`year` (`year`),
  CONSTRAINT `FK_5529f584fe13fd8fb99b62b8eb2`
    FOREIGN KEY (`climate_change_tag_level_id`)
    REFERENCES `prdb`.`gender_tag_level` (`id`),
  CONSTRAINT `FK_713f33e5d065891936a2fd93464`
    FOREIGN KEY (`legacy_id`)
    REFERENCES `prdb`.`legacy_result` (`legacy_id`),
  CONSTRAINT `FK_87067d6e5348ba4b09bd3c4cb64`
    FOREIGN KEY (`result_type_id`)
    REFERENCES `prdb`.`result_type` (`id`),
  CONSTRAINT `FK_99e440b135663e707b3f8386212`
    FOREIGN KEY (`gender_tag_level_id`)
    REFERENCES `prdb`.`gender_tag_level` (`id`),
  CONSTRAINT `FK_c02a8848d0317d55d1bd882833e`
    FOREIGN KEY (`geographic_scope_id`)
    REFERENCES `prdb`.`clarisa_geographic_scope` (`id`),
  CONSTRAINT `FK_c62881778cd9bcf0c78f954c300`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_cdbae393c1c7603a7c19c574cb1`
    FOREIGN KEY (`result_level_id`)
    REFERENCES `prdb`.`result_level` (`id`),
  CONSTRAINT `FK_dd923902fe9bd17c971a4bd987e`
    FOREIGN KEY (`version_id`)
    REFERENCES `prdb`.`version` (`id`),
  CONSTRAINT `FK_fea91e52131de09b1c76ce144af`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 62
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_99e440b135663e707b3f8386212` ON `prdb`.`result` (`gender_tag_level_id` ASC) VISIBLE;

CREATE INDEX `FK_dd923902fe9bd17c971a4bd987e` ON `prdb`.`result` (`version_id` ASC) VISIBLE;

CREATE INDEX `FK_87067d6e5348ba4b09bd3c4cb64` ON `prdb`.`result` (`result_type_id` ASC) VISIBLE;

CREATE INDEX `FK_fea91e52131de09b1c76ce144af` ON `prdb`.`result` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_c62881778cd9bcf0c78f954c300` ON `prdb`.`result` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `FK_454bdc19227ad6a58d5ddfbaf7e` ON `prdb`.`result` (`reported_year_id` ASC) VISIBLE;

CREATE INDEX `FK_cdbae393c1c7603a7c19c574cb1` ON `prdb`.`result` (`result_level_id` ASC) VISIBLE;

CREATE INDEX `FK_713f33e5d065891936a2fd93464` ON `prdb`.`result` (`legacy_id` ASC) VISIBLE;

CREATE INDEX `FK_5529f584fe13fd8fb99b62b8eb2` ON `prdb`.`result` (`climate_change_tag_level_id` ASC) VISIBLE;

CREATE INDEX `FK_c02a8848d0317d55d1bd882833e` ON `prdb`.`result` (`geographic_scope_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`evidence`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`evidence` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `description` TEXT NULL DEFAULT NULL,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `creation_date` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version_id` BIGINT NOT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  `gender_related` TINYINT NULL DEFAULT NULL,
  `link` TEXT NOT NULL,
  `youth_related` TINYINT NULL DEFAULT NULL,
  `is_supplementary` TINYINT NULL DEFAULT NULL,
  `result_id` BIGINT NULL DEFAULT NULL,
  `knowledge_product_related` BIGINT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_02f995ed1a53ffadec91f1f1012`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_10e4a92a8dcdf201c59cd37fa7d`
    FOREIGN KEY (`version_id`)
    REFERENCES `prdb`.`version` (`id`),
  CONSTRAINT `FK_4d484f699c948239f5f13c635aa`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_57e7c980734f7016db90978e17a`
    FOREIGN KEY (`result_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_c580e83c9bd86d9ae7139059273`
    FOREIGN KEY (`knowledge_product_related`)
    REFERENCES `prdb`.`result` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 26
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_10e4a92a8dcdf201c59cd37fa7d` ON `prdb`.`evidence` (`version_id` ASC) VISIBLE;

CREATE INDEX `FK_02f995ed1a53ffadec91f1f1012` ON `prdb`.`evidence` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_4d484f699c948239f5f13c635aa` ON `prdb`.`evidence` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `FK_57e7c980734f7016db90978e17a` ON `prdb`.`evidence` (`result_id` ASC) VISIBLE;

CREATE INDEX `FK_c580e83c9bd86d9ae7139059273` ON `prdb`.`evidence` (`knowledge_product_related` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`evidence_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`evidence_type` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`evidence_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`evidence_types` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `description` TEXT NULL DEFAULT NULL,
  `name` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`initiative_role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`initiative_role` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NULL DEFAULT NULL,
  `description` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`initiative_roles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`initiative_roles` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`inititiative`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`inititiative` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `official_code` VARCHAR(45) NOT NULL,
  `name` VARCHAR(500) NOT NULL,
  `short_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`institution_role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`institution_role` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`linked_result`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`linked_result` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `linked_results_id` BIGINT NULL DEFAULT NULL,
  `origin_result_id` BIGINT NULL DEFAULT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_020cd13b23b258c0d318ac5dcc0`
    FOREIGN KEY (`origin_result_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_724e1bf1ee91424bedadc0958fb`
    FOREIGN KEY (`linked_results_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_794e5e697092e8fa6a873e12b56`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_b292bf77ad02afcc6bf66f84b0a`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 38
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_724e1bf1ee91424bedadc0958fb` ON `prdb`.`linked_result` (`linked_results_id` ASC) VISIBLE;

CREATE INDEX `FK_020cd13b23b258c0d318ac5dcc0` ON `prdb`.`linked_result` (`origin_result_id` ASC) VISIBLE;

CREATE INDEX `FK_b292bf77ad02afcc6bf66f84b0a` ON `prdb`.`linked_result` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_794e5e697092e8fa6a873e12b56` ON `prdb`.`linked_result` (`last_updated_by` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`migrations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`migrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `timestamp` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 94
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`partner_delivery_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`partner_delivery_type` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` TEXT NOT NULL,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`role_levels`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`role_levels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`role` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `description` TEXT NOT NULL,
  `active` TINYINT NOT NULL DEFAULT '1',
  `updated_by` INT NULL DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `role_level_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_234be21e09419d8126666153c75`
    FOREIGN KEY (`role_level_id`)
    REFERENCES `prdb`.`role_levels` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 9
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_234be21e09419d8126666153c75` ON `prdb`.`role` (`role_level_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`permission_by_role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`permission_by_role` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `active` TINYINT NOT NULL,
  `role_id` INT NULL DEFAULT NULL,
  `action_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_326972b1bc3445ec11fcca8f573`
    FOREIGN KEY (`action_id`)
    REFERENCES `prdb`.`action` (`id`),
  CONSTRAINT `FK_372768e27cd94861eec3031cb6c`
    FOREIGN KEY (`role_id`)
    REFERENCES `prdb`.`role` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_372768e27cd94861eec3031cb6c` ON `prdb`.`permission_by_role` (`role_id` ASC) VISIBLE;

CREATE INDEX `FK_326972b1bc3445ec11fcca8f573` ON `prdb`.`permission_by_role` (`action_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`restriction`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`restriction` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `endpoint` TEXT NULL DEFAULT NULL,
  `action` TEXT NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `active` TINYINT NOT NULL DEFAULT '1',
  `is_back` TINYINT NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;


-- -----------------------------------------------------
-- Table `prdb`.`restrictions_by_role`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`restrictions_by_role` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `active` TINYINT NOT NULL DEFAULT '1',
  `role_id` INT NOT NULL,
  `restriction_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_112a2145f1021460618a85f0aef`
    FOREIGN KEY (`restriction_id`)
    REFERENCES `prdb`.`restriction` (`id`),
  CONSTRAINT `FK_2fad687c25a916ef28431411624`
    FOREIGN KEY (`role_id`)
    REFERENCES `prdb`.`role` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_2fad687c25a916ef28431411624` ON `prdb`.`restrictions_by_role` (`role_id` ASC) VISIBLE;

CREATE INDEX `FK_112a2145f1021460618a85f0aef` ON `prdb`.`restrictions_by_role` (`restriction_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`result-country`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result-country` (
  `result_country_id` BIGINT NOT NULL AUTO_INCREMENT,
  `result_id` BIGINT NULL DEFAULT NULL,
  `country_id` INT NULL DEFAULT NULL,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  PRIMARY KEY (`result_country_id`),
  CONSTRAINT `FK_548af49211867639f96a0267f4f`
    FOREIGN KEY (`result_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_8d6860589e9b9968306b0f3316e`
    FOREIGN KEY (`country_id`)
    REFERENCES `prdb`.`clarisa_countries` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_548af49211867639f96a0267f4f` ON `prdb`.`result-country` (`result_id` ASC) VISIBLE;

CREATE INDEX `FK_8d6860589e9b9968306b0f3316e` ON `prdb`.`result-country` (`country_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`results_by_institution`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`results_by_institution` (
  `institutions_id` INT NULL DEFAULT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version_id` BIGINT NOT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `result_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_030b9938e0e50a182205ba0d322`
    FOREIGN KEY (`version_id`)
    REFERENCES `prdb`.`version` (`id`),
  CONSTRAINT `FK_141eb58a1a014a850a97ce518ef`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_73cf3e6ca5a84f6fb065860b4dd`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_7f636e5aa0cfd9c268532c48de4`
    FOREIGN KEY (`institution_roles_id`)
    REFERENCES `prdb`.`institution_role` (`id`),
  CONSTRAINT `FK_a9069fbdc06a21e8a658b191704`
    FOREIGN KEY (`institutions_id`)
    REFERENCES `prdb`.`clarisa_institutions` (`id`),
  CONSTRAINT `FK_e4daec1a1c37f1253766bf704d3`
    FOREIGN KEY (`result_id`)
    REFERENCES `prdb`.`result` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 112
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_030b9938e0e50a182205ba0d322` ON `prdb`.`results_by_institution` (`version_id` ASC) VISIBLE;

CREATE INDEX `FK_73cf3e6ca5a84f6fb065860b4dd` ON `prdb`.`results_by_institution` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_141eb58a1a014a850a97ce518ef` ON `prdb`.`results_by_institution` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `FK_e4daec1a1c37f1253766bf704d3` ON `prdb`.`results_by_institution` (`result_id` ASC) VISIBLE;

CREATE INDEX `FK_7f636e5aa0cfd9c268532c48de4` ON `prdb`.`results_by_institution` (`institution_roles_id` ASC) VISIBLE;

CREATE INDEX `FK_a9069fbdc06a21e8a658b191704` ON `prdb`.`results_by_institution` (`institutions_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`result_by_institutions_by_deliveries_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result_by_institutions_by_deliveries_type` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `partner_delivery_type_id` INT NOT NULL,
  `result_by_institution_id` BIGINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_3f76dc774754c6a5c61aa78dd4b`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_58f7d27eb575524cf16814e046f`
    FOREIGN KEY (`partner_delivery_type_id`)
    REFERENCES `prdb`.`partner_delivery_type` (`id`),
  CONSTRAINT `FK_76230eb8a8feedb43f23529f1ad`
    FOREIGN KEY (`versions_id`)
    REFERENCES `prdb`.`version` (`id`),
  CONSTRAINT `FK_82816597b0a0491f9b88ca80696`
    FOREIGN KEY (`result_by_institution_id`)
    REFERENCES `prdb`.`results_by_institution` (`id`),
  CONSTRAINT `FK_c606694f9314bd88b0c672bf681`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 77
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_58f7d27eb575524cf16814e046f` ON `prdb`.`result_by_institutions_by_deliveries_type` (`partner_delivery_type_id` ASC) VISIBLE;

CREATE INDEX `FK_82816597b0a0491f9b88ca80696` ON `prdb`.`result_by_institutions_by_deliveries_type` (`result_by_institution_id` ASC) VISIBLE;

CREATE INDEX `FK_76230eb8a8feedb43f23529f1ad` ON `prdb`.`result_by_institutions_by_deliveries_type` (`versions_id` ASC) VISIBLE;

CREATE INDEX `FK_c606694f9314bd88b0c672bf681` ON `prdb`.`result_by_institutions_by_deliveries_type` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_3f76dc774754c6a5c61aa78dd4b` ON `prdb`.`result_by_institutions_by_deliveries_type` (`last_updated_by` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`result_by_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result_by_level` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `result_level_id` INT NOT NULL,
  `result_type_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_2ca1b6b07f54acadf9d9beed9f5`
    FOREIGN KEY (`result_level_id`)
    REFERENCES `prdb`.`result_level` (`id`),
  CONSTRAINT `FK_e6a5c7c78ff00741eeca4d38eca`
    FOREIGN KEY (`result_type_id`)
    REFERENCES `prdb`.`result_type` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 14
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_2ca1b6b07f54acadf9d9beed9f5` ON `prdb`.`result_by_level` (`result_level_id` ASC) VISIBLE;

CREATE INDEX `FK_e6a5c7c78ff00741eeca4d38eca` ON `prdb`.`result_by_level` (`result_type_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`result_country`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result_country` (
  `result_country_id` BIGINT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `result_id` BIGINT NULL DEFAULT NULL,
  `country_id` INT NULL DEFAULT NULL,
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`result_country_id`),
  CONSTRAINT `FK_55dcfdceaaeba551d8c64367649`
    FOREIGN KEY (`result_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_acf6398f5385e732a74607f338a`
    FOREIGN KEY (`country_id`)
    REFERENCES `prdb`.`clarisa_countries` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 79
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_55dcfdceaaeba551d8c64367649` ON `prdb`.`result_country` (`result_id` ASC) VISIBLE;

CREATE INDEX `FK_acf6398f5385e732a74607f338a` ON `prdb`.`result_country` (`country_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`result_region`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`result_region` (
  `result_region_id` BIGINT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `region_id` INT NULL DEFAULT NULL,
  `result_id` BIGINT NULL DEFAULT NULL,
  PRIMARY KEY (`result_region_id`),
  CONSTRAINT `FK_179b0a95bafbd47c9dd8e8e15a4`
    FOREIGN KEY (`region_id`)
    REFERENCES `prdb`.`clarisa_regions` (`um49Code`),
  CONSTRAINT `FK_a3ee6ce630f4784e2e93301bbdd`
    FOREIGN KEY (`result_id`)
    REFERENCES `prdb`.`result` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 37
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_179b0a95bafbd47c9dd8e8e15a4` ON `prdb`.`result_region` (`region_id` ASC) VISIBLE;

CREATE INDEX `FK_a3ee6ce630f4784e2e93301bbdd` ON `prdb`.`result_region` (`result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`results_by_evidence`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`results_by_evidence` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `evidences_id` BIGINT NOT NULL,
  `evidence_types_id` BIGINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  `creation_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_6478fe906b706712fc9782bf27b`
    FOREIGN KEY (`results_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_685fa898bda7d5f0e3078c702a3`
    FOREIGN KEY (`evidences_id`)
    REFERENCES `prdb`.`evidence` (`id`),
  CONSTRAINT `FK_bbd96dc95ae93743a0995c37df6`
    FOREIGN KEY (`evidence_types_id`)
    REFERENCES `prdb`.`evidence_types` (`id`),
  CONSTRAINT `FK_c5265e6f64949ad5faeecec1490`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_d78027934f97fb1ddc1e79a87c1`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_ed32ac35727cd95c9f5dfb2b5d5`
    FOREIGN KEY (`version_id`)
    REFERENCES `prdb`.`version` (`id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_6478fe906b706712fc9782bf27b` ON `prdb`.`results_by_evidence` (`results_id` ASC) VISIBLE;

CREATE INDEX `FK_685fa898bda7d5f0e3078c702a3` ON `prdb`.`results_by_evidence` (`evidences_id` ASC) VISIBLE;

CREATE INDEX `FK_ed32ac35727cd95c9f5dfb2b5d5` ON `prdb`.`results_by_evidence` (`version_id` ASC) VISIBLE;

CREATE INDEX `FK_bbd96dc95ae93743a0995c37df6` ON `prdb`.`results_by_evidence` (`evidence_types_id` ASC) VISIBLE;

CREATE INDEX `FK_d78027934f97fb1ddc1e79a87c1` ON `prdb`.`results_by_evidence` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_c5265e6f64949ad5faeecec1490` ON `prdb`.`results_by_evidence` (`last_updated_by` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`results_by_inititiative`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`results_by_inititiative` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `result_id` BIGINT NULL DEFAULT NULL,
  `inititiative_id` INT NULL DEFAULT NULL,
  `initiative_role_id` BIGINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  `created_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_187203882c6f8671264095a7d3a`
    FOREIGN KEY (`result_id`)
    REFERENCES `prdb`.`result` (`id`),
  CONSTRAINT `FK_4e113ec11bf1911212375ec5e9f`
    FOREIGN KEY (`initiative_role_id`)
    REFERENCES `prdb`.`initiative_roles` (`id`),
  CONSTRAINT `FK_64714f53816392407e30ec0aa6f`
    FOREIGN KEY (`version_id`)
    REFERENCES `prdb`.`version` (`id`),
  CONSTRAINT `FK_723458a75bfd10519517d9b2bf3`
    FOREIGN KEY (`inititiative_id`)
    REFERENCES `prdb`.`clarisa_initiatives` (`id`),
  CONSTRAINT `FK_a4bb5660ef58c4236560192df90`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_fb24d9cfa00e2e2ead619a61dd0`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 62
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_187203882c6f8671264095a7d3a` ON `prdb`.`results_by_inititiative` (`result_id` ASC) VISIBLE;

CREATE INDEX `FK_723458a75bfd10519517d9b2bf3` ON `prdb`.`results_by_inititiative` (`inititiative_id` ASC) VISIBLE;

CREATE INDEX `FK_4e113ec11bf1911212375ec5e9f` ON `prdb`.`results_by_inititiative` (`initiative_role_id` ASC) VISIBLE;

CREATE INDEX `FK_64714f53816392407e30ec0aa6f` ON `prdb`.`results_by_inititiative` (`version_id` ASC) VISIBLE;

CREATE INDEX `FK_a4bb5660ef58c4236560192df90` ON `prdb`.`results_by_inititiative` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_fb24d9cfa00e2e2ead619a61dd0` ON `prdb`.`results_by_inititiative` (`last_updated_by` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`results_by_institution_type`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`results_by_institution_type` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `creation_date` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `results_id` BIGINT NOT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` INT NOT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  `institution_types_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_1f9eeeee19cfa4711445d4885d1`
    FOREIGN KEY (`institution_roles_id`)
    REFERENCES `prdb`.`institution_role` (`id`),
  CONSTRAINT `FK_544ee7bf3c6f36b58fad8f5e349`
    FOREIGN KEY (`institution_types_id`)
    REFERENCES `prdb`.`clarisa_institution_types` (`code`),
  CONSTRAINT `FK_55bca184237100f0ef8cc8fb0ea`
    FOREIGN KEY (`version_id`)
    REFERENCES `prdb`.`version` (`id`),
  CONSTRAINT `FK_5ecc67bc0d3fdc650138d509d27`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_5feeeaa251795ec834bc6d8a72d`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_bc9eaf20321b224ec6d011854bc`
    FOREIGN KEY (`results_id`)
    REFERENCES `prdb`.`result` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 15
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_bc9eaf20321b224ec6d011854bc` ON `prdb`.`results_by_institution_type` (`results_id` ASC) VISIBLE;

CREATE INDEX `FK_1f9eeeee19cfa4711445d4885d1` ON `prdb`.`results_by_institution_type` (`institution_roles_id` ASC) VISIBLE;

CREATE INDEX `FK_55bca184237100f0ef8cc8fb0ea` ON `prdb`.`results_by_institution_type` (`version_id` ASC) VISIBLE;

CREATE INDEX `FK_5feeeaa251795ec834bc6d8a72d` ON `prdb`.`results_by_institution_type` (`created_by` ASC) VISIBLE;

CREATE INDEX `FK_5ecc67bc0d3fdc650138d509d27` ON `prdb`.`results_by_institution_type` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `FK_544ee7bf3c6f36b58fad8f5e349` ON `prdb`.`results_by_institution_type` (`institution_types_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `prdb`.`role_by_user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `prdb`.`role_by_user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `active` TINYINT NOT NULL DEFAULT '1',
  `created_date` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `last_updated_date` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `role` INT NULL DEFAULT NULL,
  `initiative_id` INT NULL DEFAULT NULL,
  `action_area_id` INT NULL DEFAULT NULL,
  `user` INT NULL DEFAULT NULL,
  `created_by` INT NULL DEFAULT NULL,
  `last_updated_by` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `FK_8f73e4003e4e30cc916f3005587`
    FOREIGN KEY (`created_by`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_a69c3f014f850c3d0291b6aa7a5`
    FOREIGN KEY (`user`)
    REFERENCES `prdb`.`users` (`id`),
  CONSTRAINT `FK_b2d61a3db03e6252504b4352196`
    FOREIGN KEY (`role`)
    REFERENCES `prdb`.`role` (`id`),
  CONSTRAINT `FK_ca5497966da117b34adf753cc52`
    FOREIGN KEY (`initiative_id`)
    REFERENCES `prdb`.`clarisa_initiatives` (`id`),
  CONSTRAINT `FK_ca74c9f49bc68bbcf30f12607a8`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `prdb`.`clarisa_action_area` (`id`),
  CONSTRAINT `FK_cb5bd6c8dbab91e4af519718d5c`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `prdb`.`users` (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 40
DEFAULT CHARACTER SET = utf8mb3;

CREATE INDEX `FK_b2d61a3db03e6252504b4352196` ON `prdb`.`role_by_user` (`role` ASC) VISIBLE;

CREATE INDEX `FK_ca5497966da117b34adf753cc52` ON `prdb`.`role_by_user` (`initiative_id` ASC) VISIBLE;

CREATE INDEX `FK_ca74c9f49bc68bbcf30f12607a8` ON `prdb`.`role_by_user` (`action_area_id` ASC) VISIBLE;

CREATE INDEX `FK_a69c3f014f850c3d0291b6aa7a5` ON `prdb`.`role_by_user` (`user` ASC) VISIBLE;

CREATE INDEX `FK_cb5bd6c8dbab91e4af519718d5c` ON `prdb`.`role_by_user` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `FK_8f73e4003e4e30cc916f3005587` ON `prdb`.`role_by_user` (`created_by` ASC) VISIBLE;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
