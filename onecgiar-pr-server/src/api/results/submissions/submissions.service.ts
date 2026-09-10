import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { submissionRepository } from './submissions.repository';
import { ResultRepository } from '../result.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Submission } from './entities/submission.entity';
import { resultValidationRepository } from '../results-validation-module/results-validation-module.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { IpsrService } from '../../ipsr/ipsr.service';
import { ResultsInnovationPackagesValidationModuleService } from '../../ipsr/results-innovation-packages-validation-module/results-innovation-packages-validation-module.service';
import { RoleEnum } from '../../../shared/constants/role-type.enum';
import { NotificationService } from '../../notification/notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../../notification/enum/notification.enum';
import { UserNotificationSettingsService } from '../../user-notification-settings/user-notification-settings.service';
import { IntellectualPropertyExpertRepository } from '../intellectual_property_experts/repositories/intellectual_property_experts.repository';
import * as handlebars from 'handlebars';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { AdUserRepository } from '../../ad_users/repository/ad-users.repository';

/**
 * P2-3272. From this phase on, the IP emails use the wording business supplied for the single
 * consolidated IPR question. Earlier phases keep the body that describes the four separate
 * questions, because those are still answered and can still be submitted.
 *
 * 🛑 PHASE, not portfolio: P25 contains both 2025 and 2026 results.
 */
const IP_EMAIL_2026_WORDING_YEAR = 2026;

@Injectable()
export class SubmissionsService {
  private readonly _logger: Logger = new Logger(SubmissionsService.name);
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _submissionRepository: submissionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultValidationRepository: resultValidationRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _generalInformationIpsrService: IpsrService,
    private readonly _resultInnovationPackageValidationService: ResultsInnovationPackagesValidationModuleService,
    private readonly _notificationService: NotificationService,
    private readonly _userNotificationSettingsService: UserNotificationSettingsService,
    private readonly _intellectualPropertyExpertRepository: IntellectualPropertyExpertRepository,
    private readonly _globalParametersRepository: GlobalParameterRepository,
    private readonly _templateRepository: TemplateRepository,
    private readonly _emailNotificationManagementService: EmailNotificationManagementService,
    private readonly _resultCenterRepository: ResultsCenterRepository,
    private readonly _adUserRepository: AdUserRepository,
  ) {}

  async submitFunction(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const validationError = await this._validateSubmissionPermissions(
        resultId,
        user,
        [RoleEnum.ADMIN, RoleEnum.LEAD, RoleEnum.CO_LEAD, RoleEnum.COORDINATOR],
      );
      if (validationError) {
        return validationError;
      }

      const result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 1,
        status_id: 3,
      });

      await this._createSubmission(
        result.id,
        user.id,
        createSubmissionDto.comment,
      );

      await this._sendIpExpertNotificationsIfNeeded(result, resultId);

      return {
        response: data,
        message: 'the result has been submitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async submitFunctionIPSR(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [3, 4, 5],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const isValid =
        await this._resultInnovationPackageValidationService.getGreenchecksByinnovationPackageSPV2(
          result.id,
        );
      if (!isValid.response.validResult) {
        return {
          response: {},
          message:
            'This result cannot be submit, sections are missing to complete',
          status: HttpStatus.NOT_ACCEPTABLE,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 1,
        status_id: 3,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = true;
      newSubmissions.status_id = 3;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      const ipsr =
        await this._generalInformationIpsrService.findInnovationDetail(
          result.id,
        );

      return {
        response: {
          innoPckg: ipsr.response,
          newSubmissions,
          data,
        },
        message: 'the result has been submitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async unsubmitFunction(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [3, 4, 5],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }
      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!createSubmissionDto?.comment) {
        return {
          response: {},
          message: 'No justification provided',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 0,
        status_id: 1,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = false;
      newSubmissions.status_id = 1;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      return {
        response: data,
        message: 'the result has been unsubmitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async unsubmitFunctionIPSR(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [3, 4, 5],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }
      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!createSubmissionDto?.comment) {
        return {
          response: {},
          message: 'No justification provided',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 0,
        status_id: 1,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = false;
      newSubmissions.status_id = 1;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      const ipsr =
        await this._generalInformationIpsrService.findInnovationDetail(
          result.id,
        );

      return {
        response: {
          innoPckg: ipsr.response,
          data,
        },
        message: 'the result has been unsubmitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async sentNotification(
    result: any,
    user: TokenDto,
    nLevel: NotificationLevelEnum,
    nType: NotificationTypeEnum,
  ) {
    const recipients =
      await this._userNotificationSettingsService.getNotificationUpdatesRecipients(
        result,
      );

    const saveNotification =
      await this._notificationService.emitResultNotification(
        nLevel,
        nType,
        recipients,
        user.id,
        result.id,
      );

    return saveNotification;
  }

  private async _validateSubmissionPermissions(
    resultId: number,
    user: TokenDto,
    allowedRoles: RoleEnum[],
  ) {
    const result = await this._resultRepository.getResultById(resultId);
    const role = await this._roleByUserRepository.validationRolePermissions(
      user.id,
      result?.id || resultId,
      allowedRoles,
    );
    if (!role) {
      return {
        response: {},
        message: 'The user does not have the necessary role for this action.',
        status: HttpStatus.UNAUTHORIZED,
      };
    }
    return null;
  }

  private async _createSubmission(
    resultId: number,
    userId: number,
    comment: string,
  ): Promise<void> {
    const newSubmissions = new Submission();
    newSubmissions.user_id = userId;
    newSubmissions.status = true;
    newSubmissions.status_id = 3;
    newSubmissions.comment = comment;
    newSubmissions.results_id = resultId;
    await this._submissionRepository.save(newSubmissions);
  }

  private async _sendIpExpertNotificationsIfNeeded(
    result: any,
    resultId: number,
  ): Promise<void> {
    const hasContactRequest =
      await this._resultRepository.getResultInnovationDevelopmentByResultId(
        result.id,
      );
    if (result.result_type_id !== 7 || !hasContactRequest) {
      return;
    }

    await this._sendIpExpertEmails(result, resultId);
  }

  private async _sendIpExpertEmails(
    result: any,
    resultId: number,
  ): Promise<void> {
    const emails =
      await this._intellectualPropertyExpertRepository.getIpExpertsEmailsByResultId(
        result.id,
      );

    const emailData = await this._prepareEmailData(result, resultId);
    if (!emailData) {
      return;
    }

    if (!emails || emails.length === 0) {
      this._logger.warn('No IP experts emails found');
      return;
    }

    const scienceProgram =
      await this._resultRepository.getScienceProgramByResultId(resultId);
    const sp = scienceProgram[0];

    for (const email of emails) {
      await this._sendEmailToIpExpert(email, sp, emailData);
    }

    // P2-3272 email 2. Sent after the specialists, and only once, telling the Lead Contact
    // Person who was contacted. Skipped silently for earlier phases: this email did not exist
    // before 2026 and nobody was promised it.
    await this._sendIpSupportConfirmation(emails, sp, emailData);
  }

  /**
   * P2-3272 email 2 — confirmation to the Lead Contact Person that the referral went out.
   *
   * Never throws. It runs after the submission has already been recorded and after the emails
   * that the reporter actually depends on, so a failure here must not surface as a failed submit.
   */
  private async _sendIpSupportConfirmation(
    expertEmails: any[],
    sp: any,
    emailData: any,
  ): Promise<void> {
    if (!emailData?.usesNewWording) {
      return;
    }

    const recipient = emailData.leadContactPerson;
    if (!recipient?.mail) {
      this._logger.warn(
        'No lead contact person to confirm the IP referral to. Skipping the confirmation email.',
      );
      return;
    }

    if (!emailData.confirmationTemplate) {
      this._logger.warn(
        'IP support confirmation template not found. Skipping the confirmation email.',
      );
      return;
    }

    // "Referral sent to: [Center IP Focal Point Name(s) / Email(s)]" — the story asks for both.
    const referralRecipients =
      expertEmails
        .map((e) => {
          const name = `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim();
          return name ? `${name} &lt;${e.email}&gt;` : e.email;
        })
        .filter(Boolean)
        .join(', ') || 'the Centre IP Focal Point';

    try {
      const compiledTemplate = handlebars.compile(
        emailData.confirmationTemplate.template,
      );

      this._emailNotificationManagementService.sendEmail({
        from: {
          email: process.env.EMAIL_SENDER,
          name: 'PRMS Reporting Tool -',
        },
        emailBody: {
          subject: `PRMS – Your IP Support Request Has Been Referred | Result Code: ${emailData.result.result_code}`,
          to: [recipient.mail],
          cc: [],
          bcc: emailData.bccEmails?.value,
          message: {
            text: 'IP support request referred',
            socketFile: compiledTemplate({
              contactPersonName: recipient.display_name?.trim() || 'colleague',
              resultTitle: emailData.result.title,
              resultCode: emailData.result.result_code,
              resultUrl: `${process.env.RESULTS_URL}${emailData.result.result_code}/general-information?phase=${emailData.result.version_id}`,
              spName: sp?.name,
              spCode: sp?.official_code,
              referralRecipients,
            }),
          },
        },
      });
    } catch (error) {
      this._logger.warn(
        `Failed to send the IP support confirmation email: ${error.message}`,
      );
    }
  }

  private async _prepareEmailData(result: any, resultId: number) {
    const leadCenter = await this._resultCenterRepository.findOne({
      where: { result_id: result.id, is_leading_result: true },
      relations: {
        clarisa_center_object: {
          clarisa_institution: true,
        },
      },
    });

    const contactPerson = await this._submissionRepository
      .createQueryBuilder('s')
      .leftJoin('users', 'u', 'u.id = s.user_id')
      .where('s.results_id = :resultId', { resultId })
      .andWhere('s.is_active = true')
      .select([
        'u.first_name as first_name',
        'u.last_name as last_name',
        'u.email as email',
      ])
      .getRawMany();

    const contributingCentersList = await this._resultCenterRepository.find({
      where: {
        result_id: result.id,
        is_active: true,
      },
      relations: {
        clarisa_center_object: {
          clarisa_institution: true,
        },
      },
    });

    const contributingCenters =
      contributingCentersList
        .filter((center) => !center.is_leading_result)
        .map(
          (center) =>
            center.clarisa_center_object?.clarisa_institution?.acronym,
        )
        .filter(Boolean)
        .join(', ') || 'N/A';

    const bccEmails = await this._globalParametersRepository.findOne({
      where: { name: 'technical_team_email' },
      select: { value: true },
    });

    const usesNewWording =
      Number(result?.phase_year ?? 0) >= IP_EMAIL_2026_WORDING_YEAR;

    const template = await this._templateRepository.findOne({
      where: {
        name: usesNewWording
          ? EmailTemplate.IP_EXPERTS_SUPPORT_2026
          : EmailTemplate.IP_EXPERTS_SUPPORT,
      },
    });
    if (!template) {
      this._logger.warn(
        'IP experts email template not found. Skipping notification.',
      );
      return null;
    }

    // Only for the new wording, and looked up separately because the confirmation email goes to
    // this person, not to the submitter. `contactPerson` above is whoever pressed Submit; the
    // Lead Contact Person is a field of General Information and the two are often different.
    const leadContactPerson = usesNewWording
      ? await this._findLeadContactPerson(result)
      : null;

    const confirmationTemplate = usesNewWording
      ? await this._templateRepository.findOne({
          where: { name: EmailTemplate.IP_SUPPORT_CONFIRMATION_2026 },
        })
      : null;

    if (!leadCenter) {
      this._logger.warn('No lead center found for result');
    }

    return {
      result,
      leadCenter,
      contactPerson,
      contributingCenters,
      bccEmails,
      template,
      usesNewWording,
      leadContactPerson,
      confirmationTemplate,
    };
  }

  /**
   * The Lead Contact Person recorded in General Information.
   *
   * Fails soft on purpose: this runs inside a submission, and an unreadable contact must never
   * cost the reporter their submit. A null here means the confirmation email is skipped and a
   * warning is logged — the request to the IP specialist still goes out, which is the half that
   * matters to the reporter.
   */
  private async _findLeadContactPerson(result: any): Promise<any | null> {
    if (!result?.lead_contact_person_id) {
      return null;
    }

    try {
      return await this._adUserRepository.findOne({
        where: { id: result.lead_contact_person_id, is_active: true },
      });
    } catch (error) {
      this._logger.warn(
        `Failed to resolve the lead contact person for result ${result?.id}: ${error.message}`,
      );
      return null;
    }
  }

  /** "Name <mail>" for the Lead Contact Person, or null when there is nothing usable. */
  private _formatLeadContact(person: any): string | null {
    if (!person?.mail) {
      return null;
    }

    const name = person.display_name?.trim();
    return name ? `${name} <${person.mail}>` : person.mail;
  }

  private async _sendEmailToIpExpert(
    email: any,
    sp: any,
    emailData: any,
  ): Promise<void> {
    const leadCenterName =
      emailData.leadCenter?.clarisa_center_object?.clarisa_institution?.name;
    const leadCenterAcronym =
      emailData.leadCenter?.clarisa_center_object?.clarisa_institution?.acronym;
    const contactPersonInfo =
      emailData.contactPerson &&
      emailData.contactPerson.length > 0 &&
      emailData.contactPerson[0]
        ? `${emailData.contactPerson[0].first_name} ${emailData.contactPerson[0].last_name} <${emailData.contactPerson[0].email}>`
        : 'N/A';

    const emailPayload = {
      userName: `${email.first_name} ${email.last_name}`.trim(),
      spCode: sp.official_code,
      spName: sp.name,
      resultUrl: `${process.env.RESULTS_URL}${emailData.result.result_code}/general-information?phase=${emailData.result.version_id}`,
      // P2-3272 asks for the record id in the body, not only inside the link.
      resultCode: emailData.result.result_code,
      resultTitle: emailData.result.title,
      leadCenter: leadCenterName || undefined,
      // The 2026 wording says "Requesting user", and business means the Lead Contact Person of
      // General Information — not whoever pressed Submit. Falls back to the submitter when the
      // contact could not be resolved, so the specialist always has somebody to write to.
      contactPerson: emailData.usesNewWording
        ? (this._formatLeadContact(emailData.leadContactPerson) ??
          contactPersonInfo)
        : contactPersonInfo,
      contributingCenters: emailData.contributingCenters,
    };

    const compiledTemplate = handlebars.compile(emailData.template.template);
    let subject = `PRMS – IP Support Request for Innovation Development Result | Result Code: ${emailData.result.result_code}`;
    if (leadCenterName) {
      subject += ` | Lead Center: ${leadCenterAcronym}`;
    }

    this._emailNotificationManagementService.sendEmail({
      from: {
        email: process.env.EMAIL_SENDER,
        name: 'PRMS Reporting Tool -',
      },
      emailBody: {
        subject: subject,
        to: [email.email],
        cc: [],
        bcc: emailData.bccEmails.value,
        message: {
          text: 'Account roles updated',
          socketFile: compiledTemplate(emailPayload),
        },
      },
    });
  }
}
