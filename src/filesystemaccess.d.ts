interface Window {
    /**
     * The `showOpenFilePicker()` method of the `Window` interface shows a file picker that allows a user to select a file or multiple files and returns a handle for the file(s).
     */
    showOpenFilePicker(options?: {
        /**
         * A boolean value that defaults to `false`. By default the picker should include an option to not apply any file type filters (instigated with the type option below). Setting this option to `true` means that option is not available.
         */
        excludeAcceptAllOption?: boolean;
        /**
         * By specifying an ID, the browser can remember different directories for different IDs. If the same ID is used for another picker, the picker opens in the same directory.
         */
        id?: string;
        /**
         * A boolean value that defaults to `false`. When set to `true` multiple files may be selected.
         */
        multiple?: boolean;
        /**
         * A `FileSystemHandle` or a well known directory (`"desktop"`, `"documents"`, `"downloads"`, `"music"`, `"pictures"`, or `"videos"`) to open the dialog in.
         */
        startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
        types?: {
            /**
             * An optional description of the category of files types allowed. Defaults to an empty string.
             */
            description?: string;
            /**
             * An `Object` with the keys set to the MIME type and the values an `Array` of file extensions.
             */
            accept: {
                [x: string]: string[];
            }
        }[];
    }): Promise<Array<FileSystemFileHandle>>;
    /**
     * 
     */
    showSaveFilePicker(options?: {
        /**
         * A boolean value that defaults to `false`. By default the picker should include an option to not apply any file type filters (instigated with the type option below). Setting this option to `true` means that option is not available.
         */
        excludeAcceptAllOption?: boolean;
        /**
         * By specifying an ID, the browser can remember different directories for different IDs. If the same ID is used for another picker, the picker opens in the same directory.
         */
        id?: string;
        /**
         * A `FileSystemHandle` or a well known directory (`"desktop"`, `"documents"`, `"downloads"`, `"music"`, `"pictures"`, or `"videos"`) to open the dialog in.
         */
        startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
        /**
         * A `String`. The suggested file name.
         */
        suggestedName?: string;
        types?: {
            /**
             * An optional description of the category of files types allowed. Defaults to an empty string.
             */
            description?: string;
            /**
             * An `Object` with the keys set to the MIME type and the values an `Array` of file extensions.
             */
            accept: {
                [x: string]: string[];
            }
        }[];
    }): Promise<FileSystemFileHandle>;
    /**
     * The `showDirectoryPicker()` method of the `Window` interface displays a directory picker which allows the user to select a directory.
     */
    showDirectoryPicker(options?: {
        /**
         * By specifying an ID, the browser can remember different directories for different IDs. If the same ID is used for another picker, the picker opens in the same directory.
         */
        id?: string;
        /**
         * A string that defaults to `"read"` for read-only access or `"readwrite"` for read and write access to the directory.
         */
        mode?: "read" | "readwrite";
        /**
         * A `FileSystemHandle` or a well known directory (`"desktop"`, `"documents"`, `"downloads"`, `"music"`, `"pictures"`, or `"videos"`) to open the dialog in.
         */
        startIn?: FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
    }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle {
    entries(): AsyncIterable<[string, FileSystemHandle]>;
    keys(): AsyncIterable<string>;
    values(): AsyncIterable<FileSystemHandle>;
}