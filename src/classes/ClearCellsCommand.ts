import { ICommand } from './Command';
import DataManager from './DataManager';
import Cell from './Cell'; // For storing old values

interface ClearedCellData {
    row: number;
    col: number;
    oldValue: string;
    // Potentially store other cell properties if clearing them should be undoable
}

export class ClearCellsCommand implements ICommand {
    private _dataManager: DataManager;
    private _cellsToClear: Array<{ row: number, col: number }>;
    private _clearedData: ClearedCellData[] = [];

    constructor(dataManager: DataManager, cellsToClear: Array<{ row: number, col: number }>) {
        this._dataManager = dataManager;
        this._cellsToClear = cellsToClear;
    }

    execute(): boolean {
        if (this._cellsToClear.length === 0) {
            return true; // Nothing to do
        }
        this._clearedData = []; // Reset in case of re-execution

        for (const cellRef of this._cellsToClear) {
            const oldValue = this._dataManager.getCellValue(cellRef.row, cellRef.col);
            if (oldValue !== '') { // Only store data if there was something to clear
                this._clearedData.push({ row: cellRef.row, col: cellRef.col, oldValue });
            }
            this._dataManager.setCellValue(cellRef.row, cellRef.col, '');
        }
        return true;
    }

    undo(): boolean {
        if (this._clearedData.length === 0) {
            // This implies either nothing was cleared, or execute wasn't called/effective.
            // If _cellsToClear is not empty but _clearedData is, it means all cells were already empty.
            return true;
        }
        for (const data of this._clearedData) {
            this._dataManager.setCellValue(data.row, data.col, data.oldValue);
        }
        return true;
    }

    getDescription(): string {
        return `Clear ${this._cellsToClear.length} cell(s)`;
    }
}
