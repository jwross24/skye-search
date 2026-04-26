export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_usage_log: {
        Row: {
          created_at: string
          estimated_cost_cents: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          task_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_cost_cents: number
          id?: string
          input_tokens: number
          model: string
          output_tokens: number
          task_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_cost_cents?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          task_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_date: string | null
          contacts: Json | null
          created_at: string
          documents_used: string[] | null
          id: string
          interview_date: string | null
          job_id: string | null
          kanban_status:
            | Database["public"]["Enums"]["kanban_status_type"]
            | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          offer_accepted_date: string | null
          offer_date: string | null
          phone_screen_date: string | null
          rejected_date: string | null
          rejection_type:
            | Database["public"]["Enums"]["rejection_type_type"]
            | null
          snoozed_until: string | null
          start_date: string | null
          submission_channel:
            | Database["public"]["Enums"]["submission_channel_type"]
            | null
          tailored_cover_letter_url: string | null
          tailored_resume_url: string | null
          updated_at: string
          user_id: string
          withdrawal_reason:
            | Database["public"]["Enums"]["withdrawal_reason_type"]
            | null
          withdrawn_date: string | null
        }
        Insert: {
          applied_date?: string | null
          contacts?: Json | null
          created_at?: string
          documents_used?: string[] | null
          id?: string
          interview_date?: string | null
          job_id?: string | null
          kanban_status?:
            | Database["public"]["Enums"]["kanban_status_type"]
            | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          offer_accepted_date?: string | null
          offer_date?: string | null
          phone_screen_date?: string | null
          rejected_date?: string | null
          rejection_type?:
            | Database["public"]["Enums"]["rejection_type_type"]
            | null
          snoozed_until?: string | null
          start_date?: string | null
          submission_channel?:
            | Database["public"]["Enums"]["submission_channel_type"]
            | null
          tailored_cover_letter_url?: string | null
          tailored_resume_url?: string | null
          updated_at?: string
          user_id: string
          withdrawal_reason?:
            | Database["public"]["Enums"]["withdrawal_reason_type"]
            | null
          withdrawn_date?: string | null
        }
        Update: {
          applied_date?: string | null
          contacts?: Json | null
          created_at?: string
          documents_used?: string[] | null
          id?: string
          interview_date?: string | null
          job_id?: string | null
          kanban_status?:
            | Database["public"]["Enums"]["kanban_status_type"]
            | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          offer_accepted_date?: string | null
          offer_date?: string | null
          phone_screen_date?: string | null
          rejected_date?: string | null
          rejection_type?:
            | Database["public"]["Enums"]["rejection_type_type"]
            | null
          snoozed_until?: string | null
          start_date?: string | null
          submission_channel?:
            | Database["public"]["Enums"]["submission_channel_type"]
            | null
          tailored_cover_letter_url?: string | null
          tailored_resume_url?: string | null
          updated_at?: string
          user_id?: string
          withdrawal_reason?:
            | Database["public"]["Enums"]["withdrawal_reason_type"]
            | null
          withdrawn_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_log: {
        Row: {
          calibration_week: string
          created_at: string
          feedback_type: string
          id: string
          job_id: string
          tag: string | null
          user_id: string
        }
        Insert: {
          calibration_week: string
          created_at?: string
          feedback_type: string
          id?: string
          job_id: string
          tag?: string | null
          user_id: string
        }
        Update: {
          calibration_week?: string
          created_at?: string
          feedback_type?: string
          id?: string
          job_id?: string
          tag?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      canada_crs: {
        Row: {
          draw_history: Json | null
          eligible_streams: string[] | null
          estimated_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          draw_history?: Json | null
          eligible_streams?: string[] | null
          estimated_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          draw_history?: Json | null
          eligible_streams?: string[] | null
          estimated_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canada_crs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_exempt_employers: {
        Row: {
          aliases: string[] | null
          cap_exempt_basis: string | null
          confidence_level:
            | Database["public"]["Enums"]["cap_exempt_confidence_type"]
            | null
          created_at: string
          employer_domain: string | null
          employer_name: string
          id: string
          parent_org: string | null
          source_url: string | null
          verification_date: string | null
        }
        Insert: {
          aliases?: string[] | null
          cap_exempt_basis?: string | null
          confidence_level?:
            | Database["public"]["Enums"]["cap_exempt_confidence_type"]
            | null
          created_at?: string
          employer_domain?: string | null
          employer_name: string
          id?: string
          parent_org?: string | null
          source_url?: string | null
          verification_date?: string | null
        }
        Update: {
          aliases?: string[] | null
          cap_exempt_basis?: string | null
          confidence_level?:
            | Database["public"]["Enums"]["cap_exempt_confidence_type"]
            | null
          created_at?: string
          employer_domain?: string | null
          employer_name?: string
          id?: string
          parent_org?: string | null
          source_url?: string | null
          verification_date?: string | null
        }
        Relationships: []
      }
      cap_exempt_overrides: {
        Row: {
          created_at: string
          employer_name: string
          id: string
          override_reason: string | null
          user_classification: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          employer_name: string
          id?: string
          override_reason?: string | null
          user_classification?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          employer_name?: string
          id?: string
          override_reason?: string | null
          user_classification?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cap_exempt_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoint_corrections: {
        Row: {
          checkpoint_date: string
          corrected_status: string
          created_at: string
          id: string
          original_status: string
          trigger_source: string
          user_id: string
        }
        Insert: {
          checkpoint_date: string
          corrected_status: string
          created_at?: string
          id?: string
          original_status: string
          trigger_source: string
          user_id: string
        }
        Update: {
          checkpoint_date?: string
          corrected_status?: string
          created_at?: string
          id?: string
          original_status?: string
          trigger_source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_corrections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          affiliation: string | null
          canonical_name: string | null
          created_at: string
          email: string | null
          id: string
          last_contacted: string | null
          linked_job_ids: string[] | null
          name: string
          notes: string | null
          phone: string | null
          relationship_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliation?: string | null
          canonical_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          linked_job_ids?: string[] | null
          name: string
          notes?: string | null
          phone?: string | null
          relationship_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliation?: string | null
          canonical_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted?: string | null
          linked_job_ids?: string[] | null
          name?: string
          notes?: string | null
          phone?: string | null
          relationship_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_execution_log: {
        Row: {
          completed_at: string | null
          employment_active_at_check: boolean | null
          error_message: string | null
          execution_date: string
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["cron_status_type"]
          trigger_source: Database["public"]["Enums"]["trigger_source_type"]
          unemployment_days_used_after: number | null
          unemployment_days_used_before: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          employment_active_at_check?: boolean | null
          error_message?: string | null
          execution_date: string
          id?: string
          started_at?: string | null
          status: Database["public"]["Enums"]["cron_status_type"]
          trigger_source: Database["public"]["Enums"]["trigger_source_type"]
          unemployment_days_used_after?: number | null
          unemployment_days_used_before?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          employment_active_at_check?: boolean | null
          error_message?: string | null
          execution_date?: string
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["cron_status_type"]
          trigger_source?: Database["public"]["Enums"]["trigger_source_type"]
          unemployment_days_used_after?: number | null
          unemployment_days_used_before?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cron_execution_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkpoint: {
        Row: {
          checkpoint_date: string
          created_at: string
          evidence_notes: string | null
          id: string
          status_snapshot: Database["public"]["Enums"]["status_snapshot_type"]
          trigger_source: Database["public"]["Enums"]["trigger_source_type"]
          unemployment_days_used_cumulative: number
          user_id: string
        }
        Insert: {
          checkpoint_date: string
          created_at?: string
          evidence_notes?: string | null
          id?: string
          status_snapshot: Database["public"]["Enums"]["status_snapshot_type"]
          trigger_source: Database["public"]["Enums"]["trigger_source_type"]
          unemployment_days_used_cumulative: number
          user_id: string
        }
        Update: {
          checkpoint_date?: string
          created_at?: string
          evidence_notes?: string | null
          id?: string
          status_snapshot?: Database["public"]["Enums"]["status_snapshot_type"]
          trigger_source?: Database["public"]["Enums"]["trigger_source_type"]
          unemployment_days_used_cumulative?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkpoint_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deferred_email: {
        Row: {
          created_at: string
          id: string
          process_after: string | null
          raw_email_json: Json | null
          status:
            | Database["public"]["Enums"]["deferred_email_status_type"]
            | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          process_after?: string | null
          raw_email_json?: Json | null
          status?:
            | Database["public"]["Enums"]["deferred_email_status_type"]
            | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          process_after?: string | null
          raw_email_json?: Json | null
          status?:
            | Database["public"]["Enums"]["deferred_email_status_type"]
            | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deferred_email_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_jobs: {
        Row: {
          canonical_url: string | null
          company: string | null
          content_hash: string | null
          created_at: string
          description_fetch_attempts: number
          description_fetched_at: string | null
          discovery_source_detail: string | null
          id: string
          indexed_date: string | null
          is_job_posting: boolean | null
          last_validated_at: string | null
          normalized_company: string | null
          raw_description: string | null
          scored: boolean | null
          source: string | null
          source_type: Database["public"]["Enums"]["source_type_type"] | null
          structured_deadline: string | null
          structured_location: string | null
          structured_salary: string | null
          title: string | null
          url: string | null
          user_id: string
          validation_status:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
        }
        Insert: {
          canonical_url?: string | null
          company?: string | null
          content_hash?: string | null
          created_at?: string
          description_fetch_attempts?: number
          description_fetched_at?: string | null
          discovery_source_detail?: string | null
          id?: string
          indexed_date?: string | null
          is_job_posting?: boolean | null
          last_validated_at?: string | null
          normalized_company?: string | null
          raw_description?: string | null
          scored?: boolean | null
          source?: string | null
          source_type?: Database["public"]["Enums"]["source_type_type"] | null
          structured_deadline?: string | null
          structured_location?: string | null
          structured_salary?: string | null
          title?: string | null
          url?: string | null
          user_id: string
          validation_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
        }
        Update: {
          canonical_url?: string | null
          company?: string | null
          content_hash?: string | null
          created_at?: string
          description_fetch_attempts?: number
          description_fetched_at?: string | null
          discovery_source_detail?: string | null
          id?: string
          indexed_date?: string | null
          is_job_posting?: boolean | null
          last_validated_at?: string | null
          normalized_company?: string | null
          raw_description?: string | null
          scored?: boolean | null
          source?: string | null
          source_type?: Database["public"]["Enums"]["source_type_type"] | null
          structured_deadline?: string | null
          structured_location?: string | null
          structured_salary?: string | null
          title?: string | null
          url?: string | null
          user_id?: string
          validation_status?:
            | Database["public"]["Enums"]["validation_status_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "discovered_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content_md: string | null
          created_at: string
          file_path: string | null
          generation_source: string | null
          id: string
          is_master: boolean | null
          master_document_id: string | null
          parent_job_id: string | null
          previous_version_id: string | null
          status: Database["public"]["Enums"]["document_status_type"] | null
          structured_data_json: Json | null
          template_tags_json: Json | null
          type: string | null
          updated_at: string
          user_id: string
          version: number | null
          version_tag: string | null
        }
        Insert: {
          content_md?: string | null
          created_at?: string
          file_path?: string | null
          generation_source?: string | null
          id?: string
          is_master?: boolean | null
          master_document_id?: string | null
          parent_job_id?: string | null
          previous_version_id?: string | null
          status?: Database["public"]["Enums"]["document_status_type"] | null
          structured_data_json?: Json | null
          template_tags_json?: Json | null
          type?: string | null
          updated_at?: string
          user_id: string
          version?: number | null
          version_tag?: string | null
        }
        Update: {
          content_md?: string | null
          created_at?: string
          file_path?: string | null
          generation_source?: string | null
          id?: string
          is_master?: boolean | null
          master_document_id?: string | null
          parent_job_id?: string | null
          previous_version_id?: string | null
          status?: Database["public"]["Enums"]["document_status_type"] | null
          structured_data_json?: Json | null
          template_tags_json?: Json | null
          type?: string | null
          updated_at?: string
          user_id?: string
          version?: number | null
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_master_document_id_fkey"
            columns: ["master_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      e_verify_employers: {
        Row: {
          ein: string | null
          employer_name: string
          enrollment_date: string | null
          ingested_at: string
        }
        Insert: {
          ein?: string | null
          employer_name: string
          enrollment_date?: string | null
          ingested_at?: string
        }
        Update: {
          ein?: string | null
          employer_name?: string
          enrollment_date?: string | null
          ingested_at?: string
        }
        Relationships: []
      }
      immigration_status: {
        Row: {
          calibration_date: string | null
          created_at: string
          dso_last_report: string | null
          employment_active: boolean
          employment_active_since: string | null
          employment_end_date: string | null
          employment_start_date: string | null
          grace_period_start_date: string | null
          i140_receipt_number_encrypted: string | null
          i140_status: Database["public"]["Enums"]["i140_status_type"] | null
          i485_status: Database["public"]["Enums"]["i140_status_type"] | null
          i983_last_updated: string | null
          initial_days_source:
            | Database["public"]["Enums"]["initial_days_source_type"]
            | null
          initial_days_used: number
          last_employment_confirmed_at: string | null
          niw_filing_date: string | null
          niw_priority_date: string | null
          niw_status: string | null
          opt_expiry: string | null
          postdoc_end_date: string | null
          sevis_id_encrypted: string | null
          updated_at: string
          user_id: string
          visa_stamp_expiry_date: string | null
          visa_type: string | null
        }
        Insert: {
          calibration_date?: string | null
          created_at?: string
          dso_last_report?: string | null
          employment_active?: boolean
          employment_active_since?: string | null
          employment_end_date?: string | null
          employment_start_date?: string | null
          grace_period_start_date?: string | null
          i140_receipt_number_encrypted?: string | null
          i140_status?: Database["public"]["Enums"]["i140_status_type"] | null
          i485_status?: Database["public"]["Enums"]["i140_status_type"] | null
          i983_last_updated?: string | null
          initial_days_source?:
            | Database["public"]["Enums"]["initial_days_source_type"]
            | null
          initial_days_used?: number
          last_employment_confirmed_at?: string | null
          niw_filing_date?: string | null
          niw_priority_date?: string | null
          niw_status?: string | null
          opt_expiry?: string | null
          postdoc_end_date?: string | null
          sevis_id_encrypted?: string | null
          updated_at?: string
          user_id: string
          visa_stamp_expiry_date?: string | null
          visa_type?: string | null
        }
        Update: {
          calibration_date?: string | null
          created_at?: string
          dso_last_report?: string | null
          employment_active?: boolean
          employment_active_since?: string | null
          employment_end_date?: string | null
          employment_start_date?: string | null
          grace_period_start_date?: string | null
          i140_receipt_number_encrypted?: string | null
          i140_status?: Database["public"]["Enums"]["i140_status_type"] | null
          i485_status?: Database["public"]["Enums"]["i140_status_type"] | null
          i983_last_updated?: string | null
          initial_days_source?:
            | Database["public"]["Enums"]["initial_days_source_type"]
            | null
          initial_days_used?: number
          last_employment_confirmed_at?: string | null
          niw_filing_date?: string | null
          niw_priority_date?: string | null
          niw_status?: string | null
          opt_expiry?: string | null
          postdoc_end_date?: string | null
          sevis_id_encrypted?: string | null
          updated_at?: string
          user_id?: string
          visa_stamp_expiry_date?: string | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immigration_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_complexity: string | null
          application_deadline: string | null
          cap_exempt_confidence:
            | Database["public"]["Enums"]["cap_exempt_confidence_type"]
            | null
          company: string | null
          company_domain: string | null
          company_logo: string | null
          created_at: string
          deadline_source: string | null
          discovered_job_id: string | null
          employer_type:
            | Database["public"]["Enums"]["employer_type_type"]
            | null
          employment_type:
            | Database["public"]["Enums"]["employment_type_type"]
            | null
          h1b_sponsor_count: number | null
          hiring_timeline_estimate: string | null
          id: string
          indexed_date: string | null
          location: string | null
          match_score: number | null
          raw_description: string | null
          remote_status: string | null
          requires_citizenship: boolean | null
          requires_security_clearance: boolean | null
          salary: string | null
          skills_academic_equiv: string[] | null
          skills_required: string[] | null
          source: string | null
          source_type: Database["public"]["Enums"]["source_type_type"] | null
          title: string | null
          updated_at: string
          urgency_score: number | null
          url: string | null
          user_id: string
          visa_path: Database["public"]["Enums"]["visa_path_type"] | null
          why_fits: string | null
        }
        Insert: {
          application_complexity?: string | null
          application_deadline?: string | null
          cap_exempt_confidence?:
            | Database["public"]["Enums"]["cap_exempt_confidence_type"]
            | null
          company?: string | null
          company_domain?: string | null
          company_logo?: string | null
          created_at?: string
          deadline_source?: string | null
          discovered_job_id?: string | null
          employer_type?:
            | Database["public"]["Enums"]["employer_type_type"]
            | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type_type"]
            | null
          h1b_sponsor_count?: number | null
          hiring_timeline_estimate?: string | null
          id?: string
          indexed_date?: string | null
          location?: string | null
          match_score?: number | null
          raw_description?: string | null
          remote_status?: string | null
          requires_citizenship?: boolean | null
          requires_security_clearance?: boolean | null
          salary?: string | null
          skills_academic_equiv?: string[] | null
          skills_required?: string[] | null
          source?: string | null
          source_type?: Database["public"]["Enums"]["source_type_type"] | null
          title?: string | null
          updated_at?: string
          urgency_score?: number | null
          url?: string | null
          user_id: string
          visa_path?: Database["public"]["Enums"]["visa_path_type"] | null
          why_fits?: string | null
        }
        Update: {
          application_complexity?: string | null
          application_deadline?: string | null
          cap_exempt_confidence?:
            | Database["public"]["Enums"]["cap_exempt_confidence_type"]
            | null
          company?: string | null
          company_domain?: string | null
          company_logo?: string | null
          created_at?: string
          deadline_source?: string | null
          discovered_job_id?: string | null
          employer_type?:
            | Database["public"]["Enums"]["employer_type_type"]
            | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type_type"]
            | null
          h1b_sponsor_count?: number | null
          hiring_timeline_estimate?: string | null
          id?: string
          indexed_date?: string | null
          location?: string | null
          match_score?: number | null
          raw_description?: string | null
          remote_status?: string | null
          requires_citizenship?: boolean | null
          requires_security_clearance?: boolean | null
          salary?: string | null
          skills_academic_equiv?: string[] | null
          skills_required?: string[] | null
          source?: string | null
          source_type?: Database["public"]["Enums"]["source_type_type"] | null
          title?: string | null
          updated_at?: string
          urgency_score?: number | null
          url?: string | null
          user_id?: string
          visa_path?: Database["public"]["Enums"]["visa_path_type"] | null
          why_fits?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_discovered_job_id_fkey"
            columns: ["discovered_job_id"]
            isOneToOne: false
            referencedRelation: "discovered_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          description: string | null
          earned_date: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          earned_date: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          earned_date?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      o1a_criteria: {
        Row: {
          created_at: string
          criterion_name: string
          evidence: Json | null
          id: string
          next_action: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criterion_name: string
          evidence?: Json | null
          id?: string
          next_action?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criterion_name?: string
          evidence?: Json | null
          id?: string
          next_action?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "o1a_criteria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_events: {
        Row: {
          action_items: Json | null
          contact_id: string
          content_summary: string | null
          created_at: string
          event_date: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          contact_id: string
          content_summary?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          action_items?: Json | null
          contact_id?: string
          content_summary?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          decision_deadline: string | null
          id: Database["public"]["Enums"]["plan_id_type"]
          next_action: string | null
          notes: string | null
          progress: number | null
          status: Database["public"]["Enums"]["plan_status_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_deadline?: string | null
          id: Database["public"]["Enums"]["plan_id_type"]
          next_action?: string | null
          notes?: string | null
          progress?: number | null
          status?: Database["public"]["Enums"]["plan_status_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_deadline?: string | null
          id?: Database["public"]["Enums"]["plan_id_type"]
          next_action?: string | null
          notes?: string | null
          progress?: number | null
          status?: Database["public"]["Enums"]["plan_status_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_inbound_email: {
        Row: {
          attachments_json: Json | null
          body_text: string | null
          classification_type:
            | Database["public"]["Enums"]["email_classification_type"]
            | null
          created_at: string
          id: string
          sender: string | null
          status:
            | Database["public"]["Enums"]["inbound_email_status_type"]
            | null
          subject: string | null
          user_id: string
        }
        Insert: {
          attachments_json?: Json | null
          body_text?: string | null
          classification_type?:
            | Database["public"]["Enums"]["email_classification_type"]
            | null
          created_at?: string
          id?: string
          sender?: string | null
          status?:
            | Database["public"]["Enums"]["inbound_email_status_type"]
            | null
          subject?: string | null
          user_id: string
        }
        Update: {
          attachments_json?: Json | null
          body_text?: string | null
          classification_type?:
            | Database["public"]["Enums"]["email_classification_type"]
            | null
          created_at?: string
          id?: string
          sender?: string | null
          status?:
            | Database["public"]["Enums"]["inbound_email_status_type"]
            | null
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_inbound_email_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          industry_equivalent: string | null
          learning_status: string | null
          name: string
          proficiency: string | null
          resources: string[] | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          industry_equivalent?: string | null
          learning_status?: string | null
          name: string
          proficiency?: string | null
          resources?: string[] | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          industry_equivalent?: string | null
          learning_status?: string | null
          name?: string
          proficiency?: string | null
          resources?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_queue: {
        Row: {
          created_at: string
          dead_lettered_at: string | null
          error_log: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          payload_json: Json | null
          result_json: Json | null
          retry_count: number | null
          status: Database["public"]["Enums"]["task_status_type"] | null
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dead_lettered_at?: string | null
          error_log?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          payload_json?: Json | null
          result_json?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["task_status_type"] | null
          task_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dead_lettered_at?: string | null
          error_log?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          payload_json?: Json | null
          result_json?: Json | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["task_status_type"] | null
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_log: {
        Row: {
          created_at: string
          departure_date: string
          id: string
          notes: string | null
          return_date: string | null
          risk_level: Database["public"]["Enums"]["travel_risk_type"] | null
          user_id: string
          was_employed: boolean | null
        }
        Insert: {
          created_at?: string
          departure_date: string
          id?: string
          notes?: string | null
          return_date?: string | null
          risk_level?: Database["public"]["Enums"]["travel_risk_type"] | null
          user_id: string
          was_employed?: boolean | null
        }
        Update: {
          created_at?: string
          departure_date?: string
          id?: string
          notes?: string | null
          return_date?: string | null
          risk_level?: Database["public"]["Enums"]["travel_risk_type"] | null
          user_id?: string
          was_employed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          break_mode_until: string | null
          created_at: string
          disclaimer_acknowledged_at: string | null
          id: string
          is_admin: boolean
          migration_v1b_completed_at: string | null
          milestones_seen: string[] | null
          preferences: Json | null
          profile: Json | null
          push_subscription: Json | null
          skills: string[] | null
          updated_at: string
          user_preferences: Json | null
        }
        Insert: {
          break_mode_until?: string | null
          created_at?: string
          disclaimer_acknowledged_at?: string | null
          id: string
          is_admin?: boolean
          migration_v1b_completed_at?: string | null
          milestones_seen?: string[] | null
          preferences?: Json | null
          profile?: Json | null
          push_subscription?: Json | null
          skills?: string[] | null
          updated_at?: string
          user_preferences?: Json | null
        }
        Update: {
          break_mode_until?: string | null
          created_at?: string
          disclaimer_acknowledged_at?: string | null
          id?: string
          is_admin?: boolean
          migration_v1b_completed_at?: string | null
          milestones_seen?: string[] | null
          preferences?: Json | null
          profile?: Json | null
          push_subscription?: Json | null
          skills?: string[] | null
          updated_at?: string
          user_preferences?: Json | null
        }
        Relationships: []
      }
      visa_bulletin: {
        Row: {
          bulletin_month: string
          eb2_china_final_action: string | null
          eb2_row_final_action: string | null
          fetched_at: string
          id: string
        }
        Insert: {
          bulletin_month: string
          eb2_china_final_action?: string | null
          eb2_row_final_action?: string | null
          fetched_at?: string
          id?: string
        }
        Update: {
          bulletin_month?: string
          eb2_china_final_action?: string | null
          eb2_row_final_action?: string | null
          fetched_at?: string
          id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          decision: string
          id: string
          job_id: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          job_id: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          job_id?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_activity_log: {
        Row: {
          applications_submitted_count: number | null
          created_at: string
          id: string
          interview_prep_count: number | null
          jobs_reviewed_count: number | null
          networking_outreach_count: number | null
          notable_event_types: string[] | null
          skills_activity: boolean | null
          summary_text: string | null
          tailoring_sessions_count: number | null
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          applications_submitted_count?: number | null
          created_at?: string
          id?: string
          interview_prep_count?: number | null
          jobs_reviewed_count?: number | null
          networking_outreach_count?: number | null
          notable_event_types?: string[] | null
          skills_activity?: boolean | null
          summary_text?: string | null
          tailoring_sessions_count?: number | null
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          applications_submitted_count?: number | null
          created_at?: string
          id?: string
          interview_prep_count?: number | null
          jobs_reviewed_count?: number | null
          networking_outreach_count?: number | null
          notable_event_types?: string[] | null
          skills_activity?: boolean | null
          summary_text?: string | null
          tailoring_sessions_count?: number | null
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_spend: {
        Row: {
          api_call_count: number | null
          spend_date: string | null
          total_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      immigration_clock: {
        Row: {
          days_remaining: number | null
          days_used_confirmed: number | null
          days_used_conservative: number | null
          gap_days: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immigration_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      immigration_ledger: {
        Row: {
          dso_confirmed: boolean | null
          employer_name: string | null
          end_date: string | null
          evidence_notes: string | null
          id: string | null
          start_date: string | null
          status_type:
            | Database["public"]["Enums"]["status_snapshot_type"]
            | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkpoint_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_spend: {
        Row: {
          api_call_count: number | null
          total_cents: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      dequeue_task: {
        Args: { batch_size?: number }
        Returns: {
          created_at: string
          dead_lettered_at: string | null
          error_log: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          payload_json: Json | null
          result_json: Json | null
          retry_count: number | null
          status: Database["public"]["Enums"]["task_status_type"] | null
          task_type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "task_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_daily_unemployment_checkpoint: {
        Args: {
          p_target_date?: string
          p_trigger_source?: Database["public"]["Enums"]["trigger_source_type"]
          p_user_id?: string
        }
        Returns: Json
      }
      retry_task: {
        Args: { error_text: string; next_retry: string; task_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      cap_exempt_confidence_type: "none" | "unverified" | "likely" | "confirmed"
      cron_status_type: "started" | "completed" | "failed"
      deferred_email_status_type: "deferred" | "processed"
      document_status_type: "draft" | "pending_review" | "approved" | "exported"
      email_classification_type: "job_alert" | "application_update"
      employer_type_type:
        | "university"
        | "nonprofit_research"
        | "cooperative_institute"
        | "government_contractor"
        | "government_direct"
        | "private_sector"
        | "unknown"
      employment_type_type: "full_time" | "part_time" | "contract" | "unknown"
      i140_status_type: "not_filed" | "filed" | "approved" | "denied"
      inbound_email_status_type: "unprocessed" | "classified" | "ignored"
      initial_days_source_type: "dso_confirmed" | "user_reported"
      kanban_status_type:
        | "discovered"
        | "interested"
        | "tailoring"
        | "applied"
        | "phone_screen"
        | "interview"
        | "offer"
        | "offer_accepted"
        | "h1b_filed"
        | "rejected"
        | "withdrawn"
      plan_id_type: "plan_a" | "plan_b" | "plan_c" | "plan_d" | "niw"
      plan_status_type: "not_started" | "active" | "completed" | "cancelled"
      rejection_type_type: "form_email" | "personalized" | "ghosted"
      source_type_type: "industry" | "government" | "academic" | "until_filled"
      status_snapshot_type:
        | "unemployed"
        | "employed_postdoc"
        | "employed_bridge"
        | "employed_h1b"
        | "grace_period"
        | "CONFLICT"
      submission_channel_type:
        | "employer_website"
        | "email"
        | "referral"
        | "other"
      task_status_type:
        | "pending"
        | "processing"
        | "completed"
        | "failed_retry"
        | "failed_validation"
      travel_risk_type: "low" | "medium" | "high" | "critical"
      trigger_source_type:
        | "pg_cron"
        | "manual_backfill"
        | "keepalive_gha"
        | "gha_cron"
        | "vercel_cron"
        | "retroactive_end_date"
      validation_status_type:
        | "unvalidated"
        | "active"
        | "dead_link"
        | "timeout"
        | "closed"
      visa_path_type:
        | "cap_exempt"
        | "cap_subject"
        | "opt_compatible"
        | "canada"
        | "unknown"
      withdrawal_reason_type:
        | "accepted_other"
        | "not_a_fit"
        | "immigration"
        | "timing"
        | "other"
        | "ghosted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cap_exempt_confidence_type: ["none", "unverified", "likely", "confirmed"],
      cron_status_type: ["started", "completed", "failed"],
      deferred_email_status_type: ["deferred", "processed"],
      document_status_type: ["draft", "pending_review", "approved", "exported"],
      email_classification_type: ["job_alert", "application_update"],
      employer_type_type: [
        "university",
        "nonprofit_research",
        "cooperative_institute",
        "government_contractor",
        "government_direct",
        "private_sector",
        "unknown",
      ],
      employment_type_type: ["full_time", "part_time", "contract", "unknown"],
      i140_status_type: ["not_filed", "filed", "approved", "denied"],
      inbound_email_status_type: ["unprocessed", "classified", "ignored"],
      initial_days_source_type: ["dso_confirmed", "user_reported"],
      kanban_status_type: [
        "discovered",
        "interested",
        "tailoring",
        "applied",
        "phone_screen",
        "interview",
        "offer",
        "offer_accepted",
        "h1b_filed",
        "rejected",
        "withdrawn",
      ],
      plan_id_type: ["plan_a", "plan_b", "plan_c", "plan_d", "niw"],
      plan_status_type: ["not_started", "active", "completed", "cancelled"],
      rejection_type_type: ["form_email", "personalized", "ghosted"],
      source_type_type: ["industry", "government", "academic", "until_filled"],
      status_snapshot_type: [
        "unemployed",
        "employed_postdoc",
        "employed_bridge",
        "employed_h1b",
        "grace_period",
        "CONFLICT",
      ],
      submission_channel_type: [
        "employer_website",
        "email",
        "referral",
        "other",
      ],
      task_status_type: [
        "pending",
        "processing",
        "completed",
        "failed_retry",
        "failed_validation",
      ],
      travel_risk_type: ["low", "medium", "high", "critical"],
      trigger_source_type: [
        "pg_cron",
        "manual_backfill",
        "keepalive_gha",
        "gha_cron",
        "vercel_cron",
        "retroactive_end_date",
      ],
      validation_status_type: [
        "unvalidated",
        "active",
        "dead_link",
        "timeout",
        "closed",
      ],
      visa_path_type: [
        "cap_exempt",
        "cap_subject",
        "opt_compatible",
        "canada",
        "unknown",
      ],
      withdrawal_reason_type: [
        "accepted_other",
        "not_a_fit",
        "immigration",
        "timing",
        "other",
        "ghosted",
      ],
    },
  },
} as const

