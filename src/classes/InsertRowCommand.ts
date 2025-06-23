import { BaseCommand } from './Command';
import type DataManager from './DataManager';

/**
 * Command for inserting a row.
 * Supports undo/redo of row insertion.
 */
export default class InsertRowCommand extends BaseCommand {
    private _dataManager: DataManager;
    private _rowIndex: number;

    /**
     * Initializes a new InsertRowCommand instance.
     * @param dataManager The DataManager instance.
     * @param rowIndex The index at which to insert the row.
     * @param description Optional description for the command.
     */
    constructor(dataManager: DataManager, rowIndex: number, description: string = "Insert Row") {
        super(description + ` at ${rowIndex + 1}`);
        this._dataManager = dataManager;
        this._rowIndex = rowIndex;
    }

    /**
     * Executes the row insertion.
     * @returns True if the command executed successfully, false otherwise.
     */
    execute(): boolean {
        const success = this._dataManager.insertRow(this._rowIndex);
        // Note: insertRow already adjusts _rowCount and row indices.
        return success;
    }

    /**
     * Undoes the row insertion.
     * @returns True if the command was undone successfully, false otherwise.
     */
    undo(): boolean {
        const success = this._dataManager.deleteRow(this._rowIndex);
        // Note: deleteRow already adjusts _rowCount and row indices.
        return success;
    }

    /**
     * Gets the row index for this command.
     * @returns The row index.
     */
    get rowIndex(): number {
        return this._rowIndex;
    }
}
