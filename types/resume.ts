export interface Experience {
  company: string;
  role: string;
  bullets: string[];
}

export interface Project {
  title: string;
  bullets: string[];
}

export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
  };
  summary: string;
  experience: Experience[];
  projects: Project[];
}