import { ICommand } from './Command';

/**
 * Manages command execution and undo/redo operations
 * Implements the command pattern for all grid operations
 */
export default class CommandManager {
    /** @type {ICommand[]} Stack of executed commands for undo operations */
    private _undoStack: ICommand[];
    
    /** @type {ICommand[]} Stack of undone commands for redo operations */
    private _redoStack: ICommand[];
    
    /** @type {number} Maximum number of commands to keep in history */
    private _maxHistorySize: number;
    
    /** @type {boolean} Whether command execution is currently paused */
    private _paused: boolean;

    /**
     * Initializes a new CommandManager instance
     * @param {number} maxHistorySize - Maximum number of commands to keep (default: 100)
     */
    constructor(maxHistorySize: number = 100) {
        this._undoStack = [];
        this._redoStack = [];
        this._maxHistorySize = maxHistorySize;
        this._paused = false;
    }

    /**
     * Gets the maximum history size
     * @returns {number} Maximum number of commands in history
     */
    get maxHistorySize(): number {
        return this._maxHistorySize;
    }

    /**
     * Sets the maximum history size
     * @param {number} size - New maximum history size
     */
    set maxHistorySize(size: number) {
        this._maxHistorySize = Math.max(1, size);
        this.trimHistory();
    }

    /**
     * Gets whether command execution is paused
     * @returns {boolean} True if paused
     */
    get paused(): boolean {
        return this._paused;
    }

    /**
     * Gets the number of commands that can be undone
     * @returns {number} Number of undoable commands
     */
    get undoCount(): number {
        return this._undoStack.length;
    }

    /**
     * Gets the number of commands that can be redone
     * @returns {number} Number of redoable commands
     */
    get redoCount(): number {
        return this._redoStack.length;
    }

    /**
     * Executes a command and adds it to the undo stack
     * @param {ICommand} command - The command to execute
     * @returns {boolean} True if the command was executed successfully
     */
    executeCommand(command: ICommand): boolean {
        if (this._paused) {
            return command.execute();
        }
        console.log("executing");
        

        try {
            const success = command.execute();
            
            if (success) {
                this._undoStack.push(command);
                this._redoStack = []; // Clear redo stack when new command is executed
                this.trimHistory();
            }
            console.log(this._undoStack);
            
            return success;
        } catch (error) {
            console.error('Command execution failed:', error);
            return false;
        }
    }

    /**
     * Undoes the last executed command
     * @returns {boolean} True if undo was successful
     */
    undo(): boolean {
        if (this._undoStack.length === 0) {
            return false;
        }

        const command = this._undoStack.pop()!;
        
        try {
            const success = command.undo();
            
            if (success) {
                this._redoStack.push(command);
                return true;
            } else {
                // If undo failed, put the command back
                this._undoStack.push(command);
                return false;
            }
        } catch (error) {
            console.error('Command undo failed:', error);
            this._undoStack.push(command); // Put it back on failure
            return false;
        }
    }

    /**
     * Redoes the last undone command
     * @returns {boolean} True if redo was successful
     */
    redo(): boolean {
        if (this._redoStack.length === 0) {
            return false;
        }

        const command = this._redoStack.pop()!;
        
        try {
            const success = command.execute();
            
            if (success) {
                this._undoStack.push(command);
                return true;
            } else {
                // If redo failed, put the command back
                this._redoStack.push(command);
                return false;
            }
        } catch (error) {
            console.error('Command redo failed:', error);
            this._redoStack.push(command); // Put it back on failure
            return false;
        }
    }

    /**
     * Checks if undo is possible
     * @returns {boolean} True if there are commands to undo
     */
    canUndo(): boolean {
        return this._undoStack.length > 0;
    }

    /**
     * Checks if redo is possible
     * @returns {boolean} True if there are commands to redo
     */
    canRedo(): boolean {
        return this._redoStack.length > 0;
    }

    /**
     * Gets the description of the next command that would be undone
     * @returns {string} Description of the next undo command, or empty string if none
     */
    getNextUndoDescription(): string {
        if (this._undoStack.length === 0) {
            return "";
        }
        return this._undoStack[this._undoStack.length - 1].getDescription();
    }

    /**
     * Gets the description of the next command that would be redone
     * @returns {string} Description of the next redo command, or empty string if none
     */
    getNextRedoDescription(): string {
        if (this._redoStack.length === 0) {
            return "";
        }
        return this._redoStack[this._redoStack.length - 1].getDescription();
    }

    /**
     * Clears all command history
     */
    clearHistory(): void {
        this._undoStack = [];
        this._redoStack = [];
    }

    /**
     * Pauses command recording (commands will still execute but won't be added to history)
     */
    pauseRecording(): void {
        this._paused = true;
    }

    /**
     * Resumes command recording
     */
    resumeRecording(): void {
        this._paused = false;
    }

    /**
     * Executes multiple commands as a single undoable action
     * @param {ICommand[]} commands - Array of commands to execute
     * @param {string} groupDescription - Description for the command group
     * @returns {boolean} True if all commands were executed successfully
     */
    executeCommandGroup(commands: ICommand[], groupDescription: string): boolean {
        if (commands.length === 0) {
            return true;
        }

        const groupCommand = new CommandGroup(commands, groupDescription);
        return this.executeCommand(groupCommand);
    }

    /**
     * Trims the history to stay within the maximum size limit
     */
    private trimHistory(): void {
        while (this._undoStack.length > this._maxHistorySize) {
            this._undoStack.shift();
        }
    }

    /**
     * Gets a summary of the current command history
     * @returns {object} Object containing history statistics
     */
    getHistorySummary(): { undoCount: number, redoCount: number, nextUndo: string, nextRedo: string } {
        return {
            undoCount: this.undoCount,
            redoCount: this.redoCount,
            nextUndo: this.getNextUndoDescription(),
            nextRedo: this.getNextRedoDescription()
        };
    }

    /**
     * Converts the command manager state to a string representation
     * @returns {string} String representation
     */
    toString(): string {
        return `CommandManager: ${this.undoCount} undo, ${this.redoCount} redo commands`;
    }
}

/**
 * Command that groups multiple commands together
 * Allows multiple operations to be undone/redone as a single action
 */
class CommandGroup implements ICommand {
    /** @type {ICommand[]} Array of commands in this group */
    private _commands: ICommand[];
    
    /** @type {string} Description of this command group */
    private _description: string;

    /**
     * Initializes a new CommandGroup instance
     * @param {ICommand[]} commands - Array of commands to group
     * @param {string} description - Description of the group
     */
    constructor(commands: ICommand[], description: string) {
        this._commands = [...commands];
        this._description = description;
    }

    /**
     * Executes all commands in the group
     * @returns {boolean} True if all commands executed successfully
     */
    execute(): boolean {
        const executedCommands: ICommand[] = [];
        
        try {
            for (const command of this._commands) {
                if (command.execute()) {
                    executedCommands.push(command);
                } else {
                    // If any command fails, undo the ones that succeeded
                    for (let i = executedCommands.length - 1; i >= 0; i--) {
                        executedCommands[i].undo();
                    }
                    return false;
                }
            }
            return true;
        } catch (error) {
            // If any command throws, undo the ones that succeeded
            for (let i = executedCommands.length - 1; i >= 0; i--) {
                try {
                    executedCommands[i].undo();
                } catch (undoError) {
                    console.error('Failed to undo command during group execution failure:', undoError);
                }
            }
            return false;
        }
    }

    /**
     * Undoes all commands in the group (in reverse order)
     * @returns {boolean} True if all commands were undone successfully
     */
    undo(): boolean {
        const undonCommands: ICommand[] = [];
        
        try {
            // Undo in reverse order
            for (let i = this._commands.length - 1; i >= 0; i--) {
                const command = this._commands[i];
                if (command.undo()) {
                    undonCommands.unshift(command);
                } else {
                    // If any undo fails, re-execute the ones that were undone
                    for (const reexecuteCommand of undonCommands) {
                        reexecuteCommand.execute();
                    }
                    return false;
                }
            }
            return true;
        } catch (error) {
            // If any undo throws, re-execute the ones that were undone
            for (const reexecuteCommand of undonCommands) {
                try {
                    reexecuteCommand.execute();
                } catch (reexecuteError) {
                    console.error('Failed to re-execute command during group undo failure:', reexecuteError);
                }
            }
            return false;
        }
    }

    /**
     * Gets the description of this command group
     * @returns {string} Description of the group
     */
    getDescription(): string {
        return this._description;
    }
}