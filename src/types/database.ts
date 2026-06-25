export type UserRole = "staff" | "owner" | "admin";

export type JobStatus = "open" | "closed" | "hidden";

export type ApplicationStatus =
  | "submitted"
  | "viewed"
  | "accepted"
  | "rejected"
  | "canceled";

export type GenderCondition = "any" | "male" | "female";

export type ExperienceStatus = "none" | "experienced";

export type StipendType = "none" | "provided" | "negotiable" | "custom";

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Guesthouse {
  id: string;
  owner_id: string;
  name: string;
  region: string;
  address_text: string;
  map_url: string | null;
  contact_method: string;
  created_at: string;
  updated_at: string;
}

export interface JobPost {
  id: string;
  guesthouse_id: string;
  owner_id: string;
  slug: string;
  title: string;
  recruit_count: number;
  gender_condition: GenderCondition;
  age_condition: string | null;
  work_start_date: string;
  min_work_period: string;
  work_content: string;
  work_time: string;
  work_days_per_week: number;
  off_days_per_week: number;
  stipend_type: StipendType;
  stipend_description: string | null;
  provides_accommodation: boolean;
  provides_meal: boolean;
  is_urgent: boolean;
  last_urgent_marked_at: string | null;
  preferred_conditions: string | null;
  caution: string | null;
  extra_info: string | null;
  description: string | null;
  status: JobStatus;
  recruitment_cycle: number;
  bumped_at: string;
  last_bumped_at: string | null;
  bump_count: number;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  job_post_id: string;
  staff_id: string;
  recruitment_cycle: number;
  name: string;
  age: number;
  gender: GenderCondition;
  phone: string;
  representative_photo_path: string;
  available_start_date: string;
  available_work_period: string;
  experience_status: ExperienceStatus;
  introduction: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export type JobPostFormData = Omit<
  JobPost,
  | "id"
  | "guesthouse_id"
  | "owner_id"
  | "slug"
  | "status"
  | "recruitment_cycle"
  | "bumped_at"
  | "last_bumped_at"
  | "last_urgent_marked_at"
  | "bump_count"
  | "created_at"
  | "updated_at"
>;

export type GuesthouseFormData = Omit<
  Guesthouse,
  "id" | "owner_id" | "created_at" | "updated_at"
>;
