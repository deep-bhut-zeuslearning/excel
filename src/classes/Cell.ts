/**
 * Represents a single cell in the Excel grid
 * Stores cell position and value data
 */
export default class Cell {
    /** @type {number} The row index of this cell */
    private _row: number;
    
    /** @type {number} The column index of this cell */
    private _col: number;
    
    /** @type {string} The display value stored in this cell */
    private _value: string;
    
    /** @type {string} The original formula or raw value entered by user */
    private _formula: string;
    
    /** @type {boolean} Whether this cell is currently selected */
    private _selected: boolean;

    /**
     * Initializes a new Cell instance
     * @param {number} row - The row index (0-based)
     * @param {number} col - The column index (0-based)
     * @param {string} value - The initial value to display
     * @param {string} formula - The formula or raw input (defaults to value)
     */
    constructor(row: number, col: number, value: string = "", formula: string = "") {
        this._row = row;
        this._col = col;
        this._value = value;
        this._formula = formula || value;
        this._selected = false;
    }

    /**
     * Gets the row index of this cell
     * @returns {number} The zero-based row index
     */
    get row(): number {
        return this._row;
    }

    /**
     * Gets the column index of this cell
     * @returns {number} The zero-based column index
     */
    get col(): number {
        return this._col;
    }

    /**
     * Gets the display value of this cell
     * @returns {string} The current display value
     */
    get value(): string {
        return this._value;
    }

    /**
     * Sets the display value of this cell
     * @param {string} val - The new value to display
     */
    set value(val: string) {
        this._value = val;
        // If no formula is set, use the value as formula too
        if (!this._formula) {
            this._formula = val;
        }
    }

    /**
     * Gets the formula or raw input for this cell
     * @returns {string} The formula or original input
     */
    get formula(): string {
        return this._formula;
    }

    /**
     * Sets the formula for this cell
     * @param {string} formula - The formula or raw input
     */
    set formula(formula: string) {
        this._formula = formula;
        // For now, just use formula as value (could implement formula parsing later)
        this._value = formula;
    }

    /**
     * Gets the selection state of this cell
     * @returns {boolean} True if the cell is selected
     */
    get selected(): boolean {
        return this._selected;
    }

    /**
     * Sets the selection state of this cell
     * @param {boolean} selected - Whether the cell should be selected
     */
    set selected(selected: boolean) {
        this._selected = selected;
    }

    /**
     * Checks if this cell contains a numeric value
     * @returns {boolean} True if the value can be parsed as a number
     */
    isNumeric(): boolean {
        return !isNaN(parseFloat(this._value)) && isFinite(parseFloat(this._value));
    }

    /**
     * Gets the numeric value of this cell
     * @returns {number} The numeric value, or NaN if not numeric
     */
    getNumericValue(): number {
        return parseFloat(this._value);
    }

    /**
     * Checks if this cell is empty
     * @returns {boolean} True if the cell has no value
     */
    isEmpty(): boolean {
        return this._value.trim() === "";
    }

    /**
     * Creates a copy of this cell
     * @returns {Cell} A new Cell instance with the same properties
     */
    clone(): Cell {
        const cloned = new Cell(this._row, this._col, this._value, this._formula);
        cloned._selected = this._selected;
        return cloned;
    }

    /**
     * Converts the cell to a string representation
     * @returns {string} String representation of the cell
     */
    toString(): string {
        return `Cell(${this._row}, ${this._col}): "${this._value}"`;
    }
}