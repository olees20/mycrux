// Generated from the applied public Postgres schema. Do not edit by hand.
// Regenerate with scripts/generate-database-types.mjs against a migrated database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      "account_deletion_requests": {
        Row: {
          "id": string
          "profile_id": string
          "status": string
          "reason": string | null
          "retention_exceptions": Json
          "requested_at": string
          "resolved_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "profile_id": string
          "status"?: string
          "reason"?: string | null
          "retention_exceptions"?: Json
          "requested_at"?: string
          "resolved_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "profile_id"?: string
          "status"?: string
          "reason"?: string | null
          "retention_exceptions"?: Json
          "requested_at"?: string
          "resolved_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "announcements": {
        Row: {
          "id": string
          "gym_id": string
          "author_id": string
          "title": string
          "body": string
          "status": string
          "audience": string
          "pinned_until": string | null
          "published_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
          "priority": string
          "expires_at": string | null
          "is_pinned": boolean
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "author_id": string
          "title": string
          "body": string
          "status"?: string
          "audience"?: string
          "pinned_until"?: string | null
          "published_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "priority"?: string
          "expires_at"?: string | null
          "is_pinned"?: boolean
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "author_id"?: string
          "title"?: string
          "body"?: string
          "status"?: string
          "audience"?: string
          "pinned_until"?: string | null
          "published_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "priority"?: string
          "expires_at"?: string | null
          "is_pinned"?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "ascent_logs": {
        Row: {
          "id": string
          "gym_id": string
          "route_id": string
          "profile_id": string
          "climbed_at": string
          "ascent_type": string
          "attempts": number
          "perceived_grade": string | null
          "notes": string | null
          "is_private": boolean
          "deleted_at": string | null
          "created_at": string
          "updated_at": string
          "session_date": string
          "visibility": string
          "route_name_snapshot": string | null
          "route_colour_snapshot": string
          "route_grade_snapshot": string
          "route_grade_system_snapshot": string
          "wall_name_snapshot": string
          "session_id": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "route_id": string
          "profile_id": string
          "climbed_at"?: string
          "ascent_type": string
          "attempts"?: number
          "perceived_grade"?: string | null
          "notes"?: string | null
          "is_private"?: boolean
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "session_date"?: string
          "visibility"?: string
          "route_name_snapshot"?: string | null
          "route_colour_snapshot"?: string
          "route_grade_snapshot"?: string
          "route_grade_system_snapshot"?: string
          "wall_name_snapshot"?: string
          "session_id"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "route_id"?: string
          "profile_id"?: string
          "climbed_at"?: string
          "ascent_type"?: string
          "attempts"?: number
          "perceived_grade"?: string | null
          "notes"?: string | null
          "is_private"?: boolean
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "session_date"?: string
          "visibility"?: string
          "route_name_snapshot"?: string | null
          "route_colour_snapshot"?: string
          "route_grade_snapshot"?: string
          "route_grade_system_snapshot"?: string
          "wall_name_snapshot"?: string
          "session_id"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ascent_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ascent_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ascent_logs_route_fkey"
            columns: ["route_id","gym_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "ascent_logs_session_fkey"
            columns: ["session_id","gym_id","profile_id"]
            isOneToOne: false
            referencedRelation: "climbing_sessions"
            referencedColumns: ["id","gym_id","profile_id"]
          }
        ]
      }
      "ascent_media": {
        Row: {
          "id": string
          "gym_id": string
          "ascent_id": string
          "profile_id": string
          "storage_path": string
          "media_type": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "ascent_id": string
          "profile_id": string
          "storage_path": string
          "media_type": string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "ascent_id"?: string
          "profile_id"?: string
          "storage_path"?: string
          "media_type"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "ascent_media_ascent_fkey"
            columns: ["ascent_id","gym_id"]
            isOneToOne: false
            referencedRelation: "ascent_logs"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "ascent_media_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ascent_media_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "audit_logs": {
        Row: {
          "id": string
          "gym_id": string | null
          "actor_profile_id": string | null
          "actor_type": string
          "action": string
          "target_type": string
          "target_id": string | null
          "request_id": string | null
          "outcome": string
          "metadata": Json
          "source_ip": string | null
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id"?: string | null
          "actor_profile_id"?: string | null
          "actor_type": string
          "action": string
          "target_type": string
          "target_id"?: string | null
          "request_id"?: string | null
          "outcome"?: string
          "metadata"?: Json
          "source_ip"?: string | null
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string | null
          "actor_profile_id"?: string | null
          "actor_type"?: string
          "action"?: string
          "target_type"?: string
          "target_id"?: string | null
          "request_id"?: string | null
          "outcome"?: string
          "metadata"?: Json
          "source_ip"?: string | null
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "billing_customers": {
        Row: {
          "id": string
          "gym_id": string
          "stripe_customer_id": string
          "billing_email": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "stripe_customer_id": string
          "billing_email"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "stripe_customer_id"?: string
          "billing_email"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "channel_members": {
        Row: {
          "id": string
          "gym_id": string
          "channel_id": string
          "profile_id": string
          "membership_role": string
          "muted_until": string | null
          "last_read_at": string | null
          "joined_at": string
          "left_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "channel_id": string
          "profile_id": string
          "membership_role"?: string
          "muted_until"?: string | null
          "last_read_at"?: string | null
          "joined_at"?: string
          "left_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "channel_id"?: string
          "profile_id"?: string
          "membership_role"?: string
          "muted_until"?: string | null
          "last_read_at"?: string | null
          "joined_at"?: string
          "left_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_fkey"
            columns: ["channel_id","gym_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "channel_members_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "chat_channels": {
        Row: {
          "id": string
          "gym_id": string
          "created_by": string
          "name": string
          "description": string | null
          "channel_type": string
          "is_read_only": boolean
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "created_by": string
          "name": string
          "description"?: string | null
          "channel_type"?: string
          "is_read_only"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "created_by"?: string
          "name"?: string
          "description"?: string | null
          "channel_type"?: string
          "is_read_only"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "check_in_tokens": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "token_hash": string
          "expires_at": string
          "consumed_at": string | null
          "revoked_at": string | null
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "token_hash": string
          "expires_at": string
          "consumed_at"?: string | null
          "revoked_at"?: string | null
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "token_hash"?: string
          "expires_at"?: string
          "consumed_at"?: string | null
          "revoked_at"?: string | null
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_tokens_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "check_ins": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string | null
          "guest_invite_id": string | null
          "pass_id": string | null
          "verified_by": string | null
          "source": string
          "checked_in_at": string
          "metadata": Json
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "pass_id"?: string | null
          "verified_by"?: string | null
          "source": string
          "checked_in_at"?: string
          "metadata"?: Json
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "pass_id"?: string | null
          "verified_by"?: string | null
          "source"?: string
          "checked_in_at"?: string
          "metadata"?: Json
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_guest_fkey"
            columns: ["guest_invite_id","gym_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "check_ins_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_pass_fkey"
            columns: ["pass_id","gym_id"]
            isOneToOne: false
            referencedRelation: "passes"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "check_ins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "climbing_sessions": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "session_date": string
          "started_at": string | null
          "ended_at": string | null
          "notes": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "session_date": string
          "started_at"?: string | null
          "ended_at"?: string | null
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "session_date"?: string
          "started_at"?: string | null
          "ended_at"?: string | null
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "climbing_sessions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climbing_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "comments": {
        Row: {
          "id": string
          "gym_id": string
          "post_id": string
          "parent_comment_id": string | null
          "author_id": string
          "body": string
          "moderation_status": string
          "edited_at": string | null
          "deleted_at": string | null
          "created_at": string
          "updated_at": string
          "moderation_reason": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "post_id": string
          "parent_comment_id"?: string | null
          "author_id": string
          "body": string
          "moderation_status"?: string
          "edited_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "moderation_reason"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "post_id"?: string
          "parent_comment_id"?: string | null
          "author_id"?: string
          "body"?: string
          "moderation_status"?: string
          "edited_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "moderation_reason"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_fkey"
            columns: ["parent_comment_id","post_id","gym_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id","post_id","gym_id"]
          },
          {
            foreignKeyName: "comments_post_fkey"
            columns: ["post_id","gym_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "community_blocks": {
        Row: {
          "gym_id": string
          "blocker_id": string
          "blocked_id": string
          "created_at": string
        }
        Insert: {
          "gym_id": string
          "blocker_id": string
          "blocked_id": string
          "created_at"?: string
        }
        Update: {
          "gym_id"?: string
          "blocker_id"?: string
          "blocked_id"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_blocks_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "community_guideline_acceptances": {
        Row: {
          "gym_id": string
          "profile_id": string
          "version": string
          "accepted_at": string
        }
        Insert: {
          "gym_id": string
          "profile_id": string
          "version"?: string
          "accepted_at"?: string
        }
        Update: {
          "gym_id"?: string
          "profile_id"?: string
          "version"?: string
          "accepted_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_guideline_acceptances_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_guideline_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "community_mutes": {
        Row: {
          "gym_id": string
          "profile_id": string
          "muted_profile_id": string
          "expires_at": string | null
          "created_at": string
        }
        Insert: {
          "gym_id": string
          "profile_id": string
          "muted_profile_id": string
          "expires_at"?: string | null
          "created_at"?: string
        }
        Update: {
          "gym_id"?: string
          "profile_id"?: string
          "muted_profile_id"?: string
          "expires_at"?: string | null
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_mutes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_mutes_muted_profile_id_fkey"
            columns: ["muted_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_mutes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "community_posts": {
        Row: {
          "id": string
          "gym_id": string
          "author_id": string
          "post_type": string
          "title": string | null
          "body": string
          "visibility": string
          "moderation_status": string
          "edited_at": string | null
          "deleted_at": string | null
          "created_at": string
          "updated_at": string
          "image_path": string | null
          "is_pinned": boolean
          "locked_at": string | null
          "moderation_reason": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "author_id": string
          "post_type"?: string
          "title"?: string | null
          "body": string
          "visibility"?: string
          "moderation_status"?: string
          "edited_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "image_path"?: string | null
          "is_pinned"?: boolean
          "locked_at"?: string | null
          "moderation_reason"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "author_id"?: string
          "post_type"?: string
          "title"?: string | null
          "body"?: string
          "visibility"?: string
          "moderation_status"?: string
          "edited_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "image_path"?: string | null
          "is_pinned"?: boolean
          "locked_at"?: string | null
          "moderation_reason"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "community_reports": {
        Row: {
          "id": string
          "gym_id": string
          "reporter_id": string
          "post_id": string | null
          "comment_id": string | null
          "reason": string
          "status": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "reporter_id": string
          "post_id"?: string | null
          "comment_id"?: string | null
          "reason": string
          "status"?: string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "reporter_id"?: string
          "post_id"?: string | null
          "comment_id"?: string | null
          "reason"?: string
          "status"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_fkey"
            columns: ["comment_id","gym_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "community_reports_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_fkey"
            columns: ["post_id","gym_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "community_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "competition_divisions": {
        Row: {
          "id": string
          "gym_id": string
          "competition_id": string
          "name": string
          "eligibility": Json
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "competition_id": string
          "name": string
          "eligibility"?: Json
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "competition_id"?: string
          "name"?: string
          "eligibility"?: Json
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_divisions_competition_fkey"
            columns: ["competition_id","gym_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "competition_divisions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "competition_registrations": {
        Row: {
          "id": string
          "gym_id": string
          "competition_id": string
          "division_id": string
          "profile_id": string
          "status": string
          "registered_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "competition_id": string
          "division_id": string
          "profile_id": string
          "status"?: string
          "registered_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "competition_id"?: string
          "division_id"?: string
          "profile_id"?: string
          "status"?: string
          "registered_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_registrations_competition_fkey"
            columns: ["competition_id","gym_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "competition_registrations_division_fkey"
            columns: ["division_id","gym_id"]
            isOneToOne: false
            referencedRelation: "competition_divisions"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "competition_registrations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "competition_routes": {
        Row: {
          "id": string
          "gym_id": string
          "competition_id": string
          "route_id": string
          "sort_order": number
          "points": number
          "flash_bonus": number
          "metadata": Json
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "competition_id": string
          "route_id": string
          "sort_order"?: number
          "points"?: number
          "flash_bonus"?: number
          "metadata"?: Json
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "competition_id"?: string
          "route_id"?: string
          "sort_order"?: number
          "points"?: number
          "flash_bonus"?: number
          "metadata"?: Json
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_routes_competition_fkey"
            columns: ["competition_id","gym_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "competition_routes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_routes_route_fkey"
            columns: ["route_id","gym_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "competitions": {
        Row: {
          "id": string
          "gym_id": string
          "event_id": string | null
          "created_by": string
          "name": string
          "description": string | null
          "format": string
          "scoring_rules": Json
          "status": string
          "starts_at": string
          "ends_at": string
          "published_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
          "registration_opens_at": string | null
          "registration_closes_at": string | null
          "attempt_limit": number | null
          "finalized_at": string | null
          "finalized_by": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "event_id"?: string | null
          "created_by": string
          "name": string
          "description"?: string | null
          "format"?: string
          "scoring_rules"?: Json
          "status"?: string
          "starts_at": string
          "ends_at": string
          "published_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "registration_opens_at"?: string | null
          "registration_closes_at"?: string | null
          "attempt_limit"?: number | null
          "finalized_at"?: string | null
          "finalized_by"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "event_id"?: string | null
          "created_by"?: string
          "name"?: string
          "description"?: string | null
          "format"?: string
          "scoring_rules"?: Json
          "status"?: string
          "starts_at"?: string
          "ends_at"?: string
          "published_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "registration_opens_at"?: string | null
          "registration_closes_at"?: string | null
          "attempt_limit"?: number | null
          "finalized_at"?: string | null
          "finalized_by"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_event_fkey"
            columns: ["event_id","gym_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "competitions_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "consent_records": {
        Row: {
          "id": string
          "profile_id": string
          "consent_type": string
          "version": string
          "granted": boolean
          "recorded_at": string
          "source": string
        }
        Insert: {
          "id"?: string
          "profile_id": string
          "consent_type": string
          "version": string
          "granted": boolean
          "recorded_at"?: string
          "source"?: string
        }
        Update: {
          "id"?: string
          "profile_id"?: string
          "consent_type"?: string
          "version"?: string
          "granted"?: boolean
          "recorded_at"?: string
          "source"?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "event_registrations": {
        Row: {
          "id": string
          "gym_id": string
          "event_id": string
          "profile_id": string | null
          "guest_invite_id": string | null
          "status": string
          "registered_at": string
          "cancelled_at": string | null
          "notes": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "event_id": string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "status"?: string
          "registered_at"?: string
          "cancelled_at"?: string | null
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "event_id"?: string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "status"?: string
          "registered_at"?: string
          "cancelled_at"?: string | null
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_fkey"
            columns: ["event_id","gym_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "event_registrations_guest_fkey"
            columns: ["guest_invite_id","gym_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "event_registrations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "events": {
        Row: {
          "id": string
          "gym_id": string
          "created_by": string
          "title": string
          "description": string | null
          "location": string | null
          "starts_at": string
          "ends_at": string
          "capacity": number | null
          "status": string
          "visibility": string
          "registration_opens_at": string | null
          "registration_closes_at": string | null
          "published_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
          "event_type": string
          "image_path": string | null
          "organiser_id": string | null
          "eligibility": Json
          "waitlist_enabled": boolean
          "cancellation_policy": string | null
          "cancellation_closes_at": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "created_by": string
          "title": string
          "description"?: string | null
          "location"?: string | null
          "starts_at": string
          "ends_at": string
          "capacity"?: number | null
          "status"?: string
          "visibility"?: string
          "registration_opens_at"?: string | null
          "registration_closes_at"?: string | null
          "published_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "event_type"?: string
          "image_path"?: string | null
          "organiser_id"?: string | null
          "eligibility"?: Json
          "waitlist_enabled"?: boolean
          "cancellation_policy"?: string | null
          "cancellation_closes_at"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "created_by"?: string
          "title"?: string
          "description"?: string | null
          "location"?: string | null
          "starts_at"?: string
          "ends_at"?: string
          "capacity"?: number | null
          "status"?: string
          "visibility"?: string
          "registration_opens_at"?: string | null
          "registration_closes_at"?: string | null
          "published_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "event_type"?: string
          "image_path"?: string | null
          "organiser_id"?: string | null
          "eligibility"?: Json
          "waitlist_enabled"?: boolean
          "cancellation_policy"?: string | null
          "cancellation_closes_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organiser_id_fkey"
            columns: ["organiser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "favourites": {
        Row: {
          "id": string
          "gym_id": string
          "route_id": string
          "profile_id": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "route_id": string
          "profile_id": string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "route_id"?: string
          "profile_id"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_route_fkey"
            columns: ["route_id","gym_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "feature_entitlements": {
        Row: {
          "id": string
          "gym_id": string
          "subscription_id": string | null
          "feature_key": string
          "enabled": boolean
          "limit_value": number | null
          "source": string
          "starts_at": string | null
          "ends_at": string | null
          "metadata": Json
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "subscription_id"?: string | null
          "feature_key": string
          "enabled"?: boolean
          "limit_value"?: number | null
          "source"?: string
          "starts_at"?: string | null
          "ends_at"?: string | null
          "metadata"?: Json
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "subscription_id"?: string | null
          "feature_key"?: string
          "enabled"?: boolean
          "limit_value"?: number | null
          "source"?: string
          "starts_at"?: string | null
          "ends_at"?: string | null
          "metadata"?: Json
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_entitlements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_entitlements_subscription_fkey"
            columns: ["subscription_id","gym_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "guest_invites": {
        Row: {
          "id": string
          "gym_id": string
          "invited_by": string | null
          "email": string | null
          "guest_name": string
          "token_hash": string
          "status": string
          "expires_at": string
          "registered_at": string | null
          "checked_in_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "invited_by"?: string | null
          "email"?: string | null
          "guest_name": string
          "token_hash": string
          "status"?: string
          "expires_at": string
          "registered_at"?: string | null
          "checked_in_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "invited_by"?: string | null
          "email"?: string | null
          "guest_name"?: string
          "token_hash"?: string
          "status"?: string
          "expires_at"?: string
          "registered_at"?: string | null
          "checked_in_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_invites_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "gym_branding": {
        Row: {
          "gym_id": string
          "logo_path": string | null
          "mark_path": string | null
          "primary_colour": string
          "accent_colour": string
          "background_colour": string
          "welcome_message": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "gym_id": string
          "logo_path"?: string | null
          "mark_path"?: string | null
          "primary_colour"?: string
          "accent_colour"?: string
          "background_colour"?: string
          "welcome_message"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "gym_id"?: string
          "logo_path"?: string | null
          "mark_path"?: string | null
          "primary_colour"?: string
          "accent_colour"?: string
          "background_colour"?: string
          "welcome_message"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_branding_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "gym_domains": {
        Row: {
          "id": string
          "gym_id": string
          "domain": string
          "is_primary": boolean
          "verification_token_hash": string | null
          "verified_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "domain": string
          "is_primary"?: boolean
          "verification_token_hash"?: string | null
          "verified_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "domain"?: string
          "is_primary"?: boolean
          "verification_token_hash"?: string | null
          "verified_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_domains_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "gym_memberships": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "role": string
          "staff_role_id": string | null
          "status": string
          "joined_at": string | null
          "suspended_at": string | null
          "left_at": string | null
          "last_active_at": string | null
          "created_at": string
          "updated_at": string
          "external_reference": string | null
          "external_synced_at": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "role"?: string
          "staff_role_id"?: string | null
          "status"?: string
          "joined_at"?: string | null
          "suspended_at"?: string | null
          "left_at"?: string | null
          "last_active_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "external_reference"?: string | null
          "external_synced_at"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "role"?: string
          "staff_role_id"?: string | null
          "status"?: string
          "joined_at"?: string | null
          "suspended_at"?: string | null
          "left_at"?: string | null
          "last_active_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "external_reference"?: string | null
          "external_synced_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_memberships_staff_role_fkey"
            columns: ["staff_role_id","gym_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "gym_slug_history": {
        Row: {
          "id": string
          "gym_id": string
          "previous_slug": string
          "changed_to_slug": string
          "changed_by": string
          "changed_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "previous_slug": string
          "changed_to_slug": string
          "changed_by": string
          "changed_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "previous_slug"?: string
          "changed_to_slug"?: string
          "changed_by"?: string
          "changed_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_slug_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_slug_history_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "gyms": {
        Row: {
          "id": string
          "slug": string
          "name": string
          "legal_name": string | null
          "timezone": string
          "country_code": string
          "status": string
          "public_join_requests_enabled": boolean
          "settings": Json
          "archived_at": string | null
          "created_at": string
          "updated_at": string
          "address_line_1": string | null
          "address_line_2": string | null
          "city": string | null
          "postcode": string | null
          "contact_email": string | null
          "contact_phone": string | null
          "website_url": string | null
          "disciplines": string[]
          "opening_hours_text": string | null
          "day_pass_registration_enabled": boolean
          "day_pass_valid_hours": number
          "day_pass_information": string | null
          "membership_source": string
          "suspended_at": string | null
          "suspension_reason": string | null
          "status_before_suspension": string | null
          "setup_current_step": number
          "setup_completed_at": string | null
        }
        Insert: {
          "id"?: string
          "slug": string
          "name": string
          "legal_name"?: string | null
          "timezone"?: string
          "country_code"?: string
          "status"?: string
          "public_join_requests_enabled"?: boolean
          "settings"?: Json
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "address_line_1"?: string | null
          "address_line_2"?: string | null
          "city"?: string | null
          "postcode"?: string | null
          "contact_email"?: string | null
          "contact_phone"?: string | null
          "website_url"?: string | null
          "disciplines"?: string[]
          "opening_hours_text"?: string | null
          "day_pass_registration_enabled"?: boolean
          "day_pass_valid_hours"?: number
          "day_pass_information"?: string | null
          "membership_source"?: string
          "suspended_at"?: string | null
          "suspension_reason"?: string | null
          "status_before_suspension"?: string | null
          "setup_current_step"?: number
          "setup_completed_at"?: string | null
        }
        Update: {
          "id"?: string
          "slug"?: string
          "name"?: string
          "legal_name"?: string | null
          "timezone"?: string
          "country_code"?: string
          "status"?: string
          "public_join_requests_enabled"?: boolean
          "settings"?: Json
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "address_line_1"?: string | null
          "address_line_2"?: string | null
          "city"?: string | null
          "postcode"?: string | null
          "contact_email"?: string | null
          "contact_phone"?: string | null
          "website_url"?: string | null
          "disciplines"?: string[]
          "opening_hours_text"?: string | null
          "day_pass_registration_enabled"?: boolean
          "day_pass_valid_hours"?: number
          "day_pass_information"?: string | null
          "membership_source"?: string
          "suspended_at"?: string | null
          "suspension_reason"?: string | null
          "status_before_suspension"?: string | null
          "setup_current_step"?: number
          "setup_completed_at"?: string | null
        }
        Relationships: []
      }
      "gym_join_credentials": {
        Row: {
          "gym_id": string
          "join_identifier": string
          "join_code": string
          "enabled": boolean
          "rotated_at": string
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "gym_id": string
          "join_identifier"?: string
          "join_code": string
          "enabled"?: boolean
          "rotated_at"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "gym_id"?: string
          "join_identifier"?: string
          "join_code"?: string
          "enabled"?: boolean
          "rotated_at"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_join_credentials_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "integration_connections": {
        Row: {
          "id": string
          "gym_id": string
          "provider_key": string
          "provider_category": string
          "status": string
          "encrypted_configuration": string | null
          "configuration_fingerprint": string | null
          "key_version": number
          "last_sync_at": string | null
          "last_error_code": string | null
          "created_by": string
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "provider_key": string
          "provider_category": string
          "status"?: string
          "encrypted_configuration"?: string | null
          "configuration_fingerprint"?: string | null
          "key_version"?: number
          "last_sync_at"?: string | null
          "last_error_code"?: string | null
          "created_by": string
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "provider_key"?: string
          "provider_category"?: string
          "status"?: string
          "encrypted_configuration"?: string | null
          "configuration_fingerprint"?: string | null
          "key_version"?: number
          "last_sync_at"?: string | null
          "last_error_code"?: string | null
          "created_by"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "integration_deliveries": {
        Row: {
          "id": string
          "gym_id": string
          "integration_id": string
          "provider_key": string
          "idempotency_key": string
          "payload": Json
          "status": string
          "attempts": number
          "last_error_code": string | null
          "next_attempt_at": string | null
          "processed_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "integration_id": string
          "provider_key": string
          "idempotency_key": string
          "payload": Json
          "status"?: string
          "attempts"?: number
          "last_error_code"?: string | null
          "next_attempt_at"?: string | null
          "processed_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "integration_id"?: string
          "provider_key"?: string
          "idempotency_key"?: string
          "payload"?: Json
          "status"?: string
          "attempts"?: number
          "last_error_code"?: string | null
          "next_attempt_at"?: string | null
          "processed_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_deliveries_connection_fkey"
            columns: ["integration_id","gym_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "integration_deliveries_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "invitations": {
        Row: {
          "id": string
          "gym_id": string
          "email": string
          "token_hash": string
          "role": string
          "staff_role_id": string | null
          "status": string
          "invited_by": string
          "accepted_by": string | null
          "expires_at": string
          "accepted_at": string | null
          "revoked_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "email": string
          "token_hash": string
          "role"?: string
          "staff_role_id"?: string | null
          "status"?: string
          "invited_by": string
          "accepted_by"?: string | null
          "expires_at": string
          "accepted_at"?: string | null
          "revoked_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "email"?: string
          "token_hash"?: string
          "role"?: string
          "staff_role_id"?: string | null
          "status"?: string
          "invited_by"?: string
          "accepted_by"?: string | null
          "expires_at"?: string
          "accepted_at"?: string | null
          "revoked_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_staff_role_fkey"
            columns: ["staff_role_id","gym_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "leaderboard_preferences": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "opted_in": boolean
          "display_name_mode": string
          "updated_at": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "opted_in"?: boolean
          "display_name_mode"?: string
          "updated_at"?: string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "opted_in"?: boolean
          "display_name_mode"?: string
          "updated_at"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_preferences_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "media_abuse_reports": {
        Row: {
          "id": string
          "gym_id": string
          "media_asset_id": string
          "reporter_profile_id": string
          "reason": string
          "status": string
          "created_at": string
          "resolved_at": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "media_asset_id": string
          "reporter_profile_id": string
          "reason": string
          "status"?: string
          "created_at"?: string
          "resolved_at"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "media_asset_id"?: string
          "reporter_profile_id"?: string
          "reason"?: string
          "status"?: string
          "created_at"?: string
          "resolved_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_abuse_reports_asset_fkey"
            columns: ["media_asset_id","gym_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "media_abuse_reports_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_abuse_reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "media_assets": {
        Row: {
          "id": string
          "gym_id": string
          "owner_profile_id": string
          "bucket_id": string
          "storage_path": string
          "thumbnail_path": string | null
          "purpose": string
          "target_id": string | null
          "mime_type": string
          "byte_size": number
          "width": number | null
          "height": number | null
          "status": string
          "retention_until": string | null
          "deleted_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "owner_profile_id": string
          "bucket_id": string
          "storage_path": string
          "thumbnail_path"?: string | null
          "purpose": string
          "target_id"?: string | null
          "mime_type": string
          "byte_size": number
          "width"?: number | null
          "height"?: number | null
          "status"?: string
          "retention_until"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "owner_profile_id"?: string
          "bucket_id"?: string
          "storage_path"?: string
          "thumbnail_path"?: string | null
          "purpose"?: string
          "target_id"?: string | null
          "mime_type"?: string
          "byte_size"?: number
          "width"?: number | null
          "height"?: number | null
          "status"?: string
          "retention_until"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "member_achievements": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "achievement_key": string
          "title": string
          "description": string
          "context": Json
          "awarded_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "achievement_key": string
          "title": string
          "description": string
          "context"?: Json
          "awarded_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "achievement_key"?: string
          "title"?: string
          "description"?: string
          "context"?: Json
          "awarded_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_achievements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "message_reports": {
        Row: {
          "id": string
          "gym_id": string
          "message_id": string
          "reporter_id": string
          "reason": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "message_id": string
          "reporter_id": string
          "reason": string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "message_id"?: string
          "reporter_id"?: string
          "reason"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_message_fkey"
            columns: ["message_id","gym_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "message_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "messages": {
        Row: {
          "id": string
          "gym_id": string
          "channel_id": string
          "sender_id": string
          "reply_to_id": string | null
          "body": string
          "moderation_status": string
          "edited_at": string | null
          "deleted_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "channel_id": string
          "sender_id": string
          "reply_to_id"?: string | null
          "body": string
          "moderation_status"?: string
          "edited_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "channel_id"?: string
          "sender_id"?: string
          "reply_to_id"?: string | null
          "body"?: string
          "moderation_status"?: string
          "edited_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_fkey"
            columns: ["channel_id","gym_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "messages_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_fkey"
            columns: ["reply_to_id","channel_id","gym_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id","channel_id","gym_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "notification_preferences": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "email_enabled": boolean
          "push_enabled": boolean
          "chat_enabled": boolean
          "community_enabled": boolean
          "events_enabled": boolean
          "quiet_hours_start": string | null
          "quiet_hours_end": string | null
          "created_at": string
          "updated_at": string
          "announcements_enabled": boolean
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "email_enabled"?: boolean
          "push_enabled"?: boolean
          "chat_enabled"?: boolean
          "community_enabled"?: boolean
          "events_enabled"?: boolean
          "quiet_hours_start"?: string | null
          "quiet_hours_end"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "announcements_enabled"?: boolean
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "email_enabled"?: boolean
          "push_enabled"?: boolean
          "chat_enabled"?: boolean
          "community_enabled"?: boolean
          "events_enabled"?: boolean
          "quiet_hours_start"?: string | null
          "quiet_hours_end"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "announcements_enabled"?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "notifications": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "notification_type": string
          "title": string
          "body": string
          "link_path": string | null
          "payload": Json
          "read_at": string | null
          "delivered_at": string | null
          "archived_at": string | null
          "created_at": string
          "source_id": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "notification_type": string
          "title": string
          "body": string
          "link_path"?: string | null
          "payload"?: Json
          "read_at"?: string | null
          "delivered_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "source_id"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "notification_type"?: string
          "title"?: string
          "body"?: string
          "link_path"?: string | null
          "payload"?: Json
          "read_at"?: string | null
          "delivered_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "source_id"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "partner_interests": {
        Row: {
          "id": string
          "gym_id": string
          "request_id": string
          "profile_id": string
          "note": string | null
          "status": string
          "conversation_channel_id": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "request_id": string
          "profile_id": string
          "note"?: string | null
          "status"?: string
          "conversation_channel_id"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "request_id"?: string
          "profile_id"?: string
          "note"?: string | null
          "status"?: string
          "conversation_channel_id"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_interests_channel_fkey"
            columns: ["conversation_channel_id","gym_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "partner_interests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_interests_request_fkey"
            columns: ["request_id","gym_id"]
            isOneToOne: false
            referencedRelation: "partner_requests"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "partner_request_reports": {
        Row: {
          "id": string
          "gym_id": string
          "request_id": string
          "reporter_id": string
          "reason": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "request_id": string
          "reporter_id": string
          "reason": string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "request_id"?: string
          "reporter_id"?: string
          "reason"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_reports_request_fkey"
            columns: ["request_id","gym_id"]
            isOneToOne: false
            referencedRelation: "partner_requests"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "partner_request_reports_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_request_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "partner_requests": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "title": string
          "body": string
          "climbing_date": string | null
          "disciplines": string[]
          "grade_range": string | null
          "status": string
          "expires_at": string
          "closed_at": string | null
          "created_at": string
          "updated_at": string
          "window_ends_at": string | null
          "discipline": string | null
          "approximate_ability": string | null
          "session_intent": string | null
          "availability_note": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "title": string
          "body": string
          "climbing_date"?: string | null
          "disciplines"?: string[]
          "grade_range"?: string | null
          "status"?: string
          "expires_at": string
          "closed_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "window_ends_at"?: string | null
          "discipline"?: string | null
          "approximate_ability"?: string | null
          "session_intent"?: string | null
          "availability_note"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "title"?: string
          "body"?: string
          "climbing_date"?: string | null
          "disciplines"?: string[]
          "grade_range"?: string | null
          "status"?: string
          "expires_at"?: string
          "closed_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "window_ends_at"?: string | null
          "discipline"?: string | null
          "approximate_ability"?: string | null
          "session_intent"?: string | null
          "availability_note"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "passes": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string | null
          "guest_invite_id": string | null
          "pass_type": string
          "reference_code_hash": string
          "status": string
          "valid_from": string
          "valid_until": string | null
          "used_at": string | null
          "issued_by": string | null
          "external_payment_reference": string | null
          "metadata": Json
          "revoked_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
          "payment_state": string
          "registration_source": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "pass_type": string
          "reference_code_hash": string
          "status"?: string
          "valid_from": string
          "valid_until"?: string | null
          "used_at"?: string | null
          "issued_by"?: string | null
          "external_payment_reference"?: string | null
          "metadata"?: Json
          "revoked_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "payment_state"?: string
          "registration_source"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "pass_type"?: string
          "reference_code_hash"?: string
          "status"?: string
          "valid_from"?: string
          "valid_until"?: string | null
          "used_at"?: string | null
          "issued_by"?: string | null
          "external_payment_reference"?: string | null
          "metadata"?: Json
          "revoked_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "payment_state"?: string
          "registration_source"?: string
        }
        Relationships: [
          {
            foreignKeyName: "passes_guest_fkey"
            columns: ["guest_invite_id","gym_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "passes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "platform_plans": {
        Row: {
          "plan_key": string
          "name": string
          "description": string
          "features": Json
          "display_order": number
          "active": boolean
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "plan_key": string
          "name": string
          "description": string
          "features": Json
          "display_order": number
          "active"?: boolean
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "plan_key"?: string
          "name"?: string
          "description"?: string
          "features"?: Json
          "display_order"?: number
          "active"?: boolean
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: []
      }
      "platform_support_notes": {
        Row: {
          "id": string
          "gym_id": string
          "author_profile_id": string
          "note": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "author_profile_id": string
          "note": string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "author_profile_id"?: string
          "note"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_support_notes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "profile_privacy_settings": {
        Row: {
          "profile_id": string
          "public_display_name": string | null
          "profile_visibility": string
          "social_visibility": string
          "allow_search": boolean
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "profile_id": string
          "public_display_name"?: string | null
          "profile_visibility"?: string
          "social_visibility"?: string
          "allow_search"?: boolean
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "profile_id"?: string
          "public_display_name"?: string | null
          "profile_visibility"?: string
          "social_visibility"?: string
          "allow_search"?: boolean
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_privacy_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "profiles": {
        Row: {
          "id": string
          "display_name": string
          "avatar_path": string | null
          "pronouns": string | null
          "bio": string | null
          "locale": string
          "is_platform_admin": boolean
          "onboarding_completed_at": string | null
          "suspended_at": string | null
          "deleted_at": string | null
          "created_at": string
          "updated_at": string
          "deactivated_at": string | null
        }
        Insert: {
          "id": string
          "display_name": string
          "avatar_path"?: string | null
          "pronouns"?: string | null
          "bio"?: string | null
          "locale"?: string
          "is_platform_admin"?: boolean
          "onboarding_completed_at"?: string | null
          "suspended_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "deactivated_at"?: string | null
        }
        Update: {
          "id"?: string
          "display_name"?: string
          "avatar_path"?: string | null
          "pronouns"?: string | null
          "bio"?: string | null
          "locale"?: string
          "is_platform_admin"?: boolean
          "onboarding_completed_at"?: string | null
          "suspended_at"?: string | null
          "deleted_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "deactivated_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      "reactions": {
        Row: {
          "id": string
          "gym_id": string
          "profile_id": string
          "post_id": string | null
          "comment_id": string | null
          "reaction": string
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "profile_id": string
          "post_id"?: string | null
          "comment_id"?: string | null
          "reaction": string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "profile_id"?: string
          "post_id"?: string | null
          "comment_id"?: string | null
          "reaction"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_fkey"
            columns: ["comment_id","gym_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "reactions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_fkey"
            columns: ["post_id","gym_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "route_feedback": {
        Row: {
          "id": string
          "gym_id": string
          "route_id": string
          "profile_id": string
          "grade_vote": string | null
          "quality_rating": number | null
          "comment": string | null
          "visibility": string
          "moderation_status": string
          "archived_at": string | null
          "created_at": string
          "updated_at": string
          "feedback_kind": string
          "issue_status": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "route_id": string
          "profile_id": string
          "grade_vote"?: string | null
          "quality_rating"?: number | null
          "comment"?: string | null
          "visibility"?: string
          "moderation_status"?: string
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "feedback_kind"?: string
          "issue_status"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "route_id"?: string
          "profile_id"?: string
          "grade_vote"?: string | null
          "quality_rating"?: number | null
          "comment"?: string | null
          "visibility"?: string
          "moderation_status"?: string
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "feedback_kind"?: string
          "issue_status"?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_feedback_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_feedback_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_feedback_route_fkey"
            columns: ["route_id","gym_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "route_media": {
        Row: {
          "id": string
          "gym_id": string
          "route_id": string
          "uploaded_by": string | null
          "media_type": string
          "storage_path": string
          "thumbnail_path": string | null
          "alt_text": string | null
          "processing_status": string
          "is_beta": boolean
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "route_id": string
          "uploaded_by"?: string | null
          "media_type": string
          "storage_path": string
          "thumbnail_path"?: string | null
          "alt_text"?: string | null
          "processing_status"?: string
          "is_beta"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "route_id"?: string
          "uploaded_by"?: string | null
          "media_type"?: string
          "storage_path"?: string
          "thumbnail_path"?: string | null
          "alt_text"?: string | null
          "processing_status"?: string
          "is_beta"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_media_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_media_route_fkey"
            columns: ["route_id","gym_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "route_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "route_tags": {
        Row: {
          "id": string
          "gym_id": string
          "route_id": string
          "tag": string
          "created_by": string | null
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "route_id": string
          "tag": string
          "created_by"?: string | null
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "route_id"?: string
          "tag"?: string
          "created_by"?: string | null
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_tags_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_tags_route_fkey"
            columns: ["route_id","gym_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "routes": {
        Row: {
          "id": string
          "gym_id": string
          "wall_id": string
          "wall_image_id": string | null
          "name": string | null
          "colour": string
          "grade_system": string
          "grade": string
          "route_type": string
          "status": string
          "setter_id": string | null
          "set_on": string | null
          "retire_on": string | null
          "description": string | null
          "overlay": Json | null
          "published_at": string | null
          "retired_at": string | null
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "wall_id": string
          "wall_image_id"?: string | null
          "name"?: string | null
          "colour": string
          "grade_system"?: string
          "grade": string
          "route_type"?: string
          "status"?: string
          "setter_id"?: string | null
          "set_on"?: string | null
          "retire_on"?: string | null
          "description"?: string | null
          "overlay"?: Json | null
          "published_at"?: string | null
          "retired_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "wall_id"?: string
          "wall_image_id"?: string | null
          "name"?: string | null
          "colour"?: string
          "grade_system"?: string
          "grade"?: string
          "route_type"?: string
          "status"?: string
          "setter_id"?: string | null
          "set_on"?: string | null
          "retire_on"?: string | null
          "description"?: string | null
          "overlay"?: Json | null
          "published_at"?: string | null
          "retired_at"?: string | null
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_setter_id_fkey"
            columns: ["setter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_wall_fkey"
            columns: ["wall_id","gym_id"]
            isOneToOne: false
            referencedRelation: "walls"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "routes_wall_image_fkey"
            columns: ["wall_image_id","wall_id","gym_id"]
            isOneToOne: false
            referencedRelation: "wall_images"
            referencedColumns: ["id","wall_id","gym_id"]
          }
        ]
      }
      "score_entries": {
        Row: {
          "id": string
          "gym_id": string
          "competition_id": string
          "competition_route_id": string
          "profile_id": string | null
          "guest_invite_id": string | null
          "recorded_by": string
          "score": number
          "attempts": number
          "topped": boolean
          "zone_reached": boolean
          "recorded_at": string
          "notes": string | null
          "voided_at": string | null
          "voided_by": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "competition_id": string
          "competition_route_id": string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "recorded_by": string
          "score"?: number
          "attempts"?: number
          "topped"?: boolean
          "zone_reached"?: boolean
          "recorded_at"?: string
          "notes"?: string | null
          "voided_at"?: string | null
          "voided_by"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "competition_id"?: string
          "competition_route_id"?: string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "recorded_by"?: string
          "score"?: number
          "attempts"?: number
          "topped"?: boolean
          "zone_reached"?: boolean
          "recorded_at"?: string
          "notes"?: string | null
          "voided_at"?: string | null
          "voided_by"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_entries_competition_fkey"
            columns: ["competition_id","gym_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "score_entries_guest_fkey"
            columns: ["guest_invite_id","gym_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "score_entries_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_route_fkey"
            columns: ["competition_route_id","competition_id","gym_id"]
            isOneToOne: false
            referencedRelation: "competition_routes"
            referencedColumns: ["id","competition_id","gym_id"]
          },
          {
            foreignKeyName: "score_entries_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      "score_entry_history": {
        Row: {
          "id": string
          "gym_id": string
          "score_entry_id": string
          "competition_id": string
          "changed_by": string
          "change_reason": string
          "before_value": Json | null
          "after_value": Json
          "created_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "score_entry_id": string
          "competition_id": string
          "changed_by": string
          "change_reason": string
          "before_value"?: Json | null
          "after_value": Json
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "score_entry_id"?: string
          "competition_id"?: string
          "changed_by"?: string
          "change_reason"?: string
          "before_value"?: Json | null
          "after_value"?: Json
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_entry_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entry_history_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_history_entry_fkey"
            columns: ["score_entry_id","gym_id"]
            isOneToOne: false
            referencedRelation: "score_entries"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "staff_roles": {
        Row: {
          "id": string
          "gym_id": string
          "key": string
          "name": string
          "description": string | null
          "capabilities": string[]
          "is_system": boolean
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "key": string
          "name": string
          "description"?: string | null
          "capabilities"?: string[]
          "is_system"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "key"?: string
          "name"?: string
          "description"?: string | null
          "capabilities"?: string[]
          "is_system"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "stripe_billing_events": {
        Row: {
          "id": string
          "gym_id": string | null
          "event_type": string
          "livemode": boolean
          "processed_at": string
          "created_at": string
        }
        Insert: {
          "id": string
          "gym_id"?: string | null
          "event_type": string
          "livemode": boolean
          "processed_at"?: string
          "created_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string | null
          "event_type"?: string
          "livemode"?: boolean
          "processed_at"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_billing_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "subscriptions": {
        Row: {
          "id": string
          "gym_id": string
          "billing_customer_id": string
          "stripe_subscription_id": string
          "stripe_price_id": string
          "plan_key": string
          "status": string
          "current_period_start": string | null
          "current_period_end": string | null
          "cancel_at_period_end": boolean
          "canceled_at": string | null
          "trial_ends_at": string | null
          "last_stripe_event_id": string | null
          "created_at": string
          "updated_at": string
          "grace_ends_at": string | null
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "billing_customer_id": string
          "stripe_subscription_id": string
          "stripe_price_id": string
          "plan_key": string
          "status": string
          "current_period_start"?: string | null
          "current_period_end"?: string | null
          "cancel_at_period_end"?: boolean
          "canceled_at"?: string | null
          "trial_ends_at"?: string | null
          "last_stripe_event_id"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "grace_ends_at"?: string | null
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "billing_customer_id"?: string
          "stripe_subscription_id"?: string
          "stripe_price_id"?: string
          "plan_key"?: string
          "status"?: string
          "current_period_start"?: string | null
          "current_period_end"?: string | null
          "cancel_at_period_end"?: boolean
          "canceled_at"?: string | null
          "trial_ends_at"?: string | null
          "last_stripe_event_id"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "grace_ends_at"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_billing_customer_fkey"
            columns: ["billing_customer_id","gym_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "waiver_acceptances": {
        Row: {
          "id": string
          "gym_id": string
          "waiver_version_id": string
          "profile_id": string | null
          "guest_invite_id": string | null
          "accepted_name": string
          "accepted_at": string
          "consent_snapshot": Json
          "source_ip": string | null
          "user_agent": string | null
          "revoked_at": string | null
          "revocation_reason": string | null
          "created_at": string
          "date_of_birth": string | null
          "age_confirmed": boolean | null
          "emergency_contact_name": string | null
          "emergency_contact_phone": string | null
          "signature_text": string
          "evidence": Json
          "retention_until": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "waiver_version_id": string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "accepted_name": string
          "accepted_at"?: string
          "consent_snapshot": Json
          "source_ip"?: string | null
          "user_agent"?: string | null
          "revoked_at"?: string | null
          "revocation_reason"?: string | null
          "created_at"?: string
          "date_of_birth"?: string | null
          "age_confirmed"?: boolean | null
          "emergency_contact_name"?: string | null
          "emergency_contact_phone"?: string | null
          "signature_text"?: string
          "evidence"?: Json
          "retention_until"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "waiver_version_id"?: string
          "profile_id"?: string | null
          "guest_invite_id"?: string | null
          "accepted_name"?: string
          "accepted_at"?: string
          "consent_snapshot"?: Json
          "source_ip"?: string | null
          "user_agent"?: string | null
          "revoked_at"?: string | null
          "revocation_reason"?: string | null
          "created_at"?: string
          "date_of_birth"?: string | null
          "age_confirmed"?: boolean | null
          "emergency_contact_name"?: string | null
          "emergency_contact_phone"?: string | null
          "signature_text"?: string
          "evidence"?: Json
          "retention_until"?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_acceptances_guest_fkey"
            columns: ["guest_invite_id","gym_id"]
            isOneToOne: false
            referencedRelation: "guest_invites"
            referencedColumns: ["id","gym_id"]
          },
          {
            foreignKeyName: "waiver_acceptances_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_acceptances_version_fkey"
            columns: ["waiver_version_id","gym_id"]
            isOneToOne: false
            referencedRelation: "waiver_versions"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "waiver_versions": {
        Row: {
          "id": string
          "gym_id": string
          "waiver_id": string
          "version": number
          "title": string
          "content": string
          "content_hash": string
          "status": string
          "effective_at": string | null
          "published_at": string | null
          "created_by": string
          "created_at": string
          "requirements": Json
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "waiver_id": string
          "version": number
          "title": string
          "content": string
          "content_hash": string
          "status"?: string
          "effective_at"?: string | null
          "published_at"?: string | null
          "created_by": string
          "created_at"?: string
          "requirements"?: Json
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "waiver_id"?: string
          "version"?: number
          "title"?: string
          "content"?: string
          "content_hash"?: string
          "status"?: string
          "effective_at"?: string | null
          "published_at"?: string | null
          "created_by"?: string
          "created_at"?: string
          "requirements"?: Json
        }
        Relationships: [
          {
            foreignKeyName: "waiver_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_versions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_versions_waiver_fkey"
            columns: ["waiver_id","gym_id"]
            isOneToOne: false
            referencedRelation: "waivers"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "waivers": {
        Row: {
          "id": string
          "gym_id": string
          "name": string
          "description": string | null
          "is_required": boolean
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "name": string
          "description"?: string | null
          "is_required"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "name"?: string
          "description"?: string | null
          "is_required"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "waivers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
      "wall_images": {
        Row: {
          "id": string
          "gym_id": string
          "wall_id": string
          "storage_path": string
          "alt_text": string
          "width": number
          "height": number
          "captured_at": string | null
          "version": number
          "is_current": boolean
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "wall_id": string
          "storage_path": string
          "alt_text": string
          "width": number
          "height": number
          "captured_at"?: string | null
          "version"?: number
          "is_current"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "wall_id"?: string
          "storage_path"?: string
          "alt_text"?: string
          "width"?: number
          "height"?: number
          "captured_at"?: string | null
          "version"?: number
          "is_current"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_images_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_images_wall_fkey"
            columns: ["wall_id","gym_id"]
            isOneToOne: false
            referencedRelation: "walls"
            referencedColumns: ["id","gym_id"]
          }
        ]
      }
      "walls": {
        Row: {
          "id": string
          "gym_id": string
          "name": string
          "description": string | null
          "sort_order": number
          "is_active": boolean
          "archived_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert: {
          "id"?: string
          "gym_id": string
          "name": string
          "description"?: string | null
          "sort_order"?: number
          "is_active"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update: {
          "id"?: string
          "gym_id"?: string
          "name"?: string
          "description"?: string | null
          "sort_order"?: number
          "is_active"?: boolean
          "archived_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "walls_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      "competition_leaderboard": {
        Row: {
          "gym_id": string | null
          "competition_id": string | null
          "profile_id": string | null
          "guest_invite_id": string | null
          "total_score": number | null
          "tops": number | null
          "zones": number | null
          "attempts": number | null
          "rank": number | null
        }
        Relationships: []
      }
    }
    Functions: {
      administrative_reset_application_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_administrative_reset_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_chat_channel_summaries: { Args: { target_gym_id: string }; Returns: { id: string; name: string; description: string | null; channel_type: string; is_read_only: boolean; created_at: string; unread: number }[] }
      get_gym_join_status: {
        Args: { join_reference: string; reference_kind: string }
        Returns: { state: string; gym_id: string | null; gym_slug: string | null; gym_name: string | null }[]
      }
      join_gym_as_member: {
        Args: { join_reference: string; reference_kind: string }
        Returns: string
      }
      get_gym_join_credentials: {
        Args: { target_gym_id: string }
        Returns: { join_identifier: string; join_code: string; enabled: boolean; rotated_at: string }[]
      }
      rotate_gym_join_credentials: {
        Args: { target_gym_id: string }
        Returns: { join_identifier: string; join_code: string; enabled: boolean; rotated_at: string }[]
      }
      set_gym_join_enabled: {
        Args: { target_gym_id: string; access_enabled: boolean }
        Returns: boolean
      }
      create_gym_tenant: {
        Args: { actor_profile_id: string; owner_profile_id: string; configuration: Json; branding: Json }
        Returns: string
      }
      create_my_first_gym: {
        Args: { configuration: Json }
        Returns: string
      }
      is_gym_slug_available: {
        Args: { requested_slug: string }
        Returns: boolean
      }
      attach_wall_image: {
        Args: { target_gym_id: string; target_wall_id: string; object_path: string; image_alt_text: string; image_width: number; image_height: number; image_captured_at?: string | null }
        Returns: string
      }
      attach_route_media: {
        Args: { target_gym_id: string; target_route_id: string; object_path: string; object_media_type: string; object_alt_text?: string | null }
        Returns: string
      }
      publish_routes: {
        Args: { target_gym_id: string; target_route_ids: string[] }
        Returns: number
      }
      retire_routes: {
        Args: { target_gym_id: string; target_route_ids: string[] }
        Returns: number
      }
      submit_route_feedback: {
        Args: { target_gym_id: string; target_route_id: string; target_kind: string; feedback_comment?: string | null }
        Returns: string
      }
      toggle_route_favourite: {
        Args: { target_gym_id: string; target_route_id: string }
        Returns: boolean
      }
      get_route_public_metrics: {
        Args: { target_gym_id: string; target_route_id: string }
        Returns: Json
      }
      triage_route_feedback: {
        Args: { target_feedback_id: string; target_status: string }
        Returns: string
      }
      save_waiver_draft: {
        Args: { target_gym_id: string; target_waiver_id: string | null; template_name: string; template_description: string; required_for_entry: boolean; version_title: string; version_content: string; version_requirements: Json }
        Returns: string
      }
      publish_waiver_version: {
        Args: { target_gym_id: string; target_version_id: string }
        Returns: string
      }
      accept_member_waiver: {
        Args: { target_gym_id: string; target_version_id: string; acceptance: Json }
        Returns: string
      }
      accept_guest_waiver: {
        Args: { invitation_token_hash: string; target_version_id: string; acceptance: Json }
        Returns: string
      }
      register_public_day_pass: {
        Args: { target_gym_slug: string; guest_full_name: string; guest_email: string; invitation_token_hash: string; pass_reference_hash: string; payment_choice: string }
        Returns: Json
      }
      create_guest_pass: {
        Args: { target_gym_id: string; guest_full_name: string; guest_email: string; invitation_token_hash: string; pass_reference_hash: string; payment_choice: string }
        Returns: Json
      }
      configure_day_pass_registration: {
        Args: { target_gym_id: string; registration_enabled: boolean; valid_hours: number; public_information: string }
        Returns: string
      }
      verify_guest_pass: {
        Args: { target_gym_id: string; pass_reference_hash: string }
        Returns: Json
      }
      check_in_guest_pass: {
        Args: { target_gym_id: string; pass_reference_hash: string; confirm_reception_payment?: boolean }
        Returns: string
      }
      revoke_guest_pass: {
        Args: { target_gym_id: string; target_pass_id: string }
        Returns: string
      }
      issue_member_check_in_token: {
        Args: { target_gym_id: string; new_token_hash: string; token_expires_at: string }
        Returns: string
      }
      verify_member_check_in_token: {
        Args: { target_gym_id: string; member_token_hash: string }
        Returns: Json
      }
      check_in_member_token: {
        Args: { target_gym_id: string; member_token_hash: string }
        Returns: string
      }
      manual_member_check_in: {
        Args: { target_gym_id: string; target_membership_id: string }
        Returns: string
      }
      register_for_event: {
        Args: { target_gym_id: string; target_event_id: string }
        Returns: string
      }
      cancel_event_registration: {
        Args: { target_gym_id: string; target_event_id: string }
        Returns: string
      }
      get_event_availability: {
        Args: { target_gym_id: string; target_event_id: string }
        Returns: Json
      }
      save_ascent: {
        Args: { target_gym_id: string; target_route_id: string; target_ascent_id: string | null; target_session_id: string | null; target_session_date: string; target_outcome: string; target_attempts: number; target_notes: string; target_visibility: string }
        Returns: string
      }
      delete_ascent: {
        Args: { target_gym_id: string; target_ascent_id: string }
        Returns: string
      }
      attach_ascent_media: {
        Args: { target_gym_id: string; target_ascent_id: string; object_path: string; object_media_type: string }
        Returns: string
      }
      process_my_achievements: {
        Args: { target_gym_id: string }
        Returns: number
      }
      set_leaderboard_preference: {
        Args: { target_gym_id: string; participate: boolean; name_mode: string }
        Returns: string
      }
      get_community_leaderboard: {
        Args: { target_gym_id: string; category: string; window_month: string }
        Returns: { rank: number; profile_id: string; display_name: string; score: number; window_start: string; window_end: string; tie_achieved_at: string | null }[]
      }
      accept_community_guidelines: { Args: { target_gym_id: string }; Returns: string }
      create_community_post: { Args: { target_gym_id: string; post_title: string; post_body: string; post_image_path: string | null }; Returns: string }
      create_community_comment: { Args: { target_gym_id: string; target_post_id: string; comment_body: string }; Returns: string }
      toggle_community_reaction: { Args: { target_gym_id: string; target_post_id: string; reaction_name: string }; Returns: boolean }
      delete_community_content: { Args: { target_gym_id: string; target_type: string; target_id: string }; Returns: string }
      report_community_content: { Args: { target_gym_id: string; target_type: string; target_id: string; report_reason: string }; Returns: string }
      moderate_community_post: { Args: { target_gym_id: string; target_post_id: string; target_status: string; lock_post: boolean; reason: string; pin_post: boolean }; Returns: string }
      create_partner_request: { Args: { target_gym_id: string; window_start: string; window_end: string; discipline_name: string; ability_name: string; intent_name: string; public_note: string; private_availability: string }; Returns: string }
      get_partner_requests: { Args: { target_gym_id: string }; Returns: { id: string; profile_id: string; public_name: string; climbing_day: string; discipline: string; approximate_ability: string; session_intent: string; body: string; status: string; exact_start: string | null; exact_end: string | null; availability_note: string | null; is_owner: boolean }[] }
      express_partner_interest: { Args: { target_gym_id: string; target_request_id: string; interest_note: string }; Returns: string }
      respond_partner_interest: { Args: { target_gym_id: string; target_interest_id: string; accept_interest: boolean }; Returns: string }
      withdraw_partner_request: { Args: { target_gym_id: string; target_request_id: string }; Returns: string }
      report_partner_request: { Args: { target_gym_id: string; target_request_id: string; report_reason: string }; Returns: string }
      create_chat_channel: { Args: { target_gym_id: string; channel_name: string; channel_description: string; read_only?: boolean }; Returns: string }
      send_chat_message: { Args: { target_gym_id: string; target_channel_id: string; message_body: string; target_reply_id?: string }; Returns: string }
      edit_chat_message: { Args: { target_gym_id: string; target_message_id: string; message_body: string }; Returns: string }
      delete_chat_message: { Args: { target_gym_id: string; target_message_id: string }; Returns: string }
      mark_channel_read: { Args: { target_gym_id: string; target_channel_id: string }; Returns: string }
      report_chat_message: { Args: { target_gym_id: string; target_message_id: string; report_reason: string }; Returns: string }
      moderate_chat_message: { Args: { target_gym_id: string; target_message_id: string; target_status: string; reason: string }; Returns: string }
      save_competition: { Args: { target_gym_id: string; target_competition_id?: string; competition_name: string; competition_description: string; window_start: string; window_end: string; registration_start: string; registration_end: string; competition_status: string; maximum_attempts: number; division_names: string[] }; Returns: string }
      add_competition_route: { Args: { target_gym_id: string; target_competition_id: string; target_route_id: string }; Returns: string }
      register_for_competition: { Args: { target_gym_id: string; target_competition_id: string; target_division_id: string }; Returns: string }
      submit_competition_score: { Args: { target_gym_id: string; target_competition_id: string; target_competition_route_id: string; target_profile_id: string; top_achieved: boolean; zone_achieved: boolean; attempt_count: number; correction_reason?: string }; Returns: string }
      finalize_competition: { Args: { target_gym_id: string; target_competition_id: string }; Returns: string }
      get_route_setting_analytics: { Args: { target_gym_id: string; date_from: string; date_to: string; target_wall_id?: string; target_setter_id?: string; target_route_type?: string }; Returns: { route_id: string; route_name: string; colour: string; grade: string; grade_system: string; route_type: string; wall_name: string; setter_name: string; set_on: string | null; age_days: number; styles: string[]; activity_count: number; send_count: number; attempt_count: number; send_ratio: number | null; grade_soft: number; grade_right: number; grade_hard: number; open_issues: number; sample_size: number; low_sample: boolean; reset_priority: string }[] }
      get_gym_operational_analytics: { Args: { target_gym_id: string; date_from: string; date_to: string }; Returns: { period: string; metric_key: string; metric_label: string; metric_value: number; definition: string }[] }
      get_integration_statuses: { Args: { target_gym_id: string }; Returns: { id: string; provider_key: string; provider_category: string; status: string; last_sync_at: string | null; last_error_code: string | null; updated_at: string; queued: number; dead_letter: number }[] }
      ingest_integration_delivery: { Args: { target_integration_id: string; target_provider_key: string; event_key: string; event_payload: Json }; Returns: string }
      record_integration_delivery_attempt: { Args: { target_delivery_id: string; succeeded: boolean; error_code?: string }; Returns: string }
      upsert_stripe_billing_customer: { Args: { target_gym_id: string; customer_id: string; billing_address: string }; Returns: string }
      apply_stripe_subscription_event: { Args: { event_id: string; event_type: string; event_livemode: boolean; customer_id: string; subscription_id: string; price_id: string; subscription_status: string; period_start?: string; period_end?: string; cancel_period_end: boolean; cancelled_at?: string; trial_end?: string; plan_name: string }; Returns: boolean }
      get_plan_usage: { Args: { target_gym_id: string }; Returns: { plan_key: string; plan_name: string; subscription_status: string; grace_ends_at: string | null; feature_key: string; enabled: boolean; limit_value: number | null; usage_value: number; restricted: boolean }[] }
      has_feature_entitlement: { Args: { target_gym_id: string; target_feature: string }; Returns: boolean }
      platform_list_gyms: { Args: { actor_profile_id: string; search_term?: string; result_limit?: number }; Returns: Json }
      platform_gym_support_view: { Args: { actor_profile_id: string; target_gym_id: string }; Returns: Json }
      add_platform_support_note: { Args: { actor_profile_id: string; target_gym_id: string; note_body: string }; Returns: string }
      suspend_platform_gym: { Args: { actor_profile_id: string; target_gym_id: string; reason: string }; Returns: undefined }
      restore_platform_gym: { Args: { actor_profile_id: string; target_gym_id: string; reason: string }; Returns: undefined }
      report_media_asset: { Args: { target_gym_id: string; target_media_id: string; report_reason: string }; Returns: string }
      search_gym_content: { Args: { target_gym_id: string; search_query: string; result_limit?: number }; Returns: { result_kind: string; result_id: string; title: string; snippet: string; path: string; rank: number }[] }
      export_my_gym_data: { Args: { target_gym_id: string }; Returns: Json }
      export_gym_operational_data: { Args: { target_gym_id: string }; Returns: Json }
      save_profile_privacy: { Args: { public_name: string; visibility: string; social_access: string; searchable: boolean; marketing_allowed: boolean }; Returns: undefined }
      request_account_deletion: { Args: { request_reason: string }; Returns: string }
      deactivate_my_account: { Args: { deactivation_reason: string }; Returns: undefined }
      export_member_subject_data: { Args: { target_gym_id: string; target_profile_id: string }; Returns: Json }
      update_staff_access: {
        Args: { target_membership_id: string; target_role_key: string; target_status: string }
        Returns: string
      }
      update_gym_configuration: {
        Args: { target_gym_id: string; gym_name: string; gym_slug: string; gym_timezone: string; gym_country_code: string; gym_address_line_1: string; gym_address_line_2: string; gym_city: string; gym_postcode: string; gym_contact_email: string; gym_contact_phone: string; gym_disciplines: string[]; gym_opening_hours_text: string; allow_public_join_requests: boolean; brand_primary_colour: string; brand_accent_colour: string; brand_background_colour: string; brand_welcome_message: string }
        Returns: string
      }
      save_gym_setup_step: {
        Args: { target_gym_id: string; target_step: number; configuration?: Json }
        Returns: number
      }
      set_gym_logo_path: {
        Args: { target_gym_id: string; object_path: string }
        Returns: string
      }
      process_due_announcements: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      set_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database["public"]

export type Tables<
  Name extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][Name]["Row"]

export type TablesInsert<
  Name extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][Name]["Insert"]

export type TablesUpdate<
  Name extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][Name]["Update"]
