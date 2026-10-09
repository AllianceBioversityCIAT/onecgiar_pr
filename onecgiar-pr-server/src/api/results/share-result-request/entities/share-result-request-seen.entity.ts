import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ShareResultRequest } from './share-result-request.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

/**
 * `BRS-DD-1` / design.md §5 - "this user has seen this request" fact. One row per
 * (request, user); the composite PK is the uniqueness guarantee that makes insert-ignore
 * idempotent. Deliberately a plain entity (no BaseEntity base, no `is_active`/audit columns):
 * it is a two-key fact, not a business entity (`src/CLAUDE.md` 7.6).
 *
 * `seen_date` has NO `ON UPDATE` on purpose (the trap in `users.last_pop_up_viewed`).
 */
@Entity('share_result_request_seen')
@Index('IDX_srrs_user_request', ['user_id', 'share_result_request_id'])
export class ShareResultRequestSeen {
  @PrimaryColumn({ name: 'share_result_request_id', type: 'int' })
  share_result_request_id: number;

  @PrimaryColumn({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({
    name: 'seen_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  seen_date: Date;

  @ManyToOne(() => ShareResultRequest, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'share_result_request_id' })
  obj_share_result_request: ShareResultRequest;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  obj_user: User;
}
