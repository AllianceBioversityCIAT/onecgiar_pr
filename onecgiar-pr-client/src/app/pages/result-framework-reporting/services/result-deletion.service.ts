import { inject, Injectable, NgZone } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';
import { PrToastService } from '../../../shared/components/pr-toast';

export interface DeleteEligibility {
  visible: boolean;
  disabled: boolean;
  tooltip: string;
}

export interface DeleteConfirmationOptions {
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ResultDeletionService {
  private readonly api = inject(ApiService);
  private readonly zone = inject(NgZone);
  private readonly toastSE = inject(PrToastService);

  /**
   * Evaluates visibility, disabled state, and tooltip for the "Delete" result action.
   *
   * Business Rules:
   * 1. Visibility (DEL-AC-5, D3): True if result matches the current portfolio (e.g. P25) or active reporting phase.
   *    False if result explicitly belongs to an older/different portfolio (e.g. P22, CRP).
   * 2. QAed Lockout (DEL-AC-4, D2): If status_id == 2 (or '2'), disabled is true with QAed tooltip (even for Admin).
   * 3. Admin (DEL-AC-1): If user is Admin and result is not QAed, disabled is false with empty tooltip.
   * 4. Non-Admin Roles (DEL-AC-2, DEL-AC-3, D1): If user has role 3 (Lead), 4 (Co-Lead), or 5 (Coordinator),
   *    disabled is false. All other roles get disabled is true with "Please contact your leader or co-leader." tooltip.
   */
  getDeleteEligibility(rowOrResult: any): DeleteEligibility {
    this.api.dataControlSE?.reportingPhaseVersion?.();
    const raw = rowOrResult?.raw ?? rowOrResult;
    const portfolioAcronym = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    const hasResultIdentity = Boolean(
      raw?.id ||
      rowOrResult?.id ||
      raw?.result_code ||
      rowOrResult?.code ||
      raw?.title ||
      rowOrResult?.title ||
      raw?.acronym ||
      rowOrResult?.acronym
    );

    if (!raw || !hasResultIdentity || !portfolioAcronym) {
      return {
        visible: false,
        disabled: true,
        tooltip: ''
      };
    }

    const resultAcronym =
      raw?.acronym ??
      raw?.portfolio_acronym ??
      raw?.portfolio ??
      rowOrResult?.acronym ??
      rowOrResult?.portfolio;
    const phaseName = String(rowOrResult?.phaseName ?? raw?.phase_name ?? '');

    let visible = false;
    if (resultAcronym) {
      visible = resultAcronym === portfolioAcronym;
    } else if (phaseName) {
      visible = phaseName.includes(portfolioAcronym) || (!phaseName.includes('P22') && !phaseName.includes('CRP'));
    } else {
      visible = true;
    }

    const statusId = raw?.status_id ?? rowOrResult?.statusId ?? rowOrResult?.status_id;
    if (statusId == 2 || statusId === '2') {
      return {
        visible,
        disabled: true,
        tooltip: 'You are not allowed to perform this action because the result is in the status "QAed".'
      };
    }

    if (this.api.rolesSE?.isAdmin) {
      return {
        visible,
        disabled: false,
        tooltip: ''
      };
    }

    const roleId = raw?.role_id ?? rowOrResult?.role_id ?? rowOrResult?.roleId;
    const hasLeadRole = roleId === 3 || roleId === 4 || roleId === 5 || roleId === '3' || roleId === '4' || roleId === '5';

    if (hasLeadRole) {
      return {
        visible,
        disabled: false,
        tooltip: ''
      };
    }

    return {
      visible,
      disabled: true,
      tooltip: 'You are not allowed to perform this action. Please contact your leader or co-leader.'
    };
  }

  /**
   * Prompts user with a confirmation modal alert before executing PATCH_DeleteResult.
   * On confirmation, performs soft delete inside NgZone and shows success or error alerts.
   */
  deleteWithConfirmation(rowOrResult: any, options?: DeleteConfirmationOptions): void {
    const raw = rowOrResult?.raw ?? rowOrResult;
    const title = raw?.title ?? rowOrResult?.title ?? '';
    const id = raw?.id ?? rowOrResult?.id;

    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to delete the result "${title}"?`,
        description: 'If you delete this result it will no longer be displayed in the list of results.',
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.zone.run(() => {
          options?.onStart?.();
          this.api.resultsSE.PATCH_DeleteResult(id).subscribe({
            next: () => {
              this.toastSE.add({
                key: 'globalUserNotification',
                severity: 'success',
                summary: `The result "${title}" was deleted`
              });
              this.api.updateResultsList?.();
              options?.onSuccess?.();
            },
            error: (err: any) => {
              const backendMessage = err?.error?.message ?? '';
              if (err?.status === 409) {
                this.api.alertsFe.show({
                  id: 'delete-error',
                  title: 'Unable to delete result',
                  description: backendMessage,
                  status: 'warning'
                });
              } else {
                this.api.alertsFe.show({
                  id: 'delete-error',
                  title: 'Error when delete result',
                  description: backendMessage,
                  status: 'error'
                });
              }
              options?.onError?.(err);
            }
          });
        });
      }
    );
  }
}
