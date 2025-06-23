/**
 * Represents a column in the Excel grid
 * Manages column properties like width and selection state
 */
export default class Column {
    /** @type {number} The index of this column (0-based) */
    private _index: number;
    
    /** @type {number} The width of this column in pixels */
    private _width: number;
    
    /** @type {boolean} Whether this entire column is selected */
    private _selected: boolean;
    
    /** @type {boolean} Whether this column is hidden from view */
    private _hidden: boolean;
    
    /** @type {number} The minimum allowed width for this column */
    private readonly _minWidth: number = 40;
    
    /** @type {number} The maximum allowed width for this column */
    private readonly _maxWidth: number = 2000;

    /**
     * Initializes a new Column instance
     * @param {number} index - The zero-based column index
     * @param {number} width - The initial width in pixels (default: 100)
     */
    constructor(index: number, width: number = 100) {
        this._index = index;
        this._width = Math.max(this._minWidth, Math.min(width, this._maxWidth));
        this._selected = false;
        this._hidden = false;
    }

    /**
     * Gets the index of this column
     * @returns {number} The zero-based column index
     */
    get index(): number {
        return this._index;
    }

    /**
     * Sets the index of this column
     * @param {number} index - The new index
     */
    setIndex(index: number) {
        this._index = index;
    }

    /**
     * Gets the current width of this column
     * @returns {number} The width in pixels
     */
    get width(): number {
        return this._width;
    }

    /**
     * Sets the width of this column with bounds checking
     * @param {number} value - The new width in pixels
     */
    set width(value: number) {
        this._width = Math.max(this._minWidth, Math.min(value, this._maxWidth));
    }

    /**
     * Gets the selection state of this column
     * @returns {boolean} True if the entire column is selected
     */
    get selected(): boolean {
        return this._selected;
    }

    /**
     * Sets the selection state of this column
     * @param {boolean} selected - Whether the column should be selected
     */
    set selected(selected: boolean) {
        this._selected = selected;
    }

    /**
     * Gets the visibility state of this column
     * @returns {boolean} True if the column is hidden
     */
    get hidden(): boolean {
        return this._hidden;
    }

    /**
     * Sets the visibility state of this column
     * @param {boolean} hidden - Whether the column should be hidden
     */
    set hidden(hidden: boolean) {
        this._hidden = hidden;
    }

    /**
     * Gets the minimum allowed width for this column
     * @returns {number} The minimum width in pixels
     */
    get minWidth(): number {
        return this._minWidth;
    }

    /**
     * Gets the maximum allowed width for this column
     * @returns {number} The maximum width in pixels
     */
    get maxWidth(): number {
        return this._maxWidth;
    }

    /**
     * Converts column index to Excel-style column label (A, B, C, ... AA, AB, etc.)
     * @returns {string} The Excel-style column label
     */
    getLabel(): string {
        let label = '';
        let index = this._index;
        
        while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
        }
        
        return label;
    }

    /**
     * Resets the column to its default state
     */
    reset(): void {
        this._width = 100;
        this._selected = false;
        this._hidden = false;
    }

    /**
     * Resizes the column by a delta amount
     * @param {number} delta - The amount to change the width by
     * @returns {number} The actual change in width applied
     */
    resize(delta: number): number {
        const oldWidth = this._width;
        this.width = this._width + delta;
        return this._width - oldWidth;
    }

    /**
     * Checks if a given x-coordinate is near the right edge of this column
     * Used for resize cursor detection
     * @param {number} x - The x-coordinate to check
     * @param {number} columnX - The left edge of this column
     * @param {number} tolerance - The tolerance in pixels (default: 5)
     * @returns {boolean} True if the coordinate is near the resize handle
     */
    isNearRightEdge(x: number, columnX: number, tolerance: number = 5): boolean {
        const rightEdge = columnX + this._width;
        return Math.abs(x - rightEdge) <= tolerance;
    }

    /**
     * Creates a copy of this column
     * @returns {Column} A new Column instance with the same properties
     */
    clone(): Column {
        const cloned = new Column(this._index, this._width);
        cloned._selected = this._selected;
        cloned._hidden = this._hidden;
        return cloned;
    }

    /**
     * Converts the column to a string representation
     * @returns {string} String representation of the column
     */
    toString(): string {
        return `Column ${this.getLabel()} (${this._index}): width=${this._width}px, selected=${this._selected}`;
    }
}