import { useState, useCallback, useEffect } from 'react';
import type { Project, PayItem, Annotation, Calibration, TocEntry, ToolMode } from '@/types/project';
import { DEFAULT_PAY_ITEMS } from '@/types/project';
import * as storage from '@/lib/storage';

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [payItems, setPayItems] = useState<PayItem[]>(() => storage.getPayItems());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activePayItemId, setActivePayItemId] = useState<string>(payItems[0]?.id || '');
  const [scale, setScale] = useState(1.5);

  // Load saved project on mount
  useEffect(() => {
    const activeId = storage.getActiveProjectId();
    if (activeId) {
      const projects = storage.getProjects();
      const found = projects.find(p => p.id === activeId);
      if (found) setProject(found);
    }
  }, []);

  const createProject = useCallback((name: string, contractNumber: string, pdfFileName: string, toc: TocEntry[], numPages: number) => {
    const proj: Project = {
      id: crypto.randomUUID(),
      name,
      contractNumber,
      pdfFileName,
      toc,
      calibrations: {},
      annotations: [],
      payItems: [...payItems],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(proj);
    setTotalPages(numPages);
    setCurrentPage(1);
    storage.saveProject(proj);
    storage.setActiveProjectId(proj.id);
    return proj;
  }, [payItems]);

  const persist = useCallback((updated: Project) => {
    setProject(updated);
    storage.saveProject(updated);
  }, []);

  const setCalibration = useCallback((page: number, cal: Calibration) => {
    if (!project) return;
    const updated = { ...project, calibrations: { ...project.calibrations, [page]: cal } };
    persist(updated);
  }, [project, persist]);

  const addAnnotation = useCallback((annotation: Annotation) => {
    if (!project) return;
    const updated = { ...project, annotations: [...project.annotations, annotation] };
    persist(updated);
  }, [project, persist]);

  const removeAnnotation = useCallback((id: string) => {
    if (!project) return;
    const updated = { ...project, annotations: project.annotations.filter(a => a.id !== id) };
    persist(updated);
  }, [project, persist]);

  const updateAnnotation = useCallback((id: string, changes: Partial<Annotation>) => {
    if (!project) return;
    const updated = {
      ...project,
      annotations: project.annotations.map(a => a.id === id ? { ...a, ...changes } : a)
    };
    persist(updated);
  }, [project, persist]);

  const updatePayItems = useCallback((items: PayItem[]) => {
    setPayItems(items);
    storage.savePayItems(items);
    if (project) {
      persist({ ...project, payItems: items });
    }
  }, [project, persist]);

  const closeProject = useCallback(() => {
    if (project) {
      storage.clearActiveProject();
    }
    setProject(null);
    setCurrentPage(1);
    setTotalPages(0);
    setToolMode('select');
  }, [project]);

  const currentCalibration = project?.calibrations[currentPage] || null;

  return {
    project,
    createProject,
    closeProject,
    payItems,
    updatePayItems,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    toolMode,
    setToolMode,
    activePayItemId,
    setActivePayItemId,
    scale,
    setScale,
    setCalibration,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    currentCalibration,
    persist,
  };
}
