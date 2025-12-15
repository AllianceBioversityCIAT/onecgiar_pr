import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { DataControlService } from '../data-control.service';
import {
  AISession,
  IAiRecommendation,
  ImpactAreaScores,
  POSTAIAssistantCreateEvent,
  POSTAIAssistantSaveHistory,
  POSTPRMSQa,
  POSTSaveProposalField,
  SaveProposal
} from '../../interfaces/ai-review.interface';
import { ApiService } from './api.service';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';
import { Router } from '@angular/router';
export interface DacScores {
  field_name: string;
  tag_id: string | number;
  impact_area_id?: string | null;
  change_reason?: string;
  canSave?: boolean;
  ai_recommendation?: string;
  ai_component_recommendation?: string;
  display_title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiReviewService {
  showAiReview = signal<boolean>(false);
  http = inject(HttpClient);
  dataControlSE = inject(DataControlService);
  baseApiBaseUrl = environment.apiBaseUrl + 'api/';
  baseApiUrlV2 = environment.apiBaseUrl + 'v2/api/';
  reviewApiUrl = environment.reviewApiUrl;
  sessionId = signal<number | string | null>(null);
  aiReviewButtonState: 'idle' | 'loading' | 'completed' = 'idle';
  currnetFieldsList = signal<any[]>([]);
  aiContext = signal<any>(null);
  dacScores = signal<DacScores[]>([]);
  api = inject(ApiService);
  saveButtonSE = inject(SaveButtonService);
  router = inject(Router);

  // Signal para notificar cuando se guarda en general-information
  generalInformationSaved = signal<number>(0);

  /**
   * Mapea el field_name a su título completo para mostrar en la UI
   * @param fieldName - Nombre del campo (gender, climate, nutrition, environmental, poverty)
   * @returns El título completo del área de impacto
   */
  private mapFieldNameToDisplayTitle(fieldName: string): string {
    const fieldNameLower = fieldName.toLowerCase();

    const titleMappings: Record<string, string> = {
      gender: 'Gender equality, youth and social inclusion tag',
      climate: 'Climate adaptation and mitigation',
      nutrition: 'Nutrition, health and food security',
      environmental: 'Environmental health and biodiversity tag',
      poverty: 'Poverty reduction, livelihoods and jobs tag'
    };

    return titleMappings[fieldNameLower] || fieldName;
  }

  /**
   * Mapea el field_name del DAC score al campo correspondiente en impact_area_scores
   * @param fieldName - Nombre del campo (gender, climate, nutrition, environmental, poverty)
   * @returns El nombre de la propiedad correspondiente en ImpactAreaScores
   */
  private mapFieldNameToImpactAreaKey(fieldName: string): {
    scoreKey: keyof ImpactAreaScores;
    componentKey?: keyof ImpactAreaScores;
  } | null {
    const fieldNameLower = fieldName.toLowerCase();

    const mappings: Record<string, { scoreKey: keyof ImpactAreaScores; componentKey?: keyof ImpactAreaScores }> = {
      gender: { scoreKey: 'social_inclusion', componentKey: 'social_inclusion_component' },
      climate: { scoreKey: 'climate_adaptation' },
      nutrition: { scoreKey: 'food_security', componentKey: 'food_security_component' },
      environmental: { scoreKey: 'environmental_health' },
      poverty: { scoreKey: 'poverty_reduction' }
    };

    return mappings[fieldNameLower] || null;
  }

  /**
   * Enriquece los DAC scores con las recomendaciones de IA
   * @param dacScores - Array de DAC scores del backend
   * @param impactAreaScores - Recomendaciones de IA para cada área de impacto
   * @returns Array de DAC scores enriquecidos con recomendaciones
   */
  private enrichDacScoresWithAIRecommendations(dacScores: DacScores[], impactAreaScores: ImpactAreaScores): DacScores[] {
    return dacScores.map(score => {
      const mapping = this.mapFieldNameToImpactAreaKey(score.field_name);

      if (!mapping) {
        return { ...score, canSave: false, display_title: this.mapFieldNameToDisplayTitle(score.field_name) };
      }

      const enrichedScore: DacScores = {
        ...score,
        canSave: false,
        display_title: this.mapFieldNameToDisplayTitle(score.field_name),
        ai_recommendation: impactAreaScores[mapping.scoreKey] || ''
      };

      // Si existe componente, agregarlo
      if (mapping.componentKey && impactAreaScores[mapping.componentKey]) {
        enrichedScore.ai_component_recommendation = impactAreaScores[mapping.componentKey];
      }

      return enrichedScore;
    });
  }

  // on AI review click
  async onAIReviewClick() {
    try {
      if (this.aiReviewButtonState !== 'idle') return;

      this.aiReviewButtonState = 'loading';

      // TODO: To async all steps
      await this.POST_createSession();
      await this.GET_aiContext();
      await this.GET_resultContext();

      // Obtener DAC scores y recomendaciones de IA en paralelo
      const [dacScoresData, { json_content }] = await Promise.all([
        this.getDacScores(),
        this.POST_prmsQa({
          user_id: this.api.authSE.localStorageUser.email,
          result_metadata: this.aiContext()
        })
      ]);

      // Combinar DAC scores con recomendaciones de IA
      const enrichedDacScores = this.enrichDacScoresWithAIRecommendations(dacScoresData, json_content.impact_area_scores);
      this.dacScores.set(enrichedDacScores);

      const customData = [
        { field_name_label: 'Title', field_name: 'new_title' },
        { field_name_label: 'Description', field_name: 'new_description' },
        { field_name_label: 'Short Name', field_name: 'short_name' }
      ];

      this.currnetFieldsList.update(res => {
        res.forEach((item, index) => {
          item.proposed_text = json_content[customData[index].field_name];
          item.needs_improvement = true;
          item.field_name_label = customData[index].field_name_label;
        });

        return [...res];
      });

      await this.POST_createProposal({
        proposals: this.currnetFieldsList()
      });

      // Mostrar animación de completado
      this.aiReviewButtonState = 'completed';

      // Esperar a que termine la animación antes de abrir el modal
      setTimeout(() => {
        this.showAiReview.set(true);
        this.aiReviewButtonState = 'idle';
      }, 600);
    } catch (error) {
      console.error('Error creating AI session:', error);
      this.aiReviewButtonState = 'idle';
    }
  }

  async onApplyProposal(field, index: number) {
    field.canSave = false;
    const body: POSTAIAssistantCreateEvent = {
      session_id: this.sessionId(),
      result_id: this.dataControlSE.currentResultSignal().id,
      event_type: 'APPLY_PROPOSAL',
      field_name: field.field_name
    };
    this.POST_createEvent(body);
    const fieldToSave = this.currnetFieldsList()[index] as POSTSaveProposalField;
    fieldToSave.new_value = fieldToSave.original_text;
    fieldToSave.change_reason = 'AI proposal applied';
    fieldToSave.was_ai_suggested = true;
    await this.POST_saveSession({ fields: [fieldToSave] });
    field.canSave = true;
  }

  // STEP 1: Create AI session
  POST_createSession() {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.baseApiBaseUrl}ai/sessions`, { result_id: this.dataControlSE.currentResultSignal().id }).subscribe({
        next: (response: any) => {
          this.sessionId.set(response.response.id);
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  // STEP 2: Get AI result context
  GET_aiContext() {
    return new Promise((resolve, reject) => {
      return this.http.get<any>(`${this.baseApiUrlV2}results/ai/context?resultId=${this.dataControlSE.currentResultSignal().id}`).subscribe({
        next: (response: any) => {
          this.aiContext.set(response.response);
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  // STEP 3: Get current fields list
  GET_resultContext() {
    return new Promise((resolve, reject) => {
      return this.http.get<any>(`${this.baseApiBaseUrl}ai/result-context/${this.dataControlSE.currentResultSignal().id}`).subscribe({
        next: (response: any) => {
          this.currnetFieldsList.set(response.response);
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  getDacScores(): Promise<DacScores[]> {
    return new Promise((resolve, reject) => {
      return this.http
        .get<DacScores[]>(`${this.baseApiBaseUrl}ai/result-context/dac-scores/${this.dataControlSE.currentResultSignal().id}`)
        .subscribe({
          next: (response: any) => {
            resolve(response.response);
          }
        });
    });
  }

  // STEP 4.1: Create proposal generated by AI
  POST_prmsQa(body: POSTPRMSQa) {
    return new Promise<IAiRecommendation>((resolve, reject) => {
      return this.http.post<IAiRecommendation>(`${this.reviewApiUrl}prms-qa`, body).subscribe({
        next: (response: IAiRecommendation) => {
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  // STEP 4.2: Create proposal generated by AI
  POST_createProposal(body: POSTAIAssistantSaveHistory) {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.baseApiBaseUrl}ai/sessions/${this.sessionId()}/proposals`, body).subscribe({
        next: (response: any) => {
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  // STEP 5: Create event
  POST_createEvent(body: any) {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.baseApiBaseUrl}ai/events`, body).subscribe({
        next: (response: any) => {
          resolve(response);
        }
      });
    });
  }

  // STEP 6: Save AI session
  POST_saveSession(body: any) {
    return new Promise((resolve, reject) => {
      return this.http
        .post<SaveProposal>(`${this.baseApiBaseUrl}ai/sessions/${this.sessionId()}/save`, body)
        .pipe(this.saveButtonSE.isSavingPipe())
        .subscribe({
          next: (response: any) => {
            // Detectar si estamos en la ruta de general-information
            const currentUrl = this.router.url;
            if (currentUrl.includes('general-information') || currentUrl.includes('innovation-dev-info')) {
              // Incrementar el signal para notificar el cambio
              this.generalInformationSaved.update(val => val + 1);
            }
            resolve(response);
          },
          error: (error: any) => {
            reject(error);
          }
        });
    });
  }

  // Save DAC score
  PATCH_saveDacScore(resultId: number | string, dacScore: Omit<DacScores, 'canSave'>) {
    return new Promise((resolve, reject) => {
      return this.http
        .patch<any>(`${this.baseApiBaseUrl}ai/dac-scores/${resultId}`, dacScore)
        .pipe(this.saveButtonSE.isSavingPipe())
        .subscribe({
          next: (response: any) => {
            resolve(response);
          },
          error: (error: any) => {
            console.error('Error saving DAC score:', error);
            reject(error);
          }
        });
    });
  }
}
