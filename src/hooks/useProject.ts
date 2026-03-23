import { useState, useCallback, useRef, useEffect } from 'react';
import type { Project, PayItem, Annotation, Calibration, TocEntry, ToolMode } from '@/types/project';
import { supabase } from '@/integrations/supabase/client';

interface UndoAction {
  type: 'add' | 'remove';
  annotation: Annotation;
}

/** Optional Supabase project ID + user ID for cloud persistence */
interface UseProjectOptions {
  supabaseProjectId?: string;
  userId?: string;
}

export function useProject(options: UseProjectOptions = {}) {
  const { supabaseProjectId, userId } = options;

  const [project, setProject] = useState<Project | null>(null);
  const [payItems, setPayItems] = useState<PayItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activePayItemId, setActivePayItemId] = useState<string>('');
  const [scale, setScale] = useState(1.5);

  const undoStack = useRef<UndoAction[]>([]);
  const redoStack = useRef<UndoAction[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  // Helper: sync to Supabase if connected
  const dbSync = useCallback(() => !!supabaseProjectId && !!userId, [supabaseProjectId, userId]);

  const initProject = useCallback((
    name: string, contractNumber: string, pdfFileName: string, toc: TocEntry[], numPages: number,
    existingAnnotations?: Annotation[], existingCalibrations?: Record<number, Calibration>, existingPayItems?: PayItem[],
  ) => {
    const proj: Project = {
      id: supabaseProjectId || crypto.randomUUID(),
      name,
      contractNumber,
      pdfFileName,
      toc,
      calibrations: existingCalibrations || {},
      annotations: existingAnnotations || [],
      payItems: existingPayItems || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProject(proj);
    if (numPages > 0) setTotalPages(numPages);
    setCurrentPage(1);
    if (existingPayItems && existingPayItems.length > 0) {
      setPayItems(existingPayItems);
    }
    undoStack.current = [];
    redoStack.current = [];
    return proj;
  }, [supabaseProjectId]);

  const persist = useCallback((updated: Project) => {
    setProject(updated);
  }, []);

  // ── Calibrations ──
  const setCalibration = useCallback(async (page: number, cal: Calibration) => {
    if (!project) return;
    const updated = { ...project, calibrations: { ...project.calibrations, [page]: cal } };
    persist(updated);

    if (dbSync() && supabaseProjectId) {
      // Upsert calibration in DB
      const existing = await supabase.from('calibrations')
        .select('id').eq('project_id', supabaseProjectId).eq('page', page).maybeSingle();

      if (existing.data) {
        await supabase.from('calibrations').update({
          point1: cal.point1 as any,
          point2: cal.point2 as any,
          real_distance: cal.realDistance,
          pixels_per_foot: cal.pixelsPerFoot,
        }).eq('id', existing.data.id);
      } else {
        await supabase.from('calibrations').insert({
          project_id: supabaseProjectId,
          page,
          point1: cal.point1 as any,
          point2: cal.point2 as any,
          real_distance: cal.realDistance,
          pixels_per_foot: cal.pixelsPerFoot,
        });
      }
    }
  }, [project, persist, dbSync, supabaseProjectId]);

  const copyCalibrationToPages = useCallback(async (fromPage: number, toPages: number[]) => {
    if (!project) return;
    const cal = project.calibrations[fromPage];
    if (!cal) return;
    const newCals = { ...project.calibrations };
    for (const p of toPages) {
      newCals[p] = { ...cal };
    }
    persist({ ...project, calibrations: newCals });

    if (dbSync() && supabaseProjectId) {
      // Batch upsert calibrations
      const rows = toPages.map(p => ({
        project_id: supabaseProjectId,
        page: p,
        point1: cal.point1 as any,
        point2: cal.point2 as any,
        real_distance: cal.realDistance,
        pixels_per_foot: cal.pixelsPerFoot,
      }));
      // Delete existing then insert
      for (const p of toPages) {
        await supabase.from('calibrations').delete()
          .eq('project_id', supabaseProjectId).eq('page', p);
      }
      await supabase.from('calibrations').insert(rows);
    }
  }, [project, persist, dbSync, supabaseProjectId]);

  // ── Annotations ──
  const addAnnotation = useCallback(async (annotation: Annotation) => {
    if (!project) return;
    const updated = { ...project, annotations: [...project.annotations, annotation] };
    persist(updated);
    undoStack.current.push({ type: 'add', annotation });
    redoStack.current = [];
    setUndoCount(undoStack.current.length);
    setRedoCount(0);

    if (dbSync() && supabaseProjectId && userId) {
      await supabase.from('annotations').insert({
        id: annotation.id,
        project_id: supabaseProjectId,
        user_id: userId,
        type: annotation.type,
        points: annotation.points as any,
        pay_item_id: annotation.payItemId || null,
        page: annotation.page,
        depth: annotation.depth ?? null,
        measurement: annotation.measurement,
        measurement_unit: annotation.measurementUnit,
        manual_quantity: annotation.manualQuantity ?? null,
        location: annotation.location || '',
        notes: annotation.notes || '',
      });
    }
  }, [project, persist, dbSync, supabaseProjectId, userId]);

  const removeAnnotation = useCallback(async (id: string) => {
    if (!project) return;
    const ann = project.annotations.find(a => a.id === id);
    if (!ann) return;
    const updated = { ...project, annotations: project.annotations.filter(a => a.id !== id) };
    persist(updated);
    undoStack.current.push({ type: 'remove', annotation: ann });
    redoStack.current = [];
    setUndoCount(undoStack.current.length);
    setRedoCount(0);

    if (dbSync()) {
      await supabase.from('annotations').delete().eq('id', id);
    }
  }, [project, persist, dbSync]);

  const updateAnnotation = useCallback(async (id: string, changes: Partial<Annotation>) => {
    if (!project) return;
    const updated = {
      ...project,
      annotations: project.annotations.map(a => a.id === id ? { ...a, ...changes } : a),
    };
    persist(updated);

    if (dbSync()) {
      const dbChanges: Record<string, any> = {};
      if (changes.type !== undefined) dbChanges.type = changes.type;
      if (changes.points !== undefined) dbChanges.points = changes.points;
      if (changes.payItemId !== undefined) dbChanges.pay_item_id = changes.payItemId || null;
      if (changes.page !== undefined) dbChanges.page = changes.page;
      if (changes.depth !== undefined) dbChanges.depth = changes.depth ?? null;
      if (changes.measurement !== undefined) dbChanges.measurement = changes.measurement;
      if (changes.measurementUnit !== undefined) dbChanges.measurement_unit = changes.measurementUnit;
      if ('manualQuantity' in changes) dbChanges.manual_quantity = changes.manualQuantity ?? null;
      if (changes.location !== undefined) dbChanges.location = changes.location;
      if (changes.notes !== undefined) dbChanges.notes = changes.notes;
      if (Object.keys(dbChanges).length > 0) {
        await supabase.from('annotations').update(dbChanges).eq('id', id);
      }
    }
  }, [project, persist, dbSync]);

  const removeAnnotationsForPayItem = useCallback(async (payItemId: string) => {
    if (!project) return;
    const toRemove = project.annotations.filter(a => a.payItemId === payItemId);
    const updated = {
      ...project,
      annotations: project.annotations.filter(a => a.payItemId !== payItemId),
    };
    persist(updated);

    if (dbSync() && supabaseProjectId) {
      const ids = toRemove.map(a => a.id);
      if (ids.length > 0) {
        await supabase.from('annotations').delete().in('id', ids);
      }
    }
  }, [project, persist, dbSync, supabaseProjectId]);

  // ── Undo/Redo ──
  const undo = useCallback(async () => {
    if (!project || undoStack.current.length === 0) return;
    const action = undoStack.current.pop()!;
    if (action.type === 'add') {
      const updated = { ...project, annotations: project.annotations.filter(a => a.id !== action.annotation.id) };
      persist(updated);
      if (dbSync()) await supabase.from('annotations').delete().eq('id', action.annotation.id);
    } else {
      const updated = { ...project, annotations: [...project.annotations, action.annotation] };
      persist(updated);
      if (dbSync() && supabaseProjectId && userId) {
        const ann = action.annotation;
        await supabase.from('annotations').insert({
          id: ann.id, project_id: supabaseProjectId, user_id: userId,
          type: ann.type, points: ann.points as any, pay_item_id: ann.payItemId || null,
          page: ann.page, depth: ann.depth ?? null, measurement: ann.measurement,
          measurement_unit: ann.measurementUnit,
        });
      }
    }
    redoStack.current.push(action);
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
  }, [project, persist, dbSync, supabaseProjectId, userId]);

  const redo = useCallback(async () => {
    if (!project || redoStack.current.length === 0) return;
    const action = redoStack.current.pop()!;
    if (action.type === 'add') {
      const updated = { ...project, annotations: [...project.annotations, action.annotation] };
      persist(updated);
      if (dbSync() && supabaseProjectId && userId) {
        const ann = action.annotation;
        await supabase.from('annotations').insert({
          id: ann.id, project_id: supabaseProjectId, user_id: userId,
          type: ann.type, points: ann.points as any, pay_item_id: ann.payItemId || null,
          page: ann.page, depth: ann.depth ?? null, measurement: ann.measurement,
          measurement_unit: ann.measurementUnit,
        });
      }
    } else {
      const updated = { ...project, annotations: project.annotations.filter(a => a.id !== action.annotation.id) };
      persist(updated);
      if (dbSync()) await supabase.from('annotations').delete().eq('id', action.annotation.id);
    }
    undoStack.current.push(action);
  }, [project, persist, dbSync, supabaseProjectId, userId]);

  const canUndo = project ? undoStack.current.length > 0 : false;
  const canRedo = project ? redoStack.current.length > 0 : false;

  // ── Pay Items ──
  const updatePayItems = useCallback(async (items: PayItem[]) => {
    setPayItems(items);
    if (project) {
      persist({ ...project, payItems: items });
    }

    if (dbSync() && supabaseProjectId) {
      // Delete all existing pay items for this project, then insert new ones
      await supabase.from('pay_items').delete().eq('project_id', supabaseProjectId);
      if (items.length > 0) {
        const rows = items.map(pi => ({
          id: pi.id,
          project_id: supabaseProjectId,
          item_number: pi.itemNumber,
          item_code: pi.itemCode,
          name: pi.name,
          unit: pi.unit,
          unit_price: pi.unitPrice,
          color: pi.color,
          contract_quantity: pi.contractQuantity ?? null,
          drawable: pi.drawable,
        }));
        await supabase.from('pay_items').insert(rows);
      }
    }
  }, [project, persist, dbSync, supabaseProjectId]);

  // ── TOC persistence ──
  const updateToc = useCallback(async (toc: TocEntry[]) => {
    if (!project) return;
    persist({ ...project, toc });

    if (dbSync() && supabaseProjectId) {
      await supabase.from('projects').update({ toc: toc as any }).eq('id', supabaseProjectId);
    }
  }, [project, persist, dbSync, supabaseProjectId]);

  // ── Realtime subscription for annotations ──
  useEffect(() => {
    if (!supabaseProjectId || !userId) return;

    const channel = supabase
      .channel(`annotations:${supabaseProjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `project_id=eq.${supabaseProjectId}`,
        },
        (payload) => {
          // Ignore changes from the current user
          const record = (payload.new as any);
          const oldRecord = (payload.old as any);

          if (payload.eventType === 'INSERT' && record.user_id !== userId) {
            const ann: Annotation = {
              id: record.id,
              type: record.type as Annotation['type'],
              points: record.points as any,
              payItemId: record.pay_item_id || '',
              page: record.page,
              depth: record.depth ?? undefined,
              measurement: record.measurement,
              measurementUnit: record.measurement_unit,
              manualQuantity: record.manual_quantity ?? undefined,
              location: record.location || '',
              notes: record.notes || '',
              createdAt: record.created_at,
            };
            setProject(prev => prev ? { ...prev, annotations: [...prev.annotations, ann] } : prev);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = oldRecord?.id;
            if (deletedId) {
              setProject(prev => prev ? { ...prev, annotations: prev.annotations.filter(a => a.id !== deletedId) } : prev);
            }
          } else if (payload.eventType === 'UPDATE' && record.user_id !== userId) {
            setProject(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                annotations: prev.annotations.map(a =>
                    a.id === record.id
                    ? {
                        ...a,
                        type: record.type as Annotation['type'],
                        points: record.points as any,
                        payItemId: record.pay_item_id || '',
                        page: record.page,
                        depth: record.depth ?? undefined,
                        measurement: record.measurement,
                        measurementUnit: record.measurement_unit,
                        manualQuantity: record.manual_quantity ?? undefined,
                        location: record.location || '',
                        notes: record.notes || '',
                      }
                    : a
                ),
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseProjectId, userId]);

  // ── Close ──
  const closeProject = useCallback(() => {
    setProject(null);
    setPayItems([]);
    setCurrentPage(1);
    setTotalPages(0);
    setToolMode('select');
    setActivePayItemId('');
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  const currentCalibration = project?.calibrations[currentPage] || null;

  return {
    project,
    initProject,
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
    removeAnnotationsForPayItem,
    currentCalibration,
    persist,
    updateToc,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
