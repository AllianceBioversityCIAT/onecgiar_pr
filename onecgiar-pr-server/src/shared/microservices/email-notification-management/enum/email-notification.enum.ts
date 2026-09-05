export enum EmailTemplate {
  CONTRIBUTION = 'email_template_contribution',
  REQUEST_AS_CONTRIBUTION = 'email_template_request_as_contribution',
  REMOVED_CONTRIBUTION = 'email_template_removed_contribution',
  ACCOUNT_CONFIRMATION = 'email_template_new_external_user',
  ROLES_UPDATE = 'email_template_roles_update',
  STATUS_UPDATE = 'email_template_user_status_update',
  IP_EXPERTS_SUPPORT = 'email_template_ip_experts_support',
  /**
   * P2-3272. The 2026 wording of the IP support request. A SEPARATE row, not an update of
   * IP_EXPERTS_SUPPORT: that body describes the four separate IPR questions, which are still
   * answered in the 2025 form and can still be submitted. Picked by `phase_year`, never by
   * portfolio — P25 holds both 2025 and 2026 results.
   */
  IP_EXPERTS_SUPPORT_2026 = 'email_template_ip_experts_support_2026',
  /**
   * P2-3272. Confirmation to the Lead Contact Person that their request was referred. This email
   * did not exist in any phase before 2026.
   */
  IP_SUPPORT_CONFIRMATION_2026 = 'email_template_ip_support_confirmation_2026',
  FULL_METADATA_EXPORT = 'email_template_full_metadata_export',
  /**
   * P2-3166 AC5. Lookup-only, like STATUS_UPDATE and IP_EXPERTS_SUPPORT: the row is fetched from
   * `template` and rendered with handlebars by `WebhookAlertService`, not through `buildEmailData`.
   */
  WEBHOOK_DELIVERY_FAILED = 'email_template_webhook_delivery_failed',
  /**
   * 2026-09-04. Tells the uploader their AI text-mining job finished and how many result drafts it
   * produced, with a link to the centre's Drafts list. Lookup-only, rendered with handlebars by
   * `BilateralAiService.sendResultsReadyEmail` — the in-app half is the client toast (the forced
   * post-completion redirect was removed the same day).
   */
  BILATERAL_AI_RESULTS_READY = 'email_template_bilateral_ai_results_ready',
}
