import { BaseCommand } from './Command';
import type DataManager from './DataManager';
import type { GridDataState } from './DataManager'; // Import the interface

/**
 * Command for setting the entire dataset of the grid.
 * Used for operations like clear all, load data (potentially), etc.
 * Supports undo/redo of these large-scale data changes.
 */
export default class SetDataCommand extends BaseCommand {
    private _dataManager: DataManager;
    private _targetState: GridDataState;
    private _oldState!: GridDataState; // Will be set during the first execute

    /**
     * Initializes a new SetDataCommand instance.
     * @param dataManager The DataManager instance.
     * @param targetState The GridDataState to apply.
     * @param description Description for the command (e.g., "Clear All Data", "Load Data").
     */
    constructor(dataManager: DataManager, targetState: GridDataState, description: string) {
        super(description);
        this._dataManager = dataManager;
        this._targetState = targetState; // This is the state to be applied on execute
    }

    /**
     * Executes the command, applying the target data state to the DataManager.
     * @returns True if the command executed successfully.
     */
    execute(): boolean {
        try {
            // Capture the state *before* this command makes changes
            this._oldState = this._dataManager.getAllData();
            this._dataManager.setData(this._targetState);
            return true;
        } catch (error) {
            console.error(`Failed to execute SetDataCommand (${this.getDescription()}):`, error);
            return false;
        }
    }

    /**
     * Undoes the command, restoring the DataManager to its state before this command was executed.
     * @returns True if the command was undone successfully.
     */
    undo(): boolean {
        if (!this._oldState) {
            console.error(`Cannot undo SetDataCommand (${this.getDescription()}): oldState is not available.`);
            return false; // Cannot undo if old state wasn't captured
        }
        try {
            this._dataManager.setData(this._oldState);
            return true;
        } catch (error) {
            console.error(`Failed to undo SetDataCommand (${this.getDescription()}):`, error);
            return false;
        }
    }
}
