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
            foreignKeyName: "competitions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
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
        }
        Relationships: []
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
