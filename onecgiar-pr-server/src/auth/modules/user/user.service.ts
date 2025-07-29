import {
  Injectable,
  HttpStatus,
  HttpException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { returnFormatUser } from './dto/return-create-user.dto';
import { UserRepository } from './repositories/user.repository';
import { BcryptPasswordEncoder } from '../../utils/bcrypt.util';
import { RoleByUserRepository } from '../role-by-user/RoleByUser.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import {
  HandlersError,
  returnErrorDto,
} from '../../../shared/handlers/error.utils';
import { Brackets, Not } from 'typeorm';
import { AuthMicroserviceService } from '../../../shared/microservices/auth-microservice/auth-microservice.service';
import { TemplateRepository } from '../../../api/platform-report/repositories/template.repository';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import * as handlebars from 'handlebars';
import { ActiveDirectoryService } from '../../services/active-directory.service';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { ROLE_IDS } from './constants/roles';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleRepository } from '../role/Role.repository';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RoleByUser } from '../role-by-user/entities/role-by-user.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Injectable()
export class UserService {
  private readonly cgiarRegex: RegExp = /@cgiar\.org/i;

  constructor(
    @InjectRepository(User)
    private readonly _userRepository: UserRepository,
    private readonly _customUserRespository: UserRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _handlersError: HandlersError,
    private readonly _awsCognitoService: AuthMicroserviceService,
    private readonly _templateRepository: TemplateRepository,
    private readonly activeDirectoryService: ActiveDirectoryService,
    private readonly _emailNotificationManagementService: EmailNotificationManagementService,
    private readonly clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _roleRepository: RoleRepository,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  create(createUserDto: CreateUserDto) {
    return createUserDto;
  }

  async createFull(
    createUserDto: CreateUserDto,
    token: TokenDto,
  ): Promise<returnFormatUser | returnErrorDto> {
    try {
      await this.validateUserInput(createUserDto);

      const exists = await this.findOneByEmail(createUserDto.email);
      if (exists.response) {
        throw {
          response: {},
          message: 'The user already exists in the system',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // true if the platform (not Cognito) must send the confirmation email.
      // This happens for CGIAR users or when Cognito user already exists.
      let shouldSendConfirmationEmail = true;

      if (createUserDto.is_cgiar) {
        shouldSendConfirmationEmail = await this.handleCgiarUser(createUserDto);
      } else {
        await this.handleNonCgiarUser(createUserDto);
        shouldSendConfirmationEmail =
          await this.registerInCognitoIfNeeded(createUserDto);
      }

      const savedUser = await this.saveUserToDB(createUserDto, token);
      if (shouldSendConfirmationEmail) {
        await this.sendAccountConfirmationEmail(createUserDto);
      }

      return savedUser;
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private async validateUserInput(createUserDto: CreateUserDto): Promise<void> {
    const isCgiarEmail = this.cgiarRegex.test(createUserDto.email);
    if (!createUserDto.is_cgiar && isCgiarEmail) {
      throw {
        response: {},
        message: 'Non-CGIAR user cannot have a CGIAR email address',
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }

  private async handleCgiarUser(
    createUserDto: CreateUserDto,
  ): Promise<boolean> {
    try {
      if (!this.cgiarRegex.test(createUserDto.email)) {
        throw new HttpException(
          'The user does not have a CGIAR email address.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const userFromAD = await this.activeDirectoryService.getUserDetails(
        createUserDto.email,
      );

      if (!userFromAD) {
        throw new NotFoundException(
          'No information was found for this CGIAR user.',
        );
      }

      createUserDto.first_name = userFromAD.givenName || 'CGIAR';
      createUserDto.last_name = userFromAD.sn || 'User';

      if (
        !createUserDto.role_platform ||
        createUserDto.role_assignments.length === 0
      ) {
        createUserDto.role_platform = 2;
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Unexpected error while handling CGIAR user.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async handleNonCgiarUser(
    createUserDto: CreateUserDto,
  ): Promise<void> {
    if (!createUserDto.first_name || !createUserDto.last_name) {
      throw new BadRequestException(
        'Some fields contain errors or are incomplete. Please review your input.',
      );
    }
    createUserDto.role_platform = 2;
  }

  private async registerInCognitoIfNeeded(
    createUserDto: CreateUserDto,
  ): Promise<boolean> {
    const templateDB = await this._templateRepository.findOne({
      where: { name: EmailTemplate.ACCOUNT_CONFIRMATION },
    });

    if (!templateDB) {
      throw new Error('Email template ACCOUNT_CONFIRMATION not found');
    }

    const template = handlebars.compile(templateDB.template);
    const assignedRolesMessage = await this.buildAssignedRolesMessage(
      createUserDto.role_assignments,
    );

    const templateData: Record<string, any> = {
      logoUrl: '{{logoUrl}}',
      appName: '{{appName}}',
      firstName: '{{firstName}}',
      lastName: '{{lastName}}',
      tempPassword: '{{tempPassword}}',
      email: '{{email}}',
      appUrl: '{{appUrl}}',
      supportEmail: '{{supportEmail}}',
      senderName: '{{senderName}}',
    };
    if (
      createUserDto.role_assignments &&
      createUserDto.role_assignments.length > 0
    ) {
      templateData.assignedRolesSummary = assignedRolesMessage;
    }

    const htmlString = template(templateData);

    const cognitoPayload = {
      username: createUserDto.email,
      email: createUserDto.email,
      firstName: createUserDto.first_name,
      lastName: createUserDto.last_name,
      emailConfig: {
        sender_email: process.env.EMAIL_SENDER,
        sender_name: 'PRMS Team',
        welcome_subject:
          'Welcome to the PRMS Reporting Tool – Your Account Details',
        app_name: 'PRMS Reporting Tool',
        app_url: 'https://reporting.cgiar.org/',
        support_email: 'PRMSTechSupport@cgiar.org',
        logo_url:
          'https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.svg',
        welcome_html_template: htmlString,
      },
    };

    try {
      await this._awsCognitoService.createUser(cognitoPayload);
      return false;
    } catch (error) {
      const isUserExistsError =
        error?.name === 'UsernameExistsException' ||
        error?.message?.includes('exists');

      if (!isUserExistsError) {
        console.error(error);
        throw {
          response: { error },
          message: 'Error while creating user',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      return true;
    }
  }

  private async saveUserToDB(
    createUserDto: CreateUserDto,
    token: TokenDto,
  ): Promise<returnFormatUser> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    console.log('User to save:', createUserDto);

    try {
      const currentUser = await this._userRepository.findOne({
        where: { id: token.id },
      });

      if (createUserDto.role_assignments?.length) {
        const seenEntities = new Set<number>();
        for (const assignment of createUserDto.role_assignments) {
          if (seenEntities.has(assignment.entity_id)) {
            throw new BadRequestException(
              `Each user can only have one role per entity.`,
            );
          }
          seenEntities.add(assignment.entity_id);
        }
      }

      createUserDto.created_by = currentUser?.id || null;
      createUserDto.last_updated_by = currentUser?.id || null;

      const newUser = await queryRunner.manager.save(User, createUserDto);

      if (
        !createUserDto.role_assignments ||
        createUserDto.role_assignments.length === 0
      ) {
        await queryRunner.manager.save(RoleByUser, {
          role: createUserDto?.role_platform || ROLE_IDS.GUEST,
          user: newUser.id,
          created_by: currentUser?.id,
          last_updated_by: currentUser?.id,
        });
      }

      if (createUserDto.role_assignments?.length) {
        for (const assignment of createUserDto.role_assignments) {
          const { role_id, entity_id } = assignment;

          const existingAssignment = await queryRunner.manager.findOne(
            RoleByUser,
            {
              where: { user: newUser.id, initiative_id: entity_id },
            },
          );

          if (existingAssignment) {
            throw new BadRequestException(
              `The user already has a role in the selected entity. Only one role per entity is allowed.`,
            );
          }

          const entity = await queryRunner.manager.findOne(ClarisaInitiative, {
            where: { id: entity_id },
            relations: ['obj_portfolio'],
          });

          const portfolioIsActive = entity?.obj_portfolio?.isActive ?? true;
          const isExternal = !createUserDto.is_cgiar;

          if (isExternal && role_id !== ROLE_IDS.MEMBER) {
            throw new BadRequestException(
              `External users can only be assigned the "Member" role.`,
            );
          }

          if (!portfolioIsActive && role_id !== ROLE_IDS.MEMBER) {
            throw new BadRequestException(
              `Only "Member" role is allowed in inactive portfolios.`,
            );
          }

          if ([ROLE_IDS.LEAD, ROLE_IDS.COLEAD].includes(role_id)) {
            const existingLead = await queryRunner.manager.findOne(RoleByUser, {
              where: { initiative_id: entity_id, role: role_id },
              relations: ['obj_user'],
            });

            if (existingLead) {
              throw new BadRequestException(
                `This entity already has a ${role_id === ROLE_IDS.LEAD ? 'Lead' : 'Co-Lead'} assigned.`,
              );
            }
          }

          await queryRunner.manager.save(RoleByUser, {
            role: role_id,
            user: newUser.id,
            initiative_id: entity_id,
            created_by: currentUser?.id,
            last_updated_by: currentUser?.id,
          });

          console.log(
            `Role ${role_id} assigned to user ${newUser.id} for entity ${entity_id}`,
          );
        }
      }

      await queryRunner.commitTransaction();
      return {
        response: {
          id: newUser.id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
        } as User,
        message: 'The user has been successfully created',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async sendAccountConfirmationEmail(
    createUserDto: CreateUserDto,
  ): Promise<void> {
    const confirmationTemplateDB = await this._templateRepository.findOne({
      where: { name: EmailTemplate.ACCOUNT_CONFIRMATION },
    });

    if (!confirmationTemplateDB) {
      throw new Error('Email template ACCOUNT_CONFIRMATION not found');
    }

    const compiledTemplate = handlebars.compile(
      confirmationTemplateDB.template,
    );

    const assignedRolesMessage = await this.buildAssignedRolesMessage(
      createUserDto.role_assignments,
    );

    const emailData: Record<string, any> = {
      logoUrl:
        'https://prms-file-storage.s3.amazonaws.com/email-images/Email_PRMS_Header.png',
      appName: 'PRMS Reporting Tool',
      firstName: createUserDto.first_name,
      lastName: createUserDto.last_name,
      email: createUserDto.email,
      appUrl: 'https://reporting.cgiar.org/',
      supportEmail: 'PRMSTechSupport@cgiar.org',
      senderName: 'PRMS Team',
      isCgiar: createUserDto.is_cgiar,
    };
    if (
      createUserDto.role_assignments &&
      createUserDto.role_assignments.length > 0
    ) {
      emailData.assignedRolesSummary = assignedRolesMessage;
    }

    this._emailNotificationManagementService.sendEmail({
      from: {
        email: process.env.EMAIL_SENDER,
        name: 'PRMS Reporting Tool -',
      },
      emailBody: {
        subject: 'Welcome to the PRMS Reporting Tool – Your Account Details',
        to: [createUserDto.email],
        cc: [],
        bcc: '',
        message: {
          text: 'Account creation confirmation',
          socketFile: compiledTemplate(emailData),
        },
      },
    });
  }

  private async buildAssignedRolesMessage(
    roleAssignments: { entity_id: number; role_id: number }[] | undefined,
  ): Promise<string> {
    const [entities = [], roles = []] = await Promise.all([
      this.clarisaInitiativesRepository.find(),
      this._roleRepository.find(),
    ]);

    const entityMap = new Map(entities.map((e) => [e.id, e]));
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    if (roleAssignments?.length > 0) {
      const assignmentsDetails: string[] = [];

      for (const assignment of roleAssignments) {
        const entity = entityMap.get(assignment.entity_id);
        const role = roleMap.get(assignment.role_id);

        if (entity && role) {
          assignmentsDetails.push(
            `${role.description} in ${entity.official_code}, `,
          );
        }
      }

      if (assignmentsDetails.length > 0) {
        return `${assignmentsDetails.map((item) => `${item}`).join('')}`;
      }
    }

    return 'No roles assigned.';
  }

  async findAll(): Promise<returnFormatUser | returnErrorDto> {
    try {
      const user: User[] = await this._userRepository.find({
        select: [
          'id',
          'first_name',
          'last_name',
          'email',
          'is_cgiar',
          'last_login',
          'active',
          'created_by',
          'created_date',
          'last_updated_by',
          'last_updated_date',
        ],
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getAllUsers() {
    try {
      const query = ` SELECT  
        first_name AS "firstName",
        last_name AS "lastName",
        email AS "emailAddress",
        CASE 
            WHEN is_cgiar = 1 THEN 'Yes'
            ELSE 'No'
        END AS "cgIAR",
        CASE 
            WHEN active = 1 THEN 'Active'
            ELSE 'Inactive'
        END AS "userStatus",
        created_date AS "userCreationDate"
      FROM 
        users
      ORDER BY 
        created_date DESC;`;
      const user: User[] = await this._userRepository.query(query);
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async searchUsers(filters: {
    user?: string;
    cgIAR?: 'Yes' | 'No';
    status?: 'Active' | 'Inactive' | 'Read Only';
    entityIds?: number[];
  }) {
    try {
      const { user, cgIAR, status, entityIds } = filters;
      const query = this._userRepository
        .createQueryBuilder('users')
        .leftJoin(
          'role_by_user',
          'rbu',
          'rbu.user = users.id AND rbu.active = 1',
        )
        .leftJoin('clarisa_initiatives', 'ent', 'ent.id = rbu.initiative_id')
        .select([
          'users.first_name AS "firstName"',
          'users.last_name AS "lastName"',
          'users.email AS "emailAddress"',
          `CASE WHEN users.is_cgiar = 1 THEN 'Yes' ELSE 'No' END AS "cgIAR"`,
          `
          CASE 
            WHEN users.active = 0 THEN 'Inactive'
            WHEN users.is_cgiar = 1 
              AND COUNT(DISTINCT rbu.role) = 1 
              AND MAX(rbu.role) = 2 
              AND COUNT(rbu.initiative_id) = 0 THEN 'Read Only'
            WHEN users.is_cgiar = 1 
              AND (COUNT(rbu.initiative_id) > 0 OR (MAX(rbu.role) IS NOT NULL AND MAX(rbu.role) <> 2)) THEN 'Active'
            WHEN users.is_cgiar = 0 
              AND users.active = 1 
              AND (COUNT(rbu.initiative_id) > 0 OR (MAX(rbu.role) IS NOT NULL)) THEN 'Active'
            ELSE 'Inactive'
          END AS "userStatus"
          `,
          'users.created_date AS "userCreationDate"',
          `
            GROUP_CONCAT(DISTINCT ent.official_code ORDER BY ent.official_code SEPARATOR ', ' )
            AS "entities"
          `,
        ])
        .groupBy('users.id');

      if (user && user.trim() !== '') {
        const keywords = user.trim().split(/\s+/);

        query.andWhere(
          new Brackets((qb) => {
            // Search by first name, last name, email (single or multiple keywords)
            if (keywords.length === 1) {
              const word = `%${keywords[0]}%`;

              qb.where('users.first_name LIKE :word', { word })
                .orWhere('users.last_name LIKE :word', { word })
                .orWhere('users.email LIKE :word', { word });
            } else {
              // Try to match first and last name in any order
              const first = `%${keywords[0]}%`;
              const last = `%${keywords[1]}%`;

              qb.where(
                '(users.first_name LIKE :firstName AND users.last_name LIKE :lastName)',
                {
                  firstName: first,
                  lastName: last,
                },
              ).orWhere(
                '(users.first_name LIKE :lastName2 AND users.last_name LIKE :firstName2)',
                {
                  firstName2: last,
                  lastName2: first,
                },
              );

              // Try to match users with two names (first_name with two words)
              const firstTwo = `%${keywords.slice(0, 2).join(' ')}%`;
              qb.orWhere('users.first_name LIKE :firstTwo', { firstTwo });

              if (keywords.length >= 3) {
                // Try to match first_name with three words
                const firstThree = `%${keywords.slice(0, 3).join(' ')}%`;
                qb.orWhere('users.first_name LIKE :firstThree', { firstThree });
              }
            }

            // Date-based search
            const yearRegex = /^\d{4}$/;
            const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
            const fullDateRegex = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

            if (fullDateRegex.test(user)) {
              qb.orWhere('DATE(users.created_date) = :dateCondition', {
                dateCondition: user,
              });
            } else if (yearMonthRegex.test(user)) {
              const [year, month] = user.split('-').map(Number);
              const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
              const endDate = new Date(year, month, 0)
                .toISOString()
                .split('T')[0];

              qb.orWhere('users.created_date BETWEEN :startDate AND :endDate', {
                startDate: startDate + ' 00:00:00',
                endDate: endDate + ' 23:59:59',
              });
            } else if (yearRegex.test(user)) {
              const startDate = `${user}-01-01`;
              const endDate = `${user}-12-31`;

              qb.orWhere('users.created_date BETWEEN :startDate AND :endDate', {
                startDate: startDate + ' 00:00:00',
                endDate: endDate + ' 23:59:59',
              });
            }
          }),
        );
      }

      if (cgIAR) {
        query.andWhere('users.is_cgiar = :isCgiar', {
          isCgiar: cgIAR.toLowerCase() === 'yes' ? 1 : 0,
        });
      }

      if (entityIds && entityIds.length > 0) {
        query.andWhere(
          (qb) => {
            const subQuery = qb
              .subQuery()
              .select('rbu_sub.user')
              .from('role_by_user', 'rbu_sub')
              .where('rbu_sub.initiative_id IN (:...entityIds)')
              .andWhere('rbu_sub.active = 1')
              .getQuery();
            return 'users.id IN ' + subQuery;
          },
          { entityIds },
        );
      }

      query
        .groupBy('users.id')
        .addGroupBy('users.first_name')
        .addGroupBy('users.last_name')
        .addGroupBy('users.email')
        .addGroupBy('users.is_cgiar')
        .addGroupBy('users.active')
        .addGroupBy('users.created_date');

      if (status) {
        query.having(`userStatus = :status`, { status });
      }

      query.orderBy('userCreationDate', 'DESC');

      const usersResp: User[] = await query.getRawMany();

      const users = usersResp.map((user: any) => ({
        ...user,
        entities: user.entities
          ? user.entities.split(', ').map((code: string) => code.trim())
          : [],
      }));

      if (users.length === 0) {
        return {
          response: [],
          message: 'No users match the entered criteria',
          status: HttpStatus.NOT_FOUND,
        };
      }
      return {
        response: users,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOne(id: number): Promise<returnFormatUser | returnErrorDto> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: id },
      });

      if (!user) {
        throw new HttpException('User Not found', HttpStatus.NOT_FOUND);
      }

      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneByEmail(
    email: string,
  ): Promise<returnFormatUser | returnErrorDto> {
    try {
      const user: User = await this._customUserRespository.findOne({
        where: { email: email },
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findInitiativeByUserId(
    userId: number,
  ): Promise<returnErrorDto | returnFormatUser> {
    try {
      const initiativeByUser =
        await this._customUserRespository.InitiativeByUser(userId);

      return {
        response: initiativeByUser,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async lastPopUpViewed(
    userId: number,
  ): Promise<returnErrorDto | returnFormatUser> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw {
          response: {},
          message: 'User Not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      user.last_updated_by = user.id;
      await this._userRepository.save(user);

      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async updateUserStatus(
    userEmail: string,
    dto: ChangeUserStatusDto,
    token: TokenDto,
  ): Promise<returnErrorDto | returnFormatUser> {
    const cleanEmail = userEmail?.trim().toLowerCase();

    if (!cleanEmail) {
      throw new BadRequestException('Invalid or missing email');
    }

    const user = await this.findUserWithRelations(cleanEmail);
    const isActive = await this._roleByUserRepository.findOne({
      where: {
        user: user.id,
        active: true,
        role: Not(2),
      },
    });

    const currentUser = await this._userRepository.findOne({
      where: { id: token.id },
    });

    if (dto.activate) {
      if (isActive) {
        return {
          response: { id: user.id, email: user.email },
          message: 'User is already active',
          status: HttpStatus.OK,
        };
      }
      return this.activateUser(user, dto, currentUser);
    } else {
      if (!isActive) {
        return {
          response: { id: user.id, email: user.email },
          message: 'User is already deactivated',
          status: HttpStatus.OK,
        };
      }
      if (user.is_cgiar) {
        return this.deactivateCgiarUser(user, currentUser);
      } else {
        return this.deactivateExternalUser(user, currentUser);
      }
    }
  }

  private async findUserWithRelations(userEmail: string): Promise<User> {
    const cleanEmail = userEmail.trim().toLowerCase();

    const user = await this._userRepository.findOne({
      where: { email: cleanEmail },
      relations: ['obj_role_by_user', 'obj_role_by_user.obj_role'],
    });

    if (!user || !user.email) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async activateUser(
    user: User,
    dto: ChangeUserStatusDto,
    currentUser: User,
  ): Promise<returnErrorDto | returnFormatUser> {
    try {
      const needsRoles = !dto.role_assignments?.length && !dto.role_platform;

      if (needsRoles) {
        throw new BadRequestException(
          'To activate a user, you must provide at least one entity-role pair or an Admin role',
        );
      }

      user.active = true;
      const newUser = await this._userRepository.save(user);

      const roleAssignments = [];

      if (dto.role_assignments?.length) {
        for (const item of dto.role_assignments) {
          roleAssignments.push({
            user: newUser.id,
            role: item.role_id,
            initiative_id: item.entity_id,
            created_by: currentUser.id,
            last_updated_by: currentUser.id,
          });
        }
      }

      if (dto.role_platform) {
        roleAssignments.push({
          user: newUser.id,
          role: dto.role_platform,
          created_by: currentUser.id,
          last_updated_by: currentUser.id,
        });
      }

      await this._roleByUserRepository.save(roleAssignments);
      return {
        response: { id: user.id, email: user.email },
        message: user.is_cgiar
          ? 'CGIAR user activated successfully'
          : 'External user activated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private async deactivateCgiarUser(
    user: User,
    currentUser: User,
  ): Promise<returnErrorDto | returnFormatUser> {
    const guestRole = 2; //2 is the ID for the Guest role

    await this._roleByUserRepository.update(
      { user: user.id },
      { active: false, last_updated_by: currentUser.id },
    );

    await this._roleByUserRepository.save({
      user: user.id,
      role: guestRole,
      active: true,
    });

    return {
      response: { id: user.id, email: user.email },
      message: 'User deactivated successfully',
      status: HttpStatus.OK,
    };
  }

  private async deactivateExternalUser(
    user: User,
    currentUser: User,
  ): Promise<returnErrorDto | returnFormatUser> {
    await this._roleByUserRepository.update(
      { user: user.id },
      { active: false, last_updated_by: currentUser.id },
    );

    user.active = false;
    await this._userRepository.save(user);

    return {
      response: { id: user.id, email: user.email },
      message: 'External user deactivated successfully',
      status: HttpStatus.OK,
    };
  }

  /**
   * Create or update user based on information from the authentication microservice
   * @param userInfo User information from the microservice
   * @returns Created or updated user
   */
  async createOrUpdateUserFromAuthProvider(userInfo: any): Promise<User> {
    const logger = new Logger('createOrUpdateUserFromAuthProvider');

    try {
      if (!userInfo || !userInfo.email) {
        throw new Error('Invalid user information in auth response');
      }

      const email = userInfo.email.toLowerCase().trim();

      logger.log(`Checking if user exists: ${email}`);
      const user = await this._userRepository.findOne({
        where: { email, active: true },
        relations: ['obj_role_by_user'],
      });

      if (user) {
        logger.log(`User found in database: ${email}`);
        await this._userRepository.update(
          {
            id: user.id,
            email: user.email,
          },
          {
            last_login: new Date(),
          },
        );
        return user;
      }

      logger.log(`Creating new user from authentication provider: ${email}`);
      const newUser = new User();
      newUser.email = email;
      newUser.first_name =
        userInfo.given_name ?? userInfo.name?.split(' ')[0] ?? 'User';
      newUser.last_name =
        userInfo.family_name ??
        userInfo.name?.split(' ').slice(1).join(' ') ??
        '';
      newUser.is_cgiar = email.endsWith('@cgiar.org');
      newUser.active = true;

      const savedUser = await this._userRepository.save(newUser);
      logger.log(`User created: ${email} (ID: ${savedUser.id})`);

      await this._roleByUserRepository.createGuestRoleForUser(savedUser.id);
      logger.log(`GUEST role assigned to user: ${email}`);

      return this._userRepository.findOne({
        where: { id: savedUser.id },
        relations: ['obj_role_by_user'],
      });
    } catch (error) {
      logger.error(
        `Error creating/updating user: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to create or update user: ${error.message}`);
    }
  }
}
