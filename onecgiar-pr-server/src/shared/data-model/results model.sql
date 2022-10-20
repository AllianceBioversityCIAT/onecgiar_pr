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
  PRIMARY KEY (`year`));


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
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  `status` TINYINT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `fk_results_result_types1_idx` (`result_type_id` ASC) VISIBLE,
  INDEX `fk_results_gender_tag_level1_idx` (`gender_tag_level_id` ASC) VISIBLE,
  INDEX `fk_results_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_results_versions1_idx` (`version_id` ASC) VISIBLE,
  INDEX `fk_results_current_year1_idx` (`reported_year_id` ASC) VISIBLE,
  INDEX `fk_results_result_levels1_idx` (`result_level_id` ASC) VISIBLE,
  INDEX `fk_results_legacy_indicators_list1_idx` (`legacy_indicators_list_id` ASC) VISIBLE,
  INDEX `fk_results_climate_tag_levels1_idx` (`climate_tag_levels_id` ASC) VISIBLE,
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
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


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
  `action_area_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`, `action_area_id`),
  INDEX `fk_inititiatives_action_areas1_idx` (`action_area_id` ASC) VISIBLE,
  CONSTRAINT `fk_inititiatives_action_areas1`
    FOREIGN KEY (`action_area_id`)
    REFERENCES `mydb`.`action_areas` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


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
  INDEX `fk_result_has_inititiative_inititiative1_idx` (`inititiative_id` ASC) VISIBLE,
  INDEX `fk_result_has_inititiative_result1_idx` (`result_id` ASC) VISIBLE,
  INDEX `fk_results_by_inititiatives_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_results_by_inititiatives_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_by_inititiatives_versions1_idx` (`version_id` ASC) VISIBLE,
  INDEX `fk_results_by_inititiatives_initiative_roles1_idx` (`initiative_role_id` ASC) VISIBLE,
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
  INDEX `fk_institutions_institution_types1_idx` (`institution_type_id` ASC) VISIBLE,
  CONSTRAINT `fk_institutions_institution_types1`
    FOREIGN KEY (`institution_type_id`)
    REFERENCES `mydb`.`institution_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


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
  INDEX `fk_results_has_institutions_institutions1_idx` (`institutions_id` ASC) VISIBLE,
  INDEX `fk_results_has_institutions_results1_idx` (`results_id` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_institution_roles1_idx` (`institution_roles_id` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_versions1_idx` (`version_id` ASC) VISIBLE,
  UNIQUE INDEX `Unique` (`results_id` ASC, `institutions_id` ASC, `institution_roles_id` ASC) VISIBLE,
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


-- -----------------------------------------------------
-- Table `mydb`.`results_by_institution_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_institution_types` (
  `results_id` BIGINT NOT NULL,
  `institution_types_id` BIGINT NOT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `creation_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`results_id`, `institution_types_id`),
  INDEX `fk_results_has_institution_types_institution_types1_idx` (`institution_types_id` ASC) VISIBLE,
  INDEX `fk_results_has_institution_types_results1_idx` (`results_id` ASC) VISIBLE,
  INDEX `fk_results_by_institution_types_institution_roles1_idx` (`institution_roles_id` ASC) VISIBLE,
  INDEX `fk_results_by_institution_types_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_by_institution_types_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_results_by_institution_types_versions1_idx` (`version_id` ASC) VISIBLE,
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
  INDEX `fk_evidences_versions1_idx` (`version_id` ASC) VISIBLE,
  INDEX `fk_evidences_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_evidences_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_evidences_result_evidence_id_idx` (`knowledge_product_related` ASC) VISIBLE,
  INDEX `fk_evidences_results1_idx` (`result_id` ASC) VISIBLE,
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


-- -----------------------------------------------------
-- Table `mydb`.`results_by_level`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_level` (
  `result_types_id` BIGINT NOT NULL,
  `result_levels_id` BIGINT NOT NULL,
  PRIMARY KEY (`result_types_id`, `result_levels_id`),
  INDEX `fk_results_by_level_result_levels1_idx` (`result_levels_id` ASC) VISIBLE,
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
  `partner_delivery_type_id` BIGINT NOT NULL,
  `result_by_institution_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `versions_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` VARCHAR(45) NULL,
  INDEX `fk_results_by_institutions_by deliveries_types_partner_deli_idx` (`partner_delivery_type_id` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_by_deliveries_types_results_by_i_idx` (`result_by_institution_id` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_by_deliveries_types_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_by_deliveries_types_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_by_deliveries_types_versions1_idx` (`versions_id` ASC) VISIBLE,
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


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
