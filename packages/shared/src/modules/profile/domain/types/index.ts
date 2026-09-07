export interface ProfileType {
  id: string;
  userId: string;
  fullName: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  links: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceType {
  id: string;
  userId: string;
  company: string;
  title: string;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  summary: string | null;
  bullets: string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillType {
  id: string;
  userId: string;
  name: string;
  categories: string[];
  level: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectType {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  url: string | null;
  tech: string[];
  platform: string[];
  startDate: Date | null;
  endDate: Date | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateType {
  id: string;
  userId: string;
  name: string;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  credentialId: string | null;
  credentialUrl: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EducationType {
  id: string;
  userId: string;
  school: string;
  degree: string | null;
  field: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  gpa: string | null;
  achievements: string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileUpsertDto {
  userId: string;
  fullName?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  links?: Record<string, string>;
}

export interface CreateExperienceDto {
  userId: string;
  company: string;
  title: string;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isCurrent?: boolean;
  summary?: string | null;
  bullets?: string[];
  position?: number;
}

export interface UpdateExperienceDto {
  company?: string;
  title?: string;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isCurrent?: boolean;
  summary?: string | null;
  bullets?: string[];
}

export interface CreateEducationDto {
  userId: string;
  school: string;
  degree?: string | null;
  field?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  gpa?: string | null;
  achievements?: string[];
  position?: number;
}

export interface UpdateEducationDto {
  school?: string;
  degree?: string | null;
  field?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  gpa?: string | null;
  achievements?: string[];
}

export interface CreateSkillDto {
  userId: string;
  name: string;
  categories?: string[];
  level?: string | null;
  position?: number;
}

export interface UpdateSkillDto {
  name?: string;
  categories?: string[];
  level?: string | null;
}

export interface CreateProjectDto {
  userId: string;
  name: string;
  description?: string | null;
  url?: string | null;
  tech?: string[];
  platform?: string[];
  startDate?: Date | null;
  endDate?: Date | null;
  position?: number;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string | null;
  url?: string | null;
  tech?: string[];
  platform?: string[];
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface CreateCertificateDto {
  userId: string;
  name: string;
  issuer?: string | null;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
  position?: number;
}

export interface UpdateCertificateDto {
  name?: string;
  issuer?: string | null;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
}
