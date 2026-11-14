// @akili-spec changes/rir-center-focal-routing
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClarisaCenter } from '../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import {
  CreateCenterFocalPointDto,
  UpdateCenterFocalPointDto,
} from './dto/upsert-center-focal-point.dto';
import { UpdateCenterRoutingDto } from './dto/update-center-routing.dto';
import { CenterMelFocalPoint } from './entities/center-mel-focal-point.entity';
import { CenterReminderRouting } from './entities/center-reminder-routing.entity';

const UNIQUE_INDEX = 'UQ_rir_center_mel_center_email';
const MYSQL_DUP_ENTRY = 1062;

export interface CenterFocalPointView {
  id: number;
  name: string | null;
  email: string;
  is_active: boolean;
}

export interface CenterRoutingView {
  code: string;
  acronym: string | null;
  name: string | null;
  route_all_to_center: boolean;
  contacts: CenterFocalPointView[];
}

export interface CenterRoutingUpdateView {
  center_code: string;
  route_all_to_center: boolean;
  active_contacts: number;
  warning: string | null;
}

/**
 * `RCF-T-3` — admin operations over the Center focal points and the per-Center opt-in
 * (design §6, `RCF-DD-4`). Contacts are never hard-deleted (`RCF-R-7`): deactivation is
 * `is_active = false`, which the dispatcher already honours (P-4).
 *
 * Errors are Nest `HttpException`s (rendered by the global `HttpExceptionFilter`). Nothing here
 * logs, so an address never reaches a log line.
 */
@Injectable()
export class CenterFocalPointsService {
  constructor(
    @InjectRepository(CenterMelFocalPoint)
    private readonly _contactRepository: Repository<CenterMelFocalPoint>,
    @InjectRepository(CenterReminderRouting)
    private readonly _routingRepository: Repository<CenterReminderRouting>,
    @InjectRepository(ClarisaCenter)
    private readonly _centerRepository: Repository<ClarisaCenter>,
  ) {}

  /**
   * Every active CGIAR Center (`clarisa_center.is_active`), configured or not, so an admin can set
   * up a Center that has no row yet. An inactive Center is listed only when it already has contacts
   * or a routing row, so existing data is never hidden.
   */
  async list(): Promise<CenterRoutingView[]> {
    const [centers, contacts, routings] = await Promise.all([
      this._centerRepository.find({ relations: { clarisa_institution: true } }),
      this._contactRepository.find({ order: { id: 'ASC' } }),
      this._routingRepository.find(),
    ]);

    const contactsByCenter = new Map<string, CenterFocalPointView[]>();
    for (const contact of contacts) {
      const bucket = contactsByCenter.get(contact.center_code) ?? [];
      bucket.push(this.toContactView(contact));
      contactsByCenter.set(contact.center_code, bucket);
    }
    const routingByCenter = new Map(
      routings.map((r) => [r.center_code, !!r.route_all_to_center]),
    );

    return centers
      .filter(
        (c) =>
          c.isActive ||
          contactsByCenter.has(c.code) ||
          routingByCenter.has(c.code),
      )
      .map((c) => ({
        code: c.code,
        acronym: c.clarisa_institution?.acronym ?? null,
        name: c.clarisa_institution?.name ?? null,
        route_all_to_center: routingByCenter.get(c.code) ?? false,
        contacts: contactsByCenter.get(c.code) ?? [],
      }))
      .sort((a, b) =>
        (a.acronym || a.name || a.code).localeCompare(
          b.acronym || b.name || b.code,
        ),
      );
  }

  async create(
    dto: CreateCenterFocalPointDto,
    userId?: number,
  ): Promise<CenterFocalPointView> {
    await this.assertCenterExists(dto.center_code);
    await this.assertNoDuplicate(dto.center_code, dto.email);
    const row = this._contactRepository.create({
      center_code: dto.center_code,
      name: dto.name ?? null,
      email: dto.email,
      is_active: true,
      created_by: userId,
      last_updated_by: userId,
    });
    return this.toContactView(await this.saveContact(row));
  }

  async update(
    id: number,
    dto: UpdateCenterFocalPointDto,
    userId?: number,
  ): Promise<CenterFocalPointView> {
    const row = await this._contactRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Center focal point not found');

    if (dto.email !== undefined && dto.email !== row.email) {
      await this.assertNoDuplicate(row.center_code, dto.email, id);
      row.email = dto.email;
    }
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.is_active !== undefined) row.is_active = dto.is_active;
    row.last_updated_by = userId;
    return this.toContactView(await this.saveContact(row));
  }

  /** Upserts the Center's `center_reminder_routing` row (`RCF-R-8`). */
  async setRouting(
    code: string,
    dto: UpdateCenterRoutingDto,
    userId?: number,
  ): Promise<CenterRoutingUpdateView> {
    await this.assertCenterExists(code);
    const flag = dto.route_all_to_center ? 1 : 0;
    const existing = await this._routingRepository.findOne({
      where: { center_code: code },
    });
    if (existing) {
      existing.route_all_to_center = flag;
      existing.last_updated_by = userId;
      await this._routingRepository.save(existing);
    } else {
      await this._routingRepository.save(
        this._routingRepository.create({
          center_code: code,
          route_all_to_center: flag,
          is_active: true,
          created_by: userId,
          last_updated_by: userId,
        }),
      );
    }

    const activeContacts = await this._contactRepository.count({
      where: { center_code: code, is_active: true },
    });
    return {
      center_code: code,
      route_all_to_center: !!flag,
      active_contacts: activeContacts,
      warning:
        flag && activeContacts === 0
          ? 'This Center has no active focal point: its innovations will be listed as unreachable until one is added.'
          : null,
    };
  }

  private async assertCenterExists(code: string): Promise<void> {
    const center = await this._centerRepository.findOne({ where: { code } });
    if (!center) throw new BadRequestException(`Unknown Center "${code}"`);
  }

  private async assertNoDuplicate(
    centerCode: string,
    email: string,
    exceptId?: number,
  ): Promise<void> {
    const rows = await this._contactRepository.find({
      where: { center_code: centerCode, email },
    });
    if (rows.some((r) => exceptId === undefined || Number(r.id) !== exceptId)) {
      throw this.duplicate();
    }
  }

  /** The unique index is the backstop for two concurrent requests that both passed the check. */
  private async saveContact(
    row: CenterMelFocalPoint,
  ): Promise<CenterMelFocalPoint> {
    try {
      return await this._contactRepository.save(row);
    } catch (error) {
      const e = error as { errno?: number; code?: string; message?: string };
      if (
        e?.errno === MYSQL_DUP_ENTRY ||
        e?.code === 'ER_DUP_ENTRY' ||
        e?.message?.includes(UNIQUE_INDEX)
      ) {
        throw this.duplicate();
      }
      throw error;
    }
  }

  private duplicate(): ConflictException {
    return new ConflictException(
      'This email already exists for the Center; reactivate the existing contact instead.',
    );
  }

  private toContactView(row: CenterMelFocalPoint): CenterFocalPointView {
    return {
      id: Number(row.id),
      name: row.name ?? null,
      email: row.email,
      is_active: !!row.is_active,
    };
  }
}
