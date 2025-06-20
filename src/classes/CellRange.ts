import Cell from './Cell';

/**
 * Represents a rectangular range of cells in the Excel grid
 * Handles multi-cell selection and operations
 */
export default class CellRange {
    /** @type {number} The starting row index (inclusive) */
    private _startRow: number;
    
    /** @type {number} The ending row index (inclusive) */
    private _endRow: number;
    
    /** @type {number} The starting column index (inclusive) */
    private _startCol: number;
    
    /** @type {number} The ending column index (inclusive) */
    private _endCol: number;
    
    /** @type {boolean} Whether this range represents a full column selection */
    private _isColumnSelection: boolean;
    
    /** @type {boolean} Whether this range represents a full row selection */
    private _isRowSelection: boolean;

    /**
     * Initializes a new CellRange instance
     * @param {number} startRow - The starting row index
     * @param {number} startCol - The starting column index
     * @param {number} endRow - The ending row index (defaults to startRow)
     * @param {number} endCol - The ending column index (defaults to startCol)
     */
    constructor(startRow: number, startCol: number, endRow?: number, endCol?: number) {
        this._startRow = Math.min(startRow, endRow ?? startRow);
        this._endRow = Math.max(startRow, endRow ?? startRow);
        this._startCol = Math.min(startCol, endCol ?? startCol);
        this._endCol = Math.max(startCol, endCol ?? startCol);
        this._isColumnSelection = false;
        this._isRowSelection = false;
    }

    /**
     * Gets the starting row index
     * @returns {number} The starting row index
     */
    get startRow(): number {
        return this._startRow;
    }

    /**
     * Gets the ending row index
     * @returns {number} The ending row index
     */
    get endRow(): number {
        return this._endRow;
    }

    /**
     * Gets the starting column index
     * @returns {number} The starting column index
     */
    get startCol(): number {
        return this._startCol;
    }

    /**
     * Gets the ending column index
     * @returns {number} The ending column index
     */
    get endCol(): number {
        return this._endCol;
    }

    /**
     * Checks if this range represents a full column selection
     * @returns {boolean} True if this is a column selection
     */
    get isColumnSelection(): boolean {
        return this._isColumnSelection;
    }

    /**
     * Checks if this range represents a full row selection
     * @returns {boolean} True if this is a row selection
     */
    get isRowSelection(): boolean {
        return this._isRowSelection;
    }

    /**
     * Sets this range to represent a full column selection
     * @param {number} startCol - The starting column index
     * @param {number} endCol - The ending column index (defaults to startCol)
     * @param {number} maxRows - The maximum number of rows in the grid
     */
    setColumnSelection(startCol: number, endCol: number = startCol, maxRows: number = 100000): void {
        this._startCol = Math.min(startCol, endCol);
        this._endCol = Math.max(startCol, endCol);
        this._startRow = 0;
        this._endRow = maxRows - 1;
        this._isColumnSelection = true;
        this._isRowSelection = false;
    }

    /**
     * Sets this range to represent a full row selection
     * @param {number} startRow - The starting row index
     * @param {number} endRow - The ending row index (defaults to startRow)
     * @param {number} maxCols - The maximum number of columns in the grid
     */
    setRowSelection(startRow: number, endRow: number = startRow, maxCols: number = 500): void {
        this._startRow = Math.min(startRow, endRow);
        this._endRow = Math.max(startRow, endRow);
        this._startCol = 0;
        this._endCol = maxCols - 1;
        this._isRowSelection = true;
        this._isColumnSelection = false;
    }

    /**
     * Sets this range to represent a regular cell range
     * @param {number} startRow - The starting row index
     * @param {number} startCol - The starting column index
     * @param {number} endRow - The ending row index
     * @param {number} endCol - The ending column index
     */
    setCellRange(startRow: number, startCol: number, endRow: number, endCol: number): void {
        this._startRow = Math.min(startRow, endRow);
        this._endRow = Math.max(startRow, endRow);
        this._startCol = Math.min(startCol, endCol);
        this._endCol = Math.max(startCol, endCol);
        this._isColumnSelection = false;
        this._isRowSelection = false;
    }

    /**
     * Checks if a specific cell is within this range
     * @param {number} row - The row index to check
     * @param {number} col - The column index to check
     * @returns {boolean} True if the cell is within this range
     */
    contains(row: number, col: number): boolean {
        return row >= this._startRow && row <= this._endRow &&
               col >= this._startCol && col <= this._endCol;
    }

    /**
     * Checks if this range contains only a single cell
     * @returns {boolean} True if this is a single cell range
     */
    isSingleCell(): boolean {
        return this._startRow === this._endRow && this._startCol === this._endCol;
    }

    /**
     * Gets the total number of cells in this range
     * @returns {number} The number of cells in the range
     */
    getCellCount(): number {
        return (this._endRow - this._startRow + 1) * (this._endCol - this._startCol + 1);
    }

    /**
     * Gets the number of rows in this range
     * @returns {number} The number of rows
     */
    getRowCount(): number {
        return this._endRow - this._startRow + 1;
    }

    /**
     * Gets the number of columns in this range
     * @returns {number} The number of columns
     */
    getColumnCount(): number {
        return this._endCol - this._startCol + 1;
    }

    /**
     * Expands the range to include the specified cell
     * @param {number} row - The row index to include
     * @param {number} col - The column index to include
     */
    expandTo(row: number, col: number): void {
        this._startRow = Math.min(this._startRow, row);
        this._endRow = Math.max(this._endRow, row);
        this._startCol = Math.min(this._startCol, col);
        this._endCol = Math.max(this._endCol, col);
    }

    /**
     * Checks if this range intersects with another range
     * @param {CellRange} other - The other range to check
     * @returns {boolean} True if the ranges intersect
     */
    intersects(other: CellRange): boolean {
        return !(this._endRow < other._startRow || this._startRow > other._endRow ||
                this._endCol < other._startCol || this._startCol > other._endCol);
    }

    /**
     * Gets the intersection of this range with another range
     * @param {CellRange} other - The other range to intersect with
     * @returns {CellRange | null} The intersection range, or null if no intersection
     */
    getIntersection(other: CellRange): CellRange | null {
        if (!this.intersects(other)) {
            return null;
        }
        
        return new CellRange(
            Math.max(this._startRow, other._startRow),
            Math.max(this._startCol, other._startCol),
            Math.min(this._endRow, other._endRow),
            Math.min(this._endCol, other._endCol)
        );
    }

    /**
     * Creates an iterator for all cell coordinates in this range
     * @returns {Generator<{row: number, col: number}>} Iterator for cell coordinates
     */
    *getCellCoordinates(): Generator<{row: number, col: number}> {
        for (let row = this._startRow; row <= this._endRow; row++) {
            for (let col = this._startCol; col <= this._endCol; col++) {
                yield { row, col };
            }
        }
    }

    /**
     * Gets a textual representation of this range (e.g., "A1:C3")
     * @returns {string} The Excel-style range representation
     */
    getRangeString(): string {
        const startColLabel = this.getColumnLabel(this._startCol);
        const endColLabel = this.getColumnLabel(this._endCol);
        const startRowLabel = (this._startRow + 1).toString();
        const endRowLabel = (this._endRow + 1).toString();
        
        if (this.isSingleCell()) {
            return `${startColLabel}${startRowLabel}`;
        }
        
        if (this._isColumnSelection) {
            return startColLabel === endColLabel ? startColLabel : `${startColLabel}:${endColLabel}`;
        }
        
        if (this._isRowSelection) {
            return startRowLabel === endRowLabel ? startRowLabel : `${startRowLabel}:${endRowLabel}`;
        }
        
        return `${startColLabel}${startRowLabel}:${endColLabel}${endRowLabel}`;
    }

    /**
     * Converts a column index to Excel-style column label
     * @param {number} index - The column index
     * @returns {string} The Excel-style column label
     */
    private getColumnLabel(index: number): string {
        let label = '';
        while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
        }
        return label;
    }

    /**
     * Creates a copy of this range
     * @returns {CellRange} A new CellRange instance with the same properties
     */
    clone(): CellRange {
        const cloned = new CellRange(this._startRow, this._startCol, this._endRow, this._endCol);
        cloned._isColumnSelection = this._isColumnSelection;
        cloned._isRowSelection = this._isRowSelection;
        return cloned;
    }

    /**
     * Resets this range to a single cell
     * @param {number} row - The row index
     * @param {number} col - The column index
     */
    reset(row: number, col: number): void {
        this._startRow = this._endRow = row;
        this._startCol = this._endCol = col;
        this._isColumnSelection = false;
        this._isRowSelection = false;
    }

    /**
     * Converts the range to a string representation
     * @returns {string} String representation of the range
     */
    toString(): string {
        return `CellRange: ${this.getRangeString()} (${this.getCellCount()} cells)`;
    }
}