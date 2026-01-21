import { Inject, Injectable, Scope } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { TokenDto } from '../globalInterfaces/token.dto';
import { BaseEntity } from '../entities/base-entity';

@Injectable({ scope: Scope.REQUEST })
export class CurrentUserUtil {
  private systemUser: TokenDto | null = null;
  private forceSystemUser: boolean = false;
  private key = 'user';
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  setSystemUser(user: Partial<TokenDto>, forceSystemUser: boolean = false) {
    this.systemUser = user ? (user as TokenDto) : null;
    this.forceSystemUser = forceSystemUser;
  }

  clearSystemUser() {
    this.systemUser = null;
    this.forceSystemUser = false;
  }

  get user(): TokenDto {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser;
    }
    return this.request[this.key] as TokenDto;
  }

  get user_id(): number {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser?.id;
    }
    return (this.request[this.key] as TokenDto)?.id;
  }

  get email(): string {
    if (this.systemUser || this.forceSystemUser) {
      return this.systemUser?.email;
    }
    return (this.request[this.key] as TokenDto)?.email;
  }

  public audit(set: SetAutitEnum = SetAutitEnum.NEW): Partial<BaseEntity> {
    switch (set) {
      case SetAutitEnum.NEW:
        return { created_by: this?.user_id };
      case SetAutitEnum.UPDATE:
        return { last_updated_by: this?.user_id };
      case SetAutitEnum.BOTH:
        return { created_by: this?.user_id, last_updated_by: this?.user_id };
    }
  }
}

export enum SetAutitEnum {
  NEW,
  UPDATE,
  BOTH,
}
