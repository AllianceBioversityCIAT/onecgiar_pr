export enum EmailTemplate {
  CONTRIBUTION = 'email_template_contribution',
  REQUEST_AS_CONTRIBUTION = 'email_template_request_as_contribution',
  REMOVED_CONTRIBUTION = 'email_template_removed_contribution',
  ACCOUNT_CONFIRMATION = 'email_template_new_external_user',
  ROLES_UPDATE = 'email_template_roles_update',
  STATUS_UPDATE = 'email_template_user_status_update',
  IP_EXPERTS_SUPPORT = 'email_template_ip_experts_support',
  FULL_METADATA_EXPORT = 'email_template_full_metadata_export',
  /**
   * P2-3166 AC5. Lookup-only, like STATUS_UPDATE and IP_EXPERTS_SUPPORT: the row is fetched from
   * `template` and rendered with handlebars by `WebhookAlertService`, not through `buildEmailData`.
   */
  WEBHOOK_DELIVERY_FAILED = 'email_template_webhook_delivery_failed',
}
