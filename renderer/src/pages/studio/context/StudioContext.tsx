import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import * as fabric from 'fabric';

interface StudioContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (c: fabric.Canvas | null) => void;
  activeObject: fabric.Object | null;
  setActiveObject: (obj: fabric.Object | null) => void;
  history: string[];
  historyIndex: number;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  isDrawingMode: boolean;
  setDrawingMode: (mode: boolean) => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  
  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // Drawing Mode
  const [isDrawingMode, setDrawingMode] = useState(false);

  // Sync drawing mode
  useEffect(() => {
    if (canvas) {
      canvas.isDrawingMode = isDrawingMode;
      if (isDrawingMode) {
        // Default brush settings
        const brush = new fabric.PencilBrush(canvas);
        brush.color = '#ff0000';
        brush.width = 5;
        // @ts-ignore
        canvas.freeDrawingBrush = brush;
      }
    }
  }, [canvas, isDrawingMode]);

  // Setup active object tracking
  useEffect(() => {
    if (!canvas) return;

    const updateSelection = (e: any) => setActiveObject(canvas.getActiveObject() || null);
    
    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => setActiveObject(null));
    canvas.on('object:modified', () => saveHistory());
    canvas.on('object:added', (e: any) => {
      // Don't save history if we are currently undoing/redoing
      if (!isUndoRedo.current) saveHistory();
    });

    return () => {
      canvas.off('selection:created', updateSelection);
      canvas.off('selection:updated', updateSelection);
      canvas.off('selection:cleared');
      canvas.off('object:modified');
      canvas.off('object:added');
    };
  }, [canvas]);

  const saveHistory = () => {
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(['id', 'name', 'lockMovementX', 'lockMovementY']));
    
    setHistory(prev => {
      // If we are not at the end of the history stack, truncate the future
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      // Keep last 50 states to prevent huge memory usage
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const loadState = async (jsonString: string) => {
    if (!canvas) return;
    isUndoRedo.current = true;
    await canvas.loadFromJSON(jsonString);
    canvas.renderAll();
    setActiveObject(canvas.getActiveObject() || null);
    isUndoRedo.current = false;
  };

  const undo = () => {
    if (historyIndex > 0 && canvas) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadState(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && canvas) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadState(history[newIndex]);
    }
  };

  return (
    <StudioContext.Provider value={{
      canvas, setCanvas,
      activeObject, setActiveObject,
      history, historyIndex, saveHistory, undo, redo,
      isDrawingMode, setDrawingMode
    }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) throw new Error('useStudio must be used within a StudioProvider');
  return context;
}
