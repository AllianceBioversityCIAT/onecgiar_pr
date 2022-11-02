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
  `result_id` BIGINT(20) NOT NULL,
  `inititiative_id` BIGINT(20) NOT NULL,
  `initiative_role_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL DEFAULT sysdate(),
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`result_id`, `inititiative_id`),
  CONSTRAINT `fk_result_has_inititiative_result1`
    FOREIGN KEY (`result_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_result_has_inititiative_inititiative1`
    FOREIGN KEY (`inititiative_id`)
    REFERENCES `mydb`.`inititiatives` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
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
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_result_has_inititiative_inititiative1_idx` ON `mydb`.`results_by_inititiatives` (`inititiative_id` ASC) VISIBLE;

CREATE INDEX `fk_result_has_inititiative_result1_idx` ON `mydb`.`results_by_inititiatives` (`result_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_users2_idx` ON `mydb`.`results_by_inititiatives` (`last_updated_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_users1_idx` ON `mydb`.`results_by_inititiatives` (`created_by` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_versions1_idx` ON `mydb`.`results_by_inititiatives` (`version_id` ASC) VISIBLE;

CREATE INDEX `fk_results_by_inititiatives_initiative_roles1_idx` ON `mydb`.`results_by_inititiatives` (`initiative_role_id` ASC) VISIBLE;


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
  PRIMARY KEY (`id`, `institution_type_id`),
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
  `is_active` TINYINT NULL,
  `created_date` DATE NULL,
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
  `is_active` TINYINT NULL,
  `created_date` DATE NULL,
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
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_results_cuntries_countries1_idx` ON `mydb`.`results_countries` (`country_id` ASC) VISIBLE;

CREATE INDEX `fk_results_cuntries_results1_idx` ON `mydb`.`results_countries` (`result_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`example`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`example` (
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_date` DATE NULL,
  `last_updated_by` BIGINT NULL,
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
  `work_package_short_title` VARCHAR(45) NULL,
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
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_toc_results_toc_level1_idx` ON `mydb`.`toc_results` (`toc_level_id` ASC) VISIBLE;

CREATE INDEX `fk_toc_results_inititiatives1_idx` ON `mydb`.`toc_results` (`inititiative_id` ASC) VISIBLE;


-- -----------------------------------------------------
-- Table `mydb`.`action_area_outcomes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`action_area_outcomes` (
  `action_area_id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(45) NULL,
  `action_area_id` BIGINT NOT NULL,
  PRIMARY KEY (`action_area_id`),
  CONSTRAINT `fk_action_area_outcomes_action_areas1`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `mydb`.`action_areas` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

CREATE INDEX `fk_action_area_outcomes_action_areas1_idx` ON `mydb`.`action_area_outcomes` (`action_area_id` ASC) VISIBLE;


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


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
