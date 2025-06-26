import CellRange from './CellRange';

/**
 * Manages cell selection state in the Excel grid
 * Handles single cell, range, column, and row selections
 */
export default class Selection {
    /** @type {CellRange[]} Array of selected cell ranges */
    private _ranges: CellRange[];
    
    /** @type {CellRange | null} The primary (active) selection range */
    private _activeRange: CellRange | null;
    
    /** @type {boolean} Whether multiple selections are allowed */
    private _multiSelect: boolean;
    
    /** @type {number} Maximum number of rows in the grid */
    private _maxRows: number;
    
    /** @type {number} Maximum number of columns in the grid */
    private _maxCols: number;

    /**
     * Initializes a new Selection instance
     * @param {number} maxRows - Maximum number of rows in the grid (default: 100000)
     * @param {number} maxCols - Maximum number of columns in the grid (default: 500)
     */
    constructor(maxRows: number = 1000000, maxCols: number = 5000) {
        this._ranges = [];
        this._activeRange = null;
        this._multiSelect = false;
        this._maxRows = maxRows;
        this._maxCols = maxCols;

        this.selectCell(0, 0)
    }

    /**
     * Gets all selected ranges
     * @returns {CellRange[]} Array of selected ranges
     */
    get ranges(): CellRange[] {
        return [...this._ranges];
    }

    /**
     * Gets the active (primary) selection range
     * @returns {CellRange | null} The active range or null if no selection
     */
    get activeRange(): CellRange | null {
        return this._activeRange;
    }

    /**
     * Gets whether multiple selections are enabled
     * @returns {boolean} True if multi-select is enabled
     */
    get multiSelect(): boolean {
        return this._multiSelect;
    }

    /**
     * Sets whether multiple selections are enabled
     * @param {boolean} enabled - Whether to enable multi-select
     */
    set multiSelect(enabled: boolean) {
        this._multiSelect = enabled;
        if (!enabled && this._ranges.length > 1) {
            // Keep only the active range when disabling multi-select
            this._ranges = this._activeRange ? [this._activeRange] : [];
        }
    }

    /**
     * Selects a single cell
     * @param {number} row - The row index
     * @param {number} col - The column index
     * @param {boolean} addToSelection - Whether to add to existing selection (default: false)
     */
    selectCell(row: number, col: number, addToSelection: boolean = false): void {
        const range = new CellRange(row, col);
        
        if (!addToSelection || !this._multiSelect) {
            this.clearSelection();
        }
        
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Selects a range of cells
     * @param {number} startRow - The starting row index
     * @param {number} startCol - The starting column index
     * @param {number} endRow - The ending row index
     * @param {number} endCol - The ending column index
     * @param {boolean} addToSelection - Whether to add to existing selection (default: false)
     */
    selectRange(startRow: number, startCol: number, endRow: number, endCol: number, addToSelection: boolean = false): void {
        const range = new CellRange(startRow, startCol, endRow, endCol);
        
        if (!addToSelection || !this._multiSelect) {
            this.clearSelection();
        }
        
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Selects an entire column
     * @param {number} col - The column index
     * @param {boolean} addToSelection - Whether to add to existing selection (default: false)
     */
    selectColumn(col: number, addToSelection: boolean = false): void {
        const range = new CellRange(0, col);
        range.setColumnSelection(col, col, this._maxRows);
        
        if (!addToSelection || !this._multiSelect) {
            this.clearSelection();
        }
        
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Selects a range of columns
     * @param {number} startCol - The starting column index
     * @param {number} endCol - The ending column index
     * @param {boolean} addToSelection - Whether to add to existing selection (default: false)
     */
    selectColumnRange(startCol: number, endCol: number, addToSelection: boolean = false): void {
        const range = new CellRange(0, startCol);
        range.setColumnSelection(startCol, endCol, this._maxRows);
        
        if (!addToSelection || !this._multiSelect) {
            this.clearSelection();
        }
        
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Selects an entire row
     * @param {number} row - The row index
     * @param {boolean} addToSelection - Whether to add to existing selection (default: false)
     */
    selectRow(row: number, addToSelection: boolean = false): void {
        const range = new CellRange(row, 0);
        range.setRowSelection(row, row, this._maxCols);
        
        if (!addToSelection || !this._multiSelect) {
            this.clearSelection();
        }
        
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Selects a range of rows
     * @param {number} startRow - The starting row index
     * @param {number} endRow - The ending row index
     * @param {boolean} addToSelection - Whether to add to existing selection (default: false)
     */
    selectRowRange(startRow: number, endRow: number, addToSelection: boolean = false): void {
        const range = new CellRange(startRow, 0);
        range.setRowSelection(startRow, endRow, this._maxCols);
        this._multiSelect = true;
        
        if (!addToSelection || !this._multiSelect) {
            this.clearSelection();
        }
        console.log(range);
        
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Extends the current selection to include the specified cell
     * @param {number} row - The row index to extend to
     * @param {number} col - The column index to extend to
     */
    extendSelection(row: number, col: number): void {
        if (!this._activeRange) {
            console.log("here");
            
            this.selectCell(row, col);
            return;
        }        
        this._activeRange.expandTo(row, col);
    }

    /**
     * Checks if a specific cell is selected
     * @param {number} row - The row index to check
     * @param {number} col - The column index to check
     * @returns {boolean} True if the cell is selected
     */
    isSelected(row: number, col: number): boolean {
        return this._ranges.some(range => range.contains(row, col));
    }

    /**
     * Checks if an entire column is selected
     * @param {number} col - The column index to check
     * @returns {boolean} True if the column is selected
     */
    isColumnSelected(col: number): boolean {
        return this._ranges.some(range => 
            range.isColumnSelection && col >= range.startCol && col <= range.endCol
        );
    }

    /**
     * Checks if an entire row is selected
     * @param {number} row - The row index to check
     * @returns {boolean} True if the row is selected
     */
    isRowSelected(row: number): boolean {
        return this._ranges.some(range => 
            range.isRowSelection && row >= range.startRow && row <= range.endRow
        );
    }

    /**
     * Gets all selected cell coordinates
     * @param {number} maxCells - Maximum number of cells to return (default: 10000)
     * @returns {Array<{row: number, col: number}>} Array of selected cell coordinates
     */
    getSelectedCells(maxCells: number = 10000): Array<{row: number, col: number}> {
        const cells: Array<{row: number, col: number}> = [];
        let count = 0;
        
        for (const range of this._ranges) {
            for (const cell of range.getCellCoordinates()) {
                if (count >= maxCells) {
                    break;
                }
                cells.push(cell);
                count++;
            }
            if (count >= maxCells) {
                break;
            }
        }
        
        return cells;
    }

    /**
     * Gets the total number of selected cells
     * @returns {number} The number of selected cells
     */
    getSelectedCellCount(): number {
        return this._ranges.reduce((total, range) => total + range.getCellCount(), 0);
    }

    /**
     * Gets a textual description of the current selection
     * @returns {string} Description of the selection
     */
    getSelectionDescription(): string {
        if (this._ranges.length === 0) {
            return "No selection";
        }
        
        if (this._ranges.length === 1) {
            const range = this._ranges[0];
            if (range.isSingleCell()) {
                return `Cell ${range.getRangeString()}`;
            }
            return `Range ${range.getRangeString()}`;
        }
        
        return `${this._ranges.length} ranges selected`;
    }

    /**
     * Clears all selections
     */
    clearSelection(): void {
        this._ranges = [];
        this._activeRange = null;
    }

    /**
     * Removes a specific range from the selection
     * @param {number} index - The index of the range to remove
     */
    removeRange(index: number): void {
        if (index >= 0 && index < this._ranges.length) {
            const removedRange = this._ranges.splice(index, 1)[0];
            if (this._activeRange === removedRange) {
                this._activeRange = this._ranges.length > 0 ? this._ranges[this._ranges.length - 1] : null;
            }
        }
    }

    /**
     * Checks if there is any selection
     * @returns {boolean} True if any cells are selected
     */
    hasSelection(): boolean {
        return this._ranges.length > 0;
    }

    /**
     * Inverts the selection state of a cell
     * @param {number} row - The row index
     * @param {number} col - The column index
     */
    toggleCell(row: number, col: number): void {
        // Find if the cell is in any existing range
        const rangeIndex = this._ranges.findIndex(range => range.contains(row, col));
        
        if (rangeIndex >= 0) {
            // Cell is selected, remove it (for simplicity, remove the entire range)
            this.removeRange(rangeIndex);
        } else {
            // Cell is not selected, add it
            this.selectCell(row, col, true);
        }
    }

    /**
     * Selects all cells in the grid
     */
    selectAll(): void {
        this.clearSelection();
        const range = new CellRange(0, 0, this._maxRows - 1, this._maxCols - 1);
        this._ranges.push(range);
        this._activeRange = range;
    }

    /**
     * Creates a copy of this selection
     * @returns {Selection} A new Selection instance with the same state
     */
    clone(): Selection {
        const cloned = new Selection(this._maxRows, this._maxCols);
        cloned._ranges = this._ranges.map(range => range.clone());
        cloned._activeRange = this._activeRange ? this._activeRange.clone() : null;
        cloned._multiSelect = this._multiSelect;
        return cloned;
    }

    /**
     * Converts the selection to a string representation
     * @returns {string} String representation of the selection
     */
    toString(): string {
        if (this._ranges.length === 0) {
            return "Selection: None";
        }
        
        const rangeStrings = this._ranges.map(range => range.getRangeString());
        return `Selection: ${rangeStrings.join(", ")} (${this.getSelectedCellCount()} cells)`;
    }
}