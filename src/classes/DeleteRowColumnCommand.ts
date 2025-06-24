import { ICommand } from './Command';
import DataManager from './DataManager';
import Cell from './Cell';
import Column from './Column';
import Row from './Row';

interface DeletedData {
    type: 'row' | 'column';
    index: number;
    cells: Cell[];
    headerData: Column | Row | null; // Store column/row definition if needed
}

export class DeleteRowColumnCommand implements ICommand {
    private _dataManager: DataManager;
    private _deletedData: DeletedData | null = null;
    private _type: 'row' | 'column';
    private _index: number; // Row or column index to delete

    constructor(dataManager: DataManager, type: 'row' | 'column', index: number) {
        this._dataManager = dataManager;
        this._type = type;
        this._index = index;
    }

    execute(): boolean {
        if (this._index < 0) return false;
        this._deletedData = {
            type: this._type,
            index: this._index,
            cells: [],
            headerData: null,
        };

        if (this._type === 'row') {
            if (this._index >= this._dataManager.rowCount) return false;
            // Store cells from the row to be deleted
            for (let c = 0; c < this._dataManager.columnCount; c++) {
                const cell = this._dataManager.getCell(this._index, c);
                if (cell && cell.value !== '') { // Only store non-empty cells
                    // Create a new Cell instance to avoid issues with shared references if Cell objects are mutable beyond value
                    this._deletedData.cells.push(new Cell(cell.row, cell.col, cell.value, cell.fontSize, cell.horizontalAlignment, cell.verticalAlignment));
                }
            }
            // Store row definition (e.g., height)
            const rowToDelete = this._dataManager.rows[this._index];
            if (rowToDelete) {
                 // Create a new Row instance to capture its state
                this._deletedData.headerData = new Row(rowToDelete.index, rowToDelete.height);
            }
            return this._dataManager.deleteRow(this._index);
        } else { // type === 'column'
            if (this._index >= this._dataManager.columnCount) return false;
            // Store cells from the column to be deleted
            for (let r = 0; r < this._dataManager.rowCount; r++) {
                const cell = this._dataManager.getCell(r, this._index);
                if (cell && cell.value !== '') { // Only store non-empty cells
                     this._deletedData.cells.push(new Cell(cell.row, cell.col, cell.value, cell.fontSize, cell.horizontalAlignment, cell.verticalAlignment));
                }
            }
            // Store column definition (e.g., width)
            const colToDelete = this._dataManager.columns[this._index];
            if (colToDelete) {
                // Create a new Column instance to capture its state
                this._deletedData.headerData = new Column(colToDelete.index, colToDelete.width);
            }
            return this._dataManager.deleteColumn(this._index);
        }
    }

    undo(): boolean {
        if (!this._deletedData) return false;

        let success = false;
        if (this._deletedData.type === 'row') {
            success = this._dataManager.insertRow(this._deletedData.index);
            if (success && this._deletedData.headerData instanceof Row) {
                // Restore row height
                const newRow = this._dataManager.rows[this._deletedData.index];
                if (newRow) {
                    newRow.height = (this._deletedData.headerData as Row).height;
                }
            }
        } else { // type === 'column'
            success = this._dataManager.insertColumn(this._deletedData.index);
            if (success && this._deletedData.headerData instanceof Column) {
                // Restore column width
                const newCol = this._dataManager.columns[this._deletedData.index];
                if (newCol) {
                    newCol.width = (this._deletedData.headerData as Column).width;
                }
            }
        }

        if (success) {
            // Restore cell values
            for (const cellData of this._deletedData.cells) {
                // When undoing, the cell's original row/col might be different from its current target
                // if multiple deletes/inserts happened. We always restore to the `_deletedData.index`.
                if (this._deletedData.type === 'row') {
                     this._dataManager.setCellValue(this._deletedData.index, cellData.col, cellData.value);
                     // TODO: Restore other cell properties like alignment, font size if stored
                } else { // Column
                     this._dataManager.setCellValue(cellData.row, this._deletedData.index, cellData.value);
                      // TODO: Restore other cell properties
                }
            }
        }
        return success;
    }

    getDescription(): string {
        if (!this._deletedData) {
            return `Delete ${this._type} at index ${this._index}`;
        }
        return `Delete ${this._deletedData.type} ${this._deletedData.index + 1}`;
    }
}
