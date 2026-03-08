import type { Project, PayItem } from '@/types/project';
import { DEFAULT_PAY_ITEMS } from '@/types/project';

const PROJECTS_KEY = 'takeoff_projects';
const PAY_ITEMS_KEY = 'takeoff_pay_items';
const ACTIVE_PROJECT_KEY = 'takeoff_active_project';

export function getProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  project.updatedAt = new Date().toISOString();
  if (idx >= 0) projects[idx] = project;
  else projects.push(project);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getPayItems(): PayItem[] {
  try {
    const raw = localStorage.getItem(PAY_ITEMS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PAY_ITEMS;
  } catch { return DEFAULT_PAY_ITEMS; }
}

export function savePayItems(items: PayItem[]): void {
  localStorage.setItem(PAY_ITEMS_KEY, JSON.stringify(items));
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string): void {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function clearActiveProject(): void {
  localStorage.removeItem(ACTIVE_PROJECT_KEY);
}
