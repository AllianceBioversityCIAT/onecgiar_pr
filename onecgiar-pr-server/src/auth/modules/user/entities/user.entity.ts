import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Notification } from '../../../../api/notification/entities/notification.entity';
import { UserNotificationSetting } from '../../../../api/user-notification-settings/entities/user-notification-settings.entity';
import { ResultQaedLog } from '../../../../api/result-qaed/entities/result-qaed-log.entity';
import { ContributionToIndicatorSubmission } from '../../../../api/contribution-to-indicators/entities/contribution-to-indicator-submission.entity';
import { RoleByUser } from '../../role-by-user/entities/role-by-user.entity';
import { AiReviewSession } from '../../../../api/ai/entities/ai-review-session.entity';
import { AiReviewEvent } from '../../../../api/ai/entities/ai-review-event.entity';
import { ResultFieldRevision } from '../../../../api/ai/entities/result-field-revision.entity';
import { ResultFieldAiState } from '../../../../api/ai/entities/result-field-ai-state.entity';
import { Result } from '../../../../api/results/entities/result.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: false })
  email: string;

  @Column({
    name: 'is_cgiar',
    type: 'boolean',
  })
  is_cgiar: boolean;

  @Column({
    name: 'password',
    type: 'text',
    nullable: true,
  })
  password!: string;

  @Column({
    name: 'last_login',
    type: 'timestamp',
    nullable: true,
  })
  last_login!: Date;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'created_by',
  })
  created_by!: number;

  @CreateDateColumn({
    name: 'created_date',
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    nullable: true,
  })
  last_updated_date!: Date;

  @UpdateDateColumn({
    name: 'last_pop_up_viewed',
    type: 'timestamp',
    nullable: true,
  })
  last_pop_up_viewed!: Date;

  @OneToMany(() => RoleByUser, (roleByUser) => roleByUser.obj_user)
  obj_role_by_user: RoleByUser[];

  @OneToMany(
    () => UserNotificationSetting,
    (notificationSetting) => notificationSetting.obj_user,
  )
  obj_user_notification_setting: UserNotificationSetting[];

  @OneToMany(
    () => Notification,
    (notificationSetting) => notificationSetting.obj_target_user,
  )
  obj_target_user_notification: Notification[];

  @OneToMany(
    () => Notification,
    (notificationSetting) => notificationSetting.obj_emitter_user,
  )
  obj_emitter_user_notification: Notification[];

  @OneToMany(() => ResultQaedLog, (r) => r.obj_qaed_user)
  obj_qaed_user: ResultQaedLog[];

  @OneToMany(
    () => ContributionToIndicatorSubmission,
    (ctis) => ctis.user_object,
  )
  contribution_to_indicator_submission_array: ContributionToIndicatorSubmission[];

  @OneToMany(() => AiReviewSession, (session) => session.obj_opened_by)
  obj_ai_review_sessions_opened: AiReviewSession[];

  @OneToMany(() => AiReviewEvent, (event) => event.obj_user)
  obj_ai_review_events: AiReviewEvent[];

  @OneToMany(() => ResultFieldRevision, (revision) => revision.obj_user)
  obj_result_field_revisions: ResultFieldRevision[];

  @OneToMany(() => ResultFieldAiState, (state) => state.obj_last_updated_by)
  obj_result_field_ai_states_updated: ResultFieldAiState[];

  @OneToMany(() => Result, (result) => result.obj_external_submitter)
  obj_external_submitter_results: Result[];
}
