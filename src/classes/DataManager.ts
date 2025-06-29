import Cell from './Cell';
import Column from './Column';
import Row from './Row';

/**
 * Manages the data storage and retrieval for the Excel grid
 * Uses sparse storage for memory efficiency with large datasets
 */
export default class DataManager {
    /** @type {Map<string, Cell>} Sparse storage for cells using coordinate keys */
    private _cells: Map<string, Cell>;
    
    /** @type {Column[]} Array of column definitions */
    private _columns: Column[];
    
    /** @type {Row[]} Array of row definitions */
    private _rows: Row[];
    
    /** @type {number} Current number of rows in the grid */
    private _rowCount: number;
    
    /** @type {number} Current number of columns in the grid */
    private _columnCount: number;
    
    /** @type {number} Maximum number of rows supported */
    private readonly _maxRows: number;
    
    /** @type {number} Maximum number of columns supported */
    private readonly _maxColumns: number;

    /**
     * Initializes a new DataManager instance
     * @param {number} initialRows - Initial number of rows (default: 1000)
     * @param {number} initialColumns - Initial number of columns (default: 50)
     * @param {number} maxRows - Maximum number of rows (default: 100000)
     * @param {number} maxColumns - Maximum number of columns (default: 500)
     */
    constructor(initialRows: number = 1000, initialColumns: number = 50, maxRows: number = 100000, maxColumns: number = 500) {
        this._cells = new Map();
        this._columns = [];
        this._rows = [];
        this._rowCount = initialRows;
        this._columnCount = initialColumns;
        this._maxRows = maxRows;
        this._maxColumns = maxColumns;
        
        this.initializeStructure();
    }

    /**
     * Gets the current number of rows
     * @returns {number} Number of rows
     */
    get rowCount(): number {
        return this._rowCount;
    }

    /**
     * Gets the current number of columns
     * @returns {number} Number of columns
     */
    get columnCount(): number {
        return this._columnCount;
    }

    /**
     * Gets the maximum number of rows supported
     * @returns {number} Maximum rows
     */
    get maxRows(): number {
        return this._maxRows;
    }

    /**
     * Gets the maximum number of columns supported
     * @returns {number} Maximum columns
     */
    get maxColumns(): number {
        return this._maxColumns;
    }

    /**
     * Gets all column definitions
     * @returns {Column[]} Array of columns
     */
    get columns(): Column[] {
        return this._columns;
    }

    /**
     * Gets all row definitions
     * @returns {Row[]} Array of rows
     */
    get rows(): Row[] {
        return this._rows;
    }

    /**
     * Initializes the grid structure with default columns and rows
     */
    private initializeStructure(): void {
        // Initialize columns
        for (let col = 0; col < this._columnCount; col++) {
            this._columns.push(new Column(col));
        }
        
        // Initialize rows
        for (let row = 0; row < this._rowCount; row++) {
            this._rows.push(new Row(row));
        }
    }

    /**
     * Generates a unique key for a cell coordinate
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {string} Unique cell key
     */
    private getCellKey(row: number, col: number): string {
        return `${row},${col}`;
    }

    /**
     * Gets the value of a specific cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {string} Cell value or empty string if cell doesn't exist
     */
    getCellValue(row: number, col: number): string {
        if (row < 0 || row >= this._maxRows || col < 0 || col >= this._maxColumns) {
            return '';
        }
        
        const key = this.getCellKey(row, col);
        const cell = this._cells.get(key);
        return cell ? cell.value : '';
    }

    /**
     * Sets the value of a specific cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {string} value - Value to set
     */
    setCellValue(row: number, col: number, value: string): void {
        if (row < 0 || row >= this._maxRows || col < 0 || col >= this._maxColumns) {
            return;
        }
        
        // Expand grid if necessary
        this.ensureCapacity(row + 1, col + 1);
        
        const key = this.getCellKey(row, col);
        
        if (value === '' || value === null || value === undefined) {
            // Remove empty cells to save memory
            this._cells.delete(key);
        } else {
            let cell = this._cells.get(key);
            if (!cell) {
                cell = new Cell(row, col, value);
                this._cells.set(key, cell);
            } else {
                cell.value = value;
            }
        }
    }

    /**
     * Gets a cell object (creates if doesn't exist)
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {Cell | null} Cell object or null if coordinates are invalid
     */
    getCell(row: number, col: number): Cell | null {
        if (row < 0 || row >= this._maxRows || col < 0 || col >= this._maxColumns) {
            return null;
        }
        
        const key = this.getCellKey(row, col);
        let cell = this._cells.get(key);
        
        if (!cell) {
            cell = new Cell(row, col, '');
            // Don't store empty cells in the map to save memory
        }
        
        return cell;
    }

    /**
     * Ensures the grid has enough capacity for the specified dimensions
     * @param {number} requiredRows - Required number of rows
     * @param {number} requiredCols - Required number of columns
     */
    private ensureCapacity(requiredRows: number, requiredCols: number): void {
        // Expand rows if needed
        while (this._rowCount < requiredRows && this._rowCount < this._maxRows) {
            this._rows.push(new Row(this._rowCount));
            this._rowCount++;
        }
        
        // Expand columns if needed
        while (this._columnCount < requiredCols && this._columnCount < this._maxColumns) {
            this._columns.push(new Column(this._columnCount));
            this._columnCount++;
        }
    }

    /**
     * Gets all non-empty cells in a specified range
     * @param {number} startRow - Starting row index
     * @param {number} startCol - Starting column index
     * @param {number} endRow - Ending row index
     * @param {number} endCol - Ending column index
     * @returns {Cell[]} Array of cells in the range
     */
    getCellsInRange(startRow: number, startCol: number, endRow: number, endCol: number): Cell[] {
        const cells: Cell[] = [];
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const key = this.getCellKey(row, col);
                const cell = this._cells.get(key);
                if (cell) {
                    cells.push(cell);
                }
            }
        }
        
        return cells;
    }

    /**
     * Clears all cells in a specified range
     * @param {number} startRow - Starting row index
     * @param {number} startCol - Starting column index
     * @param {number} endRow - Ending row index
     * @param {number} endCol - Ending column index
     */
    clearRange(startRow: number, startCol: number, endRow: number, endCol: number): void {
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const key = this.getCellKey(row, col);
                this._cells.delete(key);
            }
        }
    }

    /**
     * Sets multiple cell values from a 2D array
     * @param {number} startRow - Starting row index
     * @param {number} startCol - Starting column index
     * @param {string[][]} data - 2D array of values
     */
    setCellRange(startRow: number, startCol: number, data: string[][]): void {
        for (let row = 0; row < data.length; row++) {
            for (let col = 0; col < data[row].length; col++) {
                this.setCellValue(startRow + row, startCol + col, data[row][col]);
            }
        }
    }

    /**
     * Gets the total number of non-empty cells
     * @returns {number} Number of cells with values
     */
    getNonEmptyCellCount(): number {
        return this._cells.size;
    }

    /**
     * Gets all non-empty cells
     * @returns {Cell[]} Array of all cells with values
     */
    getAllCells(): Cell[] {
        return Array.from(this._cells.values());
    }

    /**
     * Finds cells containing a specific value
     * @param {string} searchValue - Value to search for
     * @param {boolean} caseSensitive - Whether search should be case sensitive (default: false)
     * @returns {Cell[]} Array of matching cells
     */
    findCells(searchValue: string, caseSensitive: boolean = false): Cell[] {
        const results: Cell[] = [];
        const search = caseSensitive ? searchValue : searchValue.toLowerCase();
        
        for (const cell of this._cells.values()) {
            const cellValue = caseSensitive ? cell.value : cell.value.toLowerCase();
            if (cellValue.includes(search)) {
                results.push(cell);
            }
        }
        
        return results;
    }

    /**
     * Gets a specific column by index
     * @param {number} index - Column index
     * @returns {Column | null} Column object or null if index is invalid
     */
    getColumn(index: number): Column | null {
        if (index < 0 || index >= this._columnCount) {
            return null;
        }
        return this._columns[index];
    }

    /**
     * Gets a specific row by index
     * @param {number} index - Row index
     * @returns {Row | null} Row object or null if index is invalid
     */
    getRow(index: number): Row | null {
        if (index < 0 || index >= this._rowCount) {
            return null;
        }
        return this._rows[index];
    }

    /**
     * Inserts a new row at the specified index
     * @param {number} index - Index where to insert the row
     * @returns {boolean} True if the row was inserted successfully
     */
    insertRow(index: number): boolean {
        if (index < 0 || index > this._rowCount || this._rowCount >= this._maxRows) {
            return false;
        }
        
        // Shift existing rows down
        const newCells = new Map<string, Cell>();
        for (const [key, cell] of this._cells) {
            const [rowStr, colStr] = key.split(',');
            const row = parseInt(rowStr);
            const col = parseInt(colStr);
            
            if (row >= index) {
                const newKey = this.getCellKey(row + 1, col);
                cell.setRow(row + 1);
                newCells.set(newKey, cell);
            } else {
                newCells.set(key, cell);
            }
        }
        this._cells = newCells;
        
        // Insert new row
        this._rows.splice(index, 0, new Row(index));
        
        // Update row indices
        for (let i = index + 1; i < this._rows.length; i++) {
            this._rows[i].setIndex(i);
        }
        
        this._rowCount++;
        return true;
    }

    /**
     * Inserts a new column at the specified index
     * @param {number} index - Index where to insert the column
     * @returns {boolean} True if the column was inserted successfully
     */
    insertColumn(index: number): boolean {
        if (index < 0 || index > this._columnCount || this._columnCount >= this._maxColumns) {
            return false;
        }
        
        // Shift existing columns right
        const newCells = new Map<string, Cell>();
        for (const [key, cell] of this._cells) {
            const [rowStr, colStr] = key.split(',');
            const row = parseInt(rowStr);
            const col = parseInt(colStr);
            
            if (col >= index) {
                const newKey = this.getCellKey(row, col + 1);
                cell.setCol(col + 1);
                newCells.set(newKey, cell);
            } else {
                newCells.set(key, cell);
            }
        }
        this._cells = newCells;
        
        // Insert new column
        this._columns.splice(index, 0, new Column(index));
        
        // Update column indices
        for (let i = index + 1; i < this._columns.length; i++) {
            this._columns[i].setIndex(i);
        }
        
        this._columnCount++;
        return true;
    }

    /**
     * Deletes a row at the specified index
     * @param {number} index - Index of the row to delete
     * @returns {boolean} True if the row was deleted successfully
     */
    deleteRow(index: number): boolean {
        if (index < 0 || index >= this._rowCount || this._rowCount <= 1) {
            return false;
        }
        
        // Remove cells in the deleted row and shift others up
        const newCells = new Map<string, Cell>();
        for (const [key, cell] of this._cells) {
            const [rowStr, colStr] = key.split(',');
            const row = parseInt(rowStr);
            const col = parseInt(colStr);
            
            if (row === index) {
                // Skip cells in deleted row
                continue;
            } else if (row > index) {
                const newKey = this.getCellKey(row - 1, col);
                cell.setRow(row - 1);
                newCells.set(newKey, cell);
            } else {
                newCells.set(key, cell);
            }
        }
        this._cells = newCells;
        
        // Remove row
        this._rows.splice(index, 1);
        
        // Update row indices
        for (let i = index; i < this._rows.length; i++) {
            this._rows[i].setIndex(i);
        }
        
        this._rowCount--;
        return true;
    }

    /**
     * Clears all data from the grid
     */
    clear(): void {
        this._cells.clear();
    }

    /**
     * Gets memory usage statistics
     * @returns {object} Object containing memory usage information
     */
    getMemoryStats(): { cellCount: number, estimatedMemoryKB: number } {
        const cellCount = this._cells.size;
        // Rough estimate: each cell ~100 bytes (key + cell object)
        const estimatedMemoryKB = Math.round((cellCount * 100) / 1024);
        
        return { cellCount, estimatedMemoryKB };
    }

    /**
     * Converts the data manager to a string representation
     * @returns {string} String representation
     */
    toString(): string {
        const stats = this.getMemoryStats();
        return `DataManager: ${this._rowCount}x${this._columnCount} grid, ${stats.cellCount} cells, ~${stats.estimatedMemoryKB}KB`;
    }
}