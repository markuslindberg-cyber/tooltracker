import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Save, Undo2, Redo2, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const VISIBLE_ROWS = 20;
const VISIBLE_COLS = 8;
const ROW_HEIGHT = 40;
const COL_WIDTH = 150;
const MAX_ROWS = 1000;
const MAX_COLS = 26;

export default function Inventarier() {
  const [workbookId] = useState('default-workbook');
  const [sheets, setSheets] = useState(['Sheet1']);
  const [activeSheet, setActiveSheet] = useState(0);
  const [cells, setCells] = useState({});
  const [selection, setSelection] = useState({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const gridRef = useRef(null);
  const fileInputRef = useRef(null);

  const startRow = Math.floor(scrollTop / ROW_HEIGHT);
  const endRow = Math.min(startRow + VISIBLE_ROWS + 2, MAX_ROWS);
  const startCol = Math.floor(scrollLeft / COL_WIDTH);
  const endCol = Math.min(startCol + VISIBLE_COLS + 2, MAX_COLS);

  const currentSheet = sheets[activeSheet];

  // Ladda celler från databasen
  useEffect(() => {
    loadCells();
  }, [activeSheet]);

  const handleGridScroll = (e) => {
    setScrollTop(e.target.scrollTop);
    setScrollLeft(e.target.scrollLeft);
  };

  const loadCells = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.SpreadsheetCell.filter({
        workbookId,
        sheetName: currentSheet
      });
      
      const cellMap = {};
      data.forEach(cell => {
        cellMap[`${cell.row},${cell.column}`] = {
          value: cell.value || '',
          formula: cell.formula || '',
          format: cell.format || 'general',
          comment: cell.comment || '',
          id: cell.id
        };
      });
      setCells(cellMap);
    } catch (error) {
      toast.error('Kunde inte ladda celler');
    } finally {
      setLoading(false);
    }
  };

  const getCellKey = (row, col) => `${row},${col}`;
  const getCellValue = (row, col) => cells[getCellKey(row, col)]?.value || '';

  const saveCell = useCallback(async (row, col, value, formula = '') => {
    try {
      const cellKey = getCellKey(row, col);
      const existingCell = cells[cellKey];

      if (existingCell?.id) {
        await base44.entities.SpreadsheetCell.update(existingCell.id, {
          value,
          formula,
          displayValue: value
        });
      } else {
        await base44.entities.SpreadsheetCell.create({
          workbookId,
          sheetName: currentSheet,
          row,
          column: col,
          value,
          formula,
          displayValue: value
        });
      }

      // Uppdatera lokalt state
      setCells(prev => ({
        ...prev,
        [cellKey]: { ...prev[cellKey], value, formula, id: existingCell?.id }
      }));

      // Lägg till i historik
      addToHistory();
    } catch (error) {
      toast.error('Kunde inte spara cell');
    }
  }, [cells, currentSheet, workbookId]);

  const addToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(cells)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleCellClick = (row, col) => {
    setSelection({ row, col });
    setEditingCell(null);
    setEditValue(getCellValue(row, col));
  };

  const handleCellDoubleClick = (row, col) => {
    setEditingCell({ row, col });
    setEditValue(getCellValue(row, col));
    setTimeout(() => {
      if (gridRef.current) {
        const targetTop = row * ROW_HEIGHT;
        const targetLeft = col * COL_WIDTH;
        const { scrollTop, scrollLeft, clientHeight, clientWidth } = gridRef.current;
        
        if (targetTop < scrollTop) {
          gridRef.current.scrollTop = targetTop;
        } else if (targetTop + ROW_HEIGHT > scrollTop + clientHeight) {
          gridRef.current.scrollTop = targetTop + ROW_HEIGHT - clientHeight;
        }
        
        if (targetLeft < scrollLeft) {
          gridRef.current.scrollLeft = targetLeft;
        } else if (targetLeft + COL_WIDTH > scrollLeft + clientWidth) {
          gridRef.current.scrollLeft = targetLeft + COL_WIDTH - clientWidth;
        }
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!editingCell) return;

    if (e.key === 'Enter') {
      saveCell(editingCell.row, editingCell.col, editValue);
      setSelection(prev => ({ ...prev, row: prev.row + 1 }));
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCell(editingCell.row, editingCell.col, editValue);
      setSelection(prev => ({ ...prev, col: prev.col + 1 }));
      setEditingCell(null);
    }
  };

  const handleAddSheet = () => {
    const newName = `Sheet${sheets.length + 1}`;
    setSheets([...sheets, newName]);
  };

  const handleDeleteSheet = (index) => {
    if (sheets.length === 1) {
      toast.error('Du måste ha minst ett kalkylblad');
      return;
    }
    const newSheets = sheets.filter((_, i) => i !== index);
    setSheets(newSheets);
    if (activeSheet >= newSheets.length) {
      setActiveSheet(newSheets.length - 1);
    }
  };

  const handleExportCSV = () => {
    let csv = '';
    for (let row = 0; row < MAX_ROWS; row++) {
      const rowData = [];
      for (let col = 0; col < MAX_COLS; col++) {
        const value = getCellValue(row, col);
        rowData.push(value ? `"${value}"` : '');
      }
      csv += rowData.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSheet}.csv`;
    a.click();
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const rows = text.trim().split('\n');

      // Parsa CSV
      for (let row = 0; row < rows.length && row < MAX_ROWS; row++) {
        const columns = rows[row].split(',');
        for (let col = 0; col < columns.length && col < MAX_COLS; col++) {
          const value = columns[col].trim().replace(/^"(.*)"$/, '$1');
          if (value) {
            await saveCell(row, col, value);
          }
        }
      }

      addToHistory();
      toast.success('CSV-fil importerad');
    } catch (error) {
      toast.error('Kunde inte importera CSV-fil');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCells(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCells(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Inventarier</h1>
          
          {/* Toolbar */}
          <div className="flex gap-2 mb-4">
            <Button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Undo2 className="w-4 h-4" />
              Ångra
            </Button>
            <Button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Redo2 className="w-4 h-4" />
              Gör om
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importera CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportera CSV
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          {/* Sheet Tabs */}
          <div className="border-b border-gray-200 bg-white px-6 flex items-center gap-2 overflow-x-auto">
            {sheets.map((sheet, index) => (
              <div key={index} className="relative flex items-center">
                <button
                  onClick={() => setActiveSheet(index)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeSheet === index
                      ? 'border-[#8B1E1E] text-[#8B1E1E]'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {sheet}
                </button>
                {sheets.length > 1 && (
                  <button
                    onClick={() => handleDeleteSheet(index)}
                    className="p-1 text-gray-400 hover:text-red-500 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddSheet}
              className="p-2 text-gray-600 hover:text-gray-900 ml-2"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Formula Bar */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600 min-w-12">
                {String.fromCharCode(65 + selection.col)}{selection.row + 1}
              </span>
              <Input
                type="text"
                value={editingCell ? editValue : getCellValue(selection.row, selection.col)}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => !editingCell && setEditingCell(selection)}
                onBlur={() => editingCell && saveCell(editingCell.row, editingCell.col, editValue)}
                placeholder="Mata in värde eller formel"
                className="flex-1"
              />
            </div>
          </div>

          {/* Grid */}
          <div 
            className="bg-white overflow-auto" 
            style={{ maxHeight: 'calc(100vh - 400px)' }} 
            ref={gridRef}
            onScroll={handleGridScroll}
          >
            <table className="border-collapse" style={{ width: MAX_COLS * COL_WIDTH + 48 }}>
              <thead>
                <tr className="sticky top-0 z-20 bg-gray-100">
                  <th className="w-12 h-10 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 sticky left-0 z-30"></th>
                  {Array.from({ length: MAX_COLS }).map((_, col) => (
                    <th
                      key={col}
                      className="h-10 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 text-center"
                      style={{ width: COL_WIDTH }}
                    >
                      {String.fromCharCode(65 + col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Top padding */}
                <tr style={{ height: startRow * ROW_HEIGHT }}>
                  <td colSpan={MAX_COLS + 1}></td>
                </tr>

                {/* Visible rows */}
                {Array.from({ length: endRow - startRow }).map((_, i) => {
                  const row = startRow + i;
                  return (
                    <tr key={row}>
                      <td className="w-12 h-10 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10">
                        {row + 1}
                      </td>
                      {/* Visible columns */}
                      {Array.from({ length: endCol - startCol }).map((_, i) => {
                        const col = startCol + i;
                        return (
                          <td
                            key={`${row}-${col}`}
                            onClick={() => handleCellClick(row, col)}
                            onDoubleClick={() => handleCellDoubleClick(row, col)}
                            className={`border border-gray-200 cursor-cell text-sm p-0 ${
                              selection.row === row && selection.col === col
                                ? 'bg-blue-100 border-blue-500 border-2'
                                : 'hover:bg-gray-50'
                            }`}
                            style={{ width: COL_WIDTH, height: ROW_HEIGHT }}
                          >
                            {editingCell?.row === row && editingCell?.col === col ? (
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={() => saveCell(row, col, editValue)}
                                className="w-full h-full border-0 outline-none text-sm p-2"
                              />
                            ) : (
                              <div className="truncate px-2 py-2">{getCellValue(row, col)}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Bottom padding */}
                <tr style={{ height: Math.max(0, (MAX_ROWS - endRow) * ROW_HEIGHT) }}>
                  <td colSpan={MAX_COLS + 1}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}