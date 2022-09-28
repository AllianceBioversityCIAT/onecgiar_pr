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
-- Table `mydb`.`result_levels`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`result_levels` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(45) NULL,
  `description` VARCHAR(500) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`result_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`result_types` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(500) NULL,
  `result_level_id` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_result_types_result_levels1_idx` (`result_level_id` ASC) VISIBLE,
  CONSTRAINT `fk_result_types_result_levels1`
    FOREIGN KEY (`result_level_id`)
    REFERENCES `mydb`.`result_levels` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
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
-- Table `mydb`.`results`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results` (
  `id` BIGINT NOT NULL,
  `title` VARCHAR(45) NOT NULL,
  `description` TEXT NULL,
  `result_type_id` VARCHAR(20) NOT NULL,
  `gender_tag_level_id` BIGINT NULL,
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
  `results_id` BIGINT NOT NULL,
  `institutions_id` INT NOT NULL,
  `institution_roles_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`results_id`, `institutions_id`),
  INDEX `fk_results_has_institutions_institutions1_idx` (`institutions_id` ASC) VISIBLE,
  INDEX `fk_results_has_institutions_results1_idx` (`results_id` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_institution_roles1_idx` (`institution_roles_id` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_users2_idx` (`last_updated_by` ASC) VISIBLE,
  INDEX `fk_results_by_institutions_versions1_idx` (`version_id` ASC) VISIBLE,
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
  `link` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
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
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`evidence_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`evidence_types` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(100) NULL,
  `description` VARCHAR(45) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`results_by_evidences`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`results_by_evidences` (
  `id` BIGINT NOT NULL,
  `results_id` BIGINT NOT NULL,
  `evidences_id` BIGINT NOT NULL,
  `evidence_types_id` BIGINT NOT NULL,
  `is_active` TINYINT NOT NULL,
  `version_id` BIGINT NOT NULL,
  `created_by` BIGINT NOT NULL,
  `created_date` DATE NOT NULL,
  `last_updated_by` BIGINT NULL,
  `last_updated_date` DATE NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_results_by_evidences_results1_idx` (`results_id` ASC) VISIBLE,
  INDEX `fk_results_by_evidences_evidences1_idx` (`evidences_id` ASC) VISIBLE,
  INDEX `fk_results_by_evidences_evidence_types1_idx` (`evidence_types_id` ASC) VISIBLE,
  INDEX `fk_results_by_evidences_versions1_idx` (`version_id` ASC) VISIBLE,
  INDEX `fk_results_by_evidences_users1_idx` (`created_by` ASC) VISIBLE,
  INDEX `fk_results_by_evidences_users2_idx` (`last_updated_by` ASC) VISIBLE,
  CONSTRAINT `fk_results_by_evidences_results1`
    FOREIGN KEY (`results_id`)
    REFERENCES `mydb`.`results` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_evidences_evidences1`
    FOREIGN KEY (`evidences_id`)
    REFERENCES `mydb`.`evidences` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_evidences_evidence_types1`
    FOREIGN KEY (`evidence_types_id`)
    REFERENCES `mydb`.`evidence_types` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_evidences_versions1`
    FOREIGN KEY (`version_id`)
    REFERENCES `mydb`.`versions` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_evidences_users1`
    FOREIGN KEY (`created_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_results_by_evidences_users2`
    FOREIGN KEY (`last_updated_by`)
    REFERENCES `mydb`.`users` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
