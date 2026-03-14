import { useState, useCallback, useEffect, useRef } from 'react';
import type { Project, PayItem, Annotation, Calibration, TocEntry, ToolMode } from '@/types/project';
import { DEFAULT_PAY_ITEMS } from '@/types/project';
import * as storage from '@/lib/storage';

interface UndoAction {
  type: 'add' | 'remove';
  annotation: Annotation;
}

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [payItems, setPayItems] = useState<PayItem[]>(() => {
    // We can't restore PDFs across refreshes, so always start clean
    storage.clearActiveProject();
    return [];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activePayItemId, setActivePayItemId] = useState<string>(payItems[0]?.id || '');
  const [scale, setScale] = useState(1.5);

  // Undo/redo stacks
  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);

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
    undoStack.current = [];
    redoStack.current = [];
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

  const copyCalibrationToPages = useCallback((fromPage: number, toPages: number[]) => {
    if (!project) return;
    const cal = project.calibrations[fromPage];
    if (!cal) return;
    const newCals = { ...project.calibrations };
    for (const p of toPages) {
      newCals[p] = { ...cal };
    }
    persist({ ...project, calibrations: newCals });
  }, [project, persist]);

  const addAnnotation = useCallback((annotation: Annotation) => {
    if (!project) return;
    const updated = { ...project, annotations: [...project.annotations, annotation] };
    persist(updated);
    undoStack.current.push({ type: 'add', annotation });
    redoStack.current = [];
  }, [project, persist]);

  const removeAnnotation = useCallback((id: string) => {
    if (!project) return;
    const ann = project.annotations.find(a => a.id === id);
    if (!ann) return;
    const updated = { ...project, annotations: project.annotations.filter(a => a.id !== id) };
    persist(updated);
    undoStack.current.push({ type: 'remove', annotation: ann });
    redoStack.current = [];
  }, [project, persist]);

  const updateAnnotation = useCallback((id: string, changes: Partial<Annotation>) => {
    if (!project) return;
    const updated = {
      ...project,
      annotations: project.annotations.map(a => a.id === id ? { ...a, ...changes } : a)
    };
    persist(updated);
  }, [project, persist]);

  const undo = useCallback(() => {
    if (!project || undoStack.current.length === 0) return;
    const action = undoStack.current.pop()!;
    if (action.type === 'add') {
      // Undo an add = remove
      const updated = { ...project, annotations: project.annotations.filter(a => a.id !== action.annotation.id) };
      persist(updated);
    } else {
      // Undo a remove = add back
      const updated = { ...project, annotations: [...project.annotations, action.annotation] };
      persist(updated);
    }
    redoStack.current.push(action);
  }, [project, persist]);

  const redo = useCallback(() => {
    if (!project || redoStack.current.length === 0) return;
    const action = redoStack.current.pop()!;
    if (action.type === 'add') {
      // Redo an add = add again
      const updated = { ...project, annotations: [...project.annotations, action.annotation] };
      persist(updated);
    } else {
      // Redo a remove = remove again
      const updated = { ...project, annotations: project.annotations.filter(a => a.id !== action.annotation.id) };
      persist(updated);
    }
    undoStack.current.push(action);
  }, [project, persist]);

  const canUndo = project ? undoStack.current.length > 0 : false;
  const canRedo = project ? redoStack.current.length > 0 : false;

  const removeAnnotationsForPayItem = useCallback((payItemId: string) => {
    if (!project) return;
    const updated = {
      ...project,
      annotations: project.annotations.filter(a => a.payItemId !== payItemId),
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
    setPayItems([]);
    storage.savePayItems([]);
    setCurrentPage(1);
    setTotalPages(0);
    setToolMode('select');
    setActivePayItemId('');
    undoStack.current = [];
    redoStack.current = [];
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
    copyCalibrationToPages,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    currentCalibration,
    persist,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
