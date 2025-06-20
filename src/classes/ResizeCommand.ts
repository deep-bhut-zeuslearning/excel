import { BaseCommand } from './Command';
import type Column from './Column';
import type Row from './Row';

/**
 * Command for resizing columns or rows
 * Supports undo/redo of resize operations
 */
export default class ResizeCommand extends BaseCommand {
    /** @type {'column' | 'row'} Type of resize operation */
    private _type: 'column' | 'row';
    
    /** @type {Column | Row} The column or row being resized */
    private _target: Column | Row;
    
    /** @type {number} New size (width for columns, height for rows) */
    private _newSize: number;
    
    /** @type {number} Original size before the change */
    private _oldSize: number;

    /**
     * Initializes a new ResizeCommand instance for a column
     * @param {Column} column - The column to resize
     * @param {number} newWidth - New width for the column
     */
    constructor(column: Column, newWidth: number);
    
    /**
     * Initializes a new ResizeCommand instance for a row
     * @param {Row} row - The row to resize
     * @param {number} newHeight - New height for the row
     */
    constructor(row: Row, newHeight: number);
    
    /**
     * Initializes a new ResizeCommand instance
     * @param {Column | Row} target - The column or row to resize
     * @param {number} newSize - New size (width for columns, height for rows)
     */
    constructor(target: Column | Row, newSize: number) {
        const isColumn = 'width' in target;
        const type = isColumn ? 'column' : 'row';
        const identifier = isColumn ? (target as Column).getLabel() : (target as Row).getLabel();
        
        super(`Resize ${type} ${identifier}`);
        
        this._type = type;
        this._target = target;
        this._newSize = newSize;
        this._oldSize = isColumn ? (target as Column).width : (target as Row).height;
    }

    /**
     * Executes the resize command
     * @returns {boolean} True if the command executed successfully
     */
    execute(): boolean {
        try {
            if (this._type === 'column') {
                (this._target as Column).width = this._newSize;
            } else {
                (this._target as Row).height = this._newSize;
            }
            return true;
        } catch (error) {
            console.error('Failed to execute resize command:', error);
            return false;
        }
    }

    /**
     * Undoes the resize command
     * @returns {boolean} True if the command was undone successfully
     */
    undo(): boolean {
        try {
            if (this._type === 'column') {
                (this._target as Column).width = this._oldSize;
            } else {
                (this._target as Row).height = this._oldSize;
            }
            return true;
        } catch (error) {
            console.error('Failed to undo resize command:', error);
            return false;
        }
    }

    /**
     * Gets the type of resize operation
     * @returns {'column' | 'row'} The resize type
     */
    get type(): 'column' | 'row' {
        return this._type;
    }

    /**
     * Gets the target being resized
     * @returns {Column | Row} The column or row
     */
    get target(): Column | Row {
        return this._target;
    }

    /**
     * Gets the new size
     * @returns {number} New size value
     */
    get newSize(): number {
        return this._newSize;
    }

    /**
     * Gets the old size
     * @returns {number} Original size value
     */
    get oldSize(): number {
        return this._oldSize;
    }
}